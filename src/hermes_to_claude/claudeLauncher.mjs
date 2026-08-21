/**
 * Claude Code launch resilience — detect broken native binary, self-heal, fall back.
 *
 * Problem: `npx @anthropic-ai/claude-code` pulls the latest release. When Anthropic
 * ships an incomplete release, the native binary in the npm tarball is a tiny
 * placeholder stub (e.g. a shell script echoing "Error: claude native binary not
 * installed"), and every spawn crashes instantly with exit code 1. The 2.1.237
 * win32 package 404 is a real example.
 *
 * This module, used by Session before spawning, runs a three-layer strategy:
 *   1. Integrity check (fs.stat, < 4KB = placeholder) with a short (~30s) cache.
 *   2. Self-heal: re-run the package's own install.cjs with backoff retries.
 *   3. Version fallback: enumerate previous releases (newest → oldest), install
 *      + check each, lock the first complete one. We always follow the latest
 *      *healthy* release — and pin the npx spawn to that exact cached version,
 *      so a newer broken release that hasn't reached the cache yet is never
 *      pulled at spawn time.
 *
 * The npm `versions --json` list is in publish order (old → new), so "second
 * newest" is `versions[len - 2]` — never `slice(1)` (that's the second oldest).
 */

import os from "os";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileP = promisify(execFile);

// ── Tunables ────────────────────────────────────────────────────────

// install.cjs itself treats bin/claude.exe as a stub when size < 4096 ("stub-sized").
// A real native binary is tens of MB+, so 4KB is a safe, slightly more aggressive
// boundary than the "1KB" heuristic. Placeholder = missing, empty, or < this.
export const PLACEHOLDER_MAX_BYTES = 4096;

// Detection cache TTL — avoids a filesystem scan on every spawn.
export const DETECTION_CACHE_TTL_MS = 30_000;

// Self-heal attempts: initial + 2 retries, backoff 2s / 4s.
export const SELF_HEAL_ATTEMPTS = 3;
export const SELF_HEAL_BACKOFF_MS = [2_000, 4_000];

// A fallback lock older than this triggers a re-check of the latest release,
// so we upgrade automatically once Anthropic publishes a fixed version.
export const LOCK_RECHECK_MS = 6 * 60 * 60 * 1000;

// Timeout for a single install.cjs / npm install / npm view call.
export const INSTALL_TIMEOUT_MS = 300_000;

export const VERSION_PIN_ENV = "H2C_CLAUDE_VERSION";
const PKG_NAME = "@anthropic-ai/claude-code";
const BIN_NAMES = ["claude.exe", "claude"];

// ── Pure helpers (unit-tested) ──────────────────────────────────────

/**
 * @param {number|undefined|null} size
 * @param {{ maxBytes?: number }} [opts]
 * @returns {boolean} true when the file is missing/empty/small enough to be a stub.
 */
export function isPlaceholderSize(size, { maxBytes = PLACEHOLDER_MAX_BYTES } = {}) {
  return !(typeof size === "number" && Number.isFinite(size) && size > 0 && size >= maxBytes);
}

/** Simple dotted-numeric semver compare (0.1.10 > 0.1.9). Prerelease-ish tails are ignored. */
export function compareVersions(a, b) {
  const pa = (a ?? "").split(".").map((s) => parseInt(s, 10) || 0);
  const pb = (b ?? "").split(".").map((s) => parseInt(s, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * npm `versions --json` is in publish order (old → new). The "second newest"
 * candidate is the second-to-last element — NOT `versions.slice(1)[0]`.
 * @param {string[]} versions
 * @returns {string|null}
 */
export function secondNewest(versions) {
  return Array.isArray(versions) && versions.length >= 2 ? versions[versions.length - 2] : null;
}

/**
 * Fallback iteration order: newest → oldest, excluding the broken release.
 * @param {string[]} versions
 * @param {{ exclude?: Set<string>|string[] }} [opts]
 * @returns {string[]}
 */
export function fallbackCandidates(versions, { exclude = new Set() } = {}) {
  const blocked = exclude instanceof Set ? exclude : new Set(exclude || []);
  const out = [];
  if (!Array.isArray(versions)) return out;
  for (let i = versions.length - 1; i >= 0; i--) {
    if (!blocked.has(versions[i])) out.push(versions[i]);
  }
  return out;
}

/**
 * Distinguish a transient network failure (GFW/offline — retry the install)
 * from a package/asset 404 (release is incomplete — fall back to a version).
 * @param {Error & { stderr?: string, code?: unknown }} err
 * @returns {"network"|"not-found"|"other"}
 */
export function classifyInstallError(err) {
  const text = [err?.message, err?.stderr, String(err?.code ?? ""), String(err?.statusCode ?? "")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  // Order matters: a 404 of the native binary asset means the release is incomplete.
  if (/(404|etarget|e404|not found|no matching version)/.test(text)) return "not-found";
  if (/(enotfound|etimedout|econnreset|econnrefused|enetunreach|eai_again|err_socket_timeout|esockettimedout|getaddrinfo|fetch failed|proxy|network|und_err_connect_timeout)/.test(text)) {
    return "network";
  }
  return "other";
}

/** Minimal process-internal async mutex (one runExclusive at a time). */
export function createMutex() {
  let tail = Promise.resolve();
  return {
    async runExclusive(fn) {
      let release;
      const prev = tail;
      tail = new Promise((r) => { release = r; });
      await prev;
      try {
        return await fn();
      } finally {
        release();
      }
    },
  };
}

/** TTL cache for detection results. */
export function createDetectionCache({ ttlMs = DETECTION_CACHE_TTL_MS, now = () => Date.now() } = {}) {
  let value = null;
  let expiresAt = 0;
  return {
    get() { return value !== null && now() < expiresAt ? value : null; },
    set(v) { value = v; expiresAt = now() + ttlMs; },
    clear() { value = null; expiresAt = 0; },
  };
}

/** Quote a single shell arg for cmd.exe — quote when needed and escape %-expansion. */
export function quoteArg(a) {
  // Quoting does NOT stop cmd.exe %VAR% expansion, so escape % → %% first.
  const s = String(a).replace(/%/g, "%%");
  // cmd.exe metacharacters (& | < > ^ ( )) would break or hijack the command
  // line built for `cmd.exe /c`, so any of them triggers quoting too.
  return /[\s"&|<>^()]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}

export function buildCmdLine(args) {
  return args.map(quoteArg).join(" ");
}

// ── IO abstraction (default = real fs/npm; tests inject a fake) ─────

export function createDefaultIO(env = process.env) {
  const homeDir = os.homedir();
  const fallbackRoot =
    env.H2C_CACHE_DIR || path.join(homeDir, ".cache", "hermes-to-claude", "claude-code");
  // `io` is the object itself: npmViewVersions/installVersion pass it to execNpm
  // to pick the platform-appropriate npm invocation.
  const io = {
    platform: process.platform,
    homeDir,
    fallbackRoot,
    lockMarkerPath: path.join(fallbackRoot, "lock.json"),
    now: () => Date.now(),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    log: (msg) => process.stderr.write(`[claude-launcher] ${msg}\n`),
    async stat(p) {
      try {
        const s = await fs.promises.stat(p);
        return { size: s.size, mtimeMs: s.mtimeMs, isFile: s.isFile() };
      } catch {
        return null;
      }
    },
    async readJson(p) {
      try {
        return JSON.parse(await fs.promises.readFile(p, "utf8"));
      } catch {
        return null;
      }
    },
    async writeJson(p, obj) {
      await fs.promises.mkdir(path.dirname(p), { recursive: true });
      await fs.promises.writeFile(p, JSON.stringify(obj, null, 2));
    },
    async remove(p) {
      try { await fs.promises.unlink(p); } catch { /* ENOENT ok */ }
    },
    async listNpxHashes() {
      const root = path.join(homeDir, ".npm", "_npx");
      try {
        const entries = await fs.promises.readdir(root, { withFileTypes: true });
        return entries.filter((e) => e.isDirectory()).map((e) => e.name);
      } catch {
        return [];
      }
    },
    /** Re-run the package's postinstall script (re-downloads the native binary). */
    async runInstall(pkgDir) {
      const cjs = path.join(pkgDir, "install.cjs");
      try {
        await fs.promises.stat(cjs);
      } catch {
        throw Object.assign(new Error(`install.cjs not found in ${pkgDir}`), {
          code: "INSTALL_CJS_MISSING",
        });
      }
      await execFileP(process.execPath, [cjs], { cwd: pkgDir, timeout: INSTALL_TIMEOUT_MS });
    },
    async npmViewVersions() {
      const { stdout } = await execNpm(io, ["view", PKG_NAME, "versions", "--json"], {
        timeout: INSTALL_TIMEOUT_MS,
      });
      const parsed = JSON.parse(stdout);
      return Array.isArray(parsed) ? parsed : [];
    },
    /** Install a specific version into a dedicated dir (postinstall runs automatically). */
    async installVersion(version, destDir) {
      await fs.promises.mkdir(destDir, { recursive: true });
      await execNpm(
        io,
        ["install", "--prefix", destDir, "--no-save", "--no-package-lock", "--no-audit", "--no-fund", `${PKG_NAME}@${version}`],
        { timeout: INSTALL_TIMEOUT_MS },
      );
    },
  };
  return io;
}

function execNpm(io, args, opts) {
  if (io.platform === "win32") {
    // .cmd shims can't be execFile'd directly — mirror the cmd.exe /d /s /c chain
    // used elsewhere (e.g. session.mjs's npx.cmd spawn).
    return execFileP("cmd.exe", ["/d", "/s", "/c", "npm " + buildCmdLine(args)], opts);
  }
  return execFileP("npm", args, opts);
}

// ── Launch spec ─────────────────────────────────────────────────────

/**
 * What Session should spawn.
 *  - { type: "npx", pkgArg: "@anthropic-ai/claude-code@<verified-cache-ver>" } → npx, pinned to the cached version that passed integrity (healed)
 *  - { type: "npx", pkgArg: "@anthropic-ai/claude-code@1.2.3" }      → npx (explicit pin)
 *  - { type: "direct", entry, entryKind: "node"|"native" }           → node <entry> / <entry>
 */

// ── Shared process-wide state ───────────────────────────────────────

const sharedCache = createDetectionCache();
const sharedMutex = createMutex();

/** Clear the in-process detection cache (used by tests). */
export function resetClaudeLauncherState() {
  sharedCache.clear();
}

/**
 * Resolve the launch spec, self-healing / falling back as needed.
 * Safe to call concurrently — a mutex ensures heal/fallback runs at most once.
 * @param {object} [opts]
 * @param {object} [opts.env]
 * @param {ReturnType<typeof createDefaultIO>} [opts.io]
 * @param {ReturnType<typeof createDetectionCache>} [opts.cache]
 * @param {ReturnType<typeof createMutex>} [opts.mutex]
 * @param {number} [opts.lockRecheckMs]
 * @returns {Promise<{type: string, pkgArg?: string, entry?: string, entryKind?: string, version?: string}>}
 */
export async function ensureClaudeBinary(opts = {}) {
  const env = opts.env || process.env;
  const io = opts.io || createDefaultIO(env);
  const cache = opts.cache || sharedCache;
  const mutex = opts.mutex || sharedMutex;
  const lockRecheckMs = opts.lockRecheckMs ?? LOCK_RECHECK_MS;

  const pinned = env[VERSION_PIN_ENV] || "";

  const hit = cacheHit(cache, pinned);
  if (hit) return hit;

  return mutex.runExclusive(async () => {
    const hit2 = cacheHit(cache, pinned);
    if (hit2) return hit2;
    const spec = await resolveClaudeSpec({ io, env, pinned, lockRecheckMs });
    cache.set({ spec, pinned: pinned || null });
    return spec;
  });
}

function cacheHit(cache, pinned) {
  const entry = cache.get();
  if (!entry) return null;
  return entry.pinned === (pinned || null) ? entry.spec : null;
}

// ── Resolution ──────────────────────────────────────────────────────

async function resolveClaudeSpec({ io, env, pinned, lockRecheckMs }) {
  if (pinned) return resolvePinned({ io, env, pinned });

  // Step 1: locate the newest cached package in the npx cache.
  const pkgDir = await findLatestNpxPkgDir(io);
  if (!pkgDir) {
    io.log("no claude-code in npx cache — installing the latest release");
    return installLatestFresh({ io });
  }

  // Step 2: integrity check (before spawn).
  if (await isBinaryHealthy(pkgDir, io)) {
    await io.remove(io.lockMarkerPath); // latest is healthy — no fallback lock needed
    return healthyNpxSpec(io, pkgDir);
  }
  io.log(`claude native binary placeholder in ${pkgDir}`);

  // Step 2b: honor a fresh fallback lock instead of re-healing every spawn.
  const locked = await readLock(io);
  if (locked && io.now() - (locked.lockedAt || 0) < lockRecheckMs) {
    const spec = await lockedSpec(io, locked.version);
    if (spec) {
      io.log(`using locked fallback v${locked.version}`);
      return spec;
    }
    await io.remove(io.lockMarkerPath); // locked install is gone — re-evaluate
  }

  // Step 3: self-heal — re-run install.cjs with backoff retries.
  io.log("self-healing (node install.cjs)…");
  const healed = await selfHeal(pkgDir, io);
  if (healed && (await isBinaryHealthy(pkgDir, io))) {
    io.log("self-heal ok — native binary repaired");
    await io.remove(io.lockMarkerPath);
    return healthyNpxSpec(io, pkgDir);
  }

  // Step 4: version fallback (newest previous release with a complete binary).
  io.log("self-heal failed — falling back to previous releases");
  const brokenVersion = await pkgVersion(io, pkgDir);
  return versionFallback({ io, brokenVersion });
}

/** Respect the user's pin: install/heal that exact version, never fall back. */
async function resolvePinned({ io, env, pinned }) {
  // Prefer the npx cache when the pinned version is already there and healthy.
  const cachedDir = await findVersionNpxPkgDir(io, pinned);
  if (cachedDir && (await isBinaryHealthy(cachedDir, io))) {
    return { type: "npx", pkgArg: `${PKG_NAME}@${pinned}`, version: pinned };
  }

  const destDir = path.join(io.fallbackRoot, pinned);
  const pkgDir = path.join(destDir, "node_modules", PKG_NAME);
  if (await isBinaryHealthy(pkgDir, io)) {
    return directSpec(pkgDir, io, pinned);
  }

  io.log(`${VERSION_PIN_ENV}=${pinned}: installing pinned release`);
  try {
    await io.installVersion(pinned, destDir);
  } catch (err) {
    throw new Error(`${pinError(pinned)} (install failed: ${err.message})`);
  }
  if (await isBinaryHealthy(pkgDir, io)) {
    return directSpec(pkgDir, io, pinned);
  }

  io.log(`${VERSION_PIN_ENV}=${pinned}: binary broken — self-healing`);
  const healed = await selfHeal(pkgDir, io);
  if (healed && (await isBinaryHealthy(pkgDir, io))) {
    return directSpec(pkgDir, io, pinned);
  }
  throw new Error(pinError(pinned));
}

/** No npx cache at all — pre-install the current latest and verify it. */
async function installLatestFresh({ io }) {
  const versions = await io.npmViewVersions();
  const latest = versions[versions.length - 1];
  if (!latest) throw new Error(`npm view returned no versions for ${PKG_NAME}`);
  const destDir = path.join(io.fallbackRoot, latest);
  const pkgDir = path.join(destDir, "node_modules", PKG_NAME);

  if (await isBinaryHealthy(pkgDir, io)) {
    return directSpec(pkgDir, io, latest);
  }
  io.log(`installing latest v${latest} …`);
  try {
    await io.installVersion(latest, destDir);
  } catch (err) {
    if (classifyInstallError(err) === "network") {
      io.log("transient network error on fresh install — one retry");
      try {
        await io.installVersion(latest, destDir);
      } catch (err2) {
        io.log(`retry failed: ${err2.message}`);
      }
    }
  }
  if (await isBinaryHealthy(pkgDir, io)) {
    return directSpec(pkgDir, io, latest);
  }
  io.log(`latest v${latest} binary broken — falling back`);
  return versionFallback({ io, brokenVersion: latest, versions });
}

/** Enumerate previous releases newest→oldest, install + verify, lock the first good one. */
async function versionFallback({ io, brokenVersion, versions: knownVersions }) {
  const versions = knownVersions || (await io.npmViewVersions());
  const candidates = fallbackCandidates(versions, { exclude: brokenVersion ? [brokenVersion] : [] });
  const tried = [];

  for (const version of candidates) {
    const destDir = path.join(io.fallbackRoot, version);
    const pkgDir = path.join(destDir, "node_modules", PKG_NAME);
    tried.push(version);

    if (await isBinaryHealthy(pkgDir, io)) {
      io.log(`fallback: v${version} already healthy — locking`);
      await lock(io, version);
      return directSpec(pkgDir, io, version);
    }

    io.log(`fallback: installing v${version}`);
    try {
      await io.installVersion(version, destDir);
    } catch (err) {
      if (classifyInstallError(err) === "network") {
        io.log(`  network error — one retry`);
        try {
          await io.installVersion(version, destDir);
        } catch (err2) {
          io.log(`  retry failed: ${err2.message}`);
          continue;
        }
      } else {
        io.log(`  install failed: ${err.message}`);
        continue; // 404 / missing — that version is unusable, go older
      }
    }

    if (await isBinaryHealthy(pkgDir, io)) {
      io.log(`fallback ok — locked v${version}`);
      await lock(io, version);
      return directSpec(pkgDir, io, version);
    }
    io.log(`  v${version} binary still placeholder — trying next`);
  }

  throw new Error(
    clearFallbackError({
      brokenForMsg: brokenVersion || "latest",
      tried,
    }),
  );
}

// ── Small building blocks ───────────────────────────────────────────

/** Run install.cjs with backoff. Returns true if a runInstall call succeeded (caller re-verifies). */
async function selfHeal(pkgDir, io) {
  for (let attempt = 0; attempt < SELF_HEAL_ATTEMPTS; attempt++) {
    try {
      await io.runInstall(pkgDir);
      return true;
    } catch (err) {
      if (err?.code === "INSTALL_CJS_MISSING" || classifyInstallError(err) === "not-found") {
        io.log(`self-heal aborted: ${err.message}`);
        return false; // release is incomplete — retrying won't help
      }
      const backoff = SELF_HEAL_BACKOFF_MS[attempt];
      if (attempt < SELF_HEAL_ATTEMPTS - 1 && backoff) {
        io.log(`self-heal attempt ${attempt + 1} failed (${err.message}) — retry in ${backoff}ms`);
        await io.sleep(backoff);
      } else {
        io.log(`self-heal failed: ${err.message}`);
      }
    }
  }
  return false;
}

async function readLock(io) {
  const m = await io.readJson(io.lockMarkerPath);
  return m && typeof m.version === "string" ? m : null;
}

async function lock(io, version) {
  try {
    await io.writeJson(io.lockMarkerPath, { version, lockedAt: io.now() });
  } catch (err) {
    io.log(`warning: could not write fallback lock: ${err.message}`);
  }
}

async function lockedSpec(io, version) {
  const pkgDir = path.join(io.fallbackRoot, version, "node_modules", PKG_NAME);
  if (await isBinaryHealthy(pkgDir, io)) return directSpec(pkgDir, io, version);
  return null;
}

/**
 * The package is healthy when the file its `bin` field points at is usable:
 *  - JS entry (.js/.cjs/.mjs — older releases run via node): file exists & non-empty.
 *  - native entry: a real binary, size >= PLACEHOLDER_MAX_BYTES (not a stub).
 * Falls back to the conventional bin/claude[.exe] names when `bin` is absent,
 * mirroring directSpec() so a health check never disagrees with the spawn spec.
 */
async function isBinaryHealthy(pkgDir, io) {
  const pkg = await io.readJson(path.join(pkgDir, "package.json"));
  const bin = pkg?.bin;
  const binPath = typeof bin === "string" ? bin : bin && typeof bin === "object" ? bin.claude : null;

  if (binPath) {
    const st = await io.stat(path.join(pkgDir, binPath));
    if (!st || !st.isFile) return false;
    if (/\.(js|cjs|mjs)$/.test(binPath)) return st.size > 0; // JS entry: non-empty is healthy
    return !isPlaceholderSize(st.size); // native entry: must not be a stub
  }

  for (const name of BIN_NAMES) {
    const st = await io.stat(path.join(pkgDir, "bin", name));
    if (st && st.isFile && !isPlaceholderSize(st.size)) return true;
  }
  return false;
}

/** Read the installed package.json version (the broken release we just tried). */
async function pkgVersion(io, pkgDir) {
  const pkg = await io.readJson(path.join(pkgDir, "package.json"));
  return pkg?.version || null;
}

/**
 * npx spec pinned to the exact cached version that just passed the integrity
 * check. An unpinned "@anthropic-ai/claude-code" re-resolves to `latest` at
 * spawn time, which could pull a newer broken release not yet in the cache.
 */
async function healthyNpxSpec(io, pkgDir) {
  const version = await pkgVersion(io, pkgDir);
  return version
    ? { type: "npx", pkgArg: `${PKG_NAME}@${version}`, version }
    : { type: "npx", pkgArg: PKG_NAME };
}

/** Highest-version claude-code package dir in the npx cache (mtime tie-break). */
async function findLatestNpxPkgDir(io) {
  const hashes = await io.listNpxHashes();
  let best = null;
  let bestVersion = null;
  let bestMtime = -Infinity;
  for (const h of hashes) {
    const pkgDir = path.join(io.homeDir, ".npm", "_npx", h, "node_modules", PKG_NAME);
    const pkg = await io.readJson(path.join(pkgDir, "package.json"));
    if (!pkg?.version) continue;
    const st = await io.stat(pkgDir);
    const mtime = st?.mtimeMs ?? 0;
    if (
      best === null ||
      compareVersions(pkg.version, bestVersion) > 0 ||
      (pkg.version === bestVersion && mtime > bestMtime)
    ) {
      best = pkgDir;
      bestVersion = pkg.version;
      bestMtime = mtime;
    }
  }
  return best;
}

/** Find the npx-cache package dir for an exact pinned version (if present). */
async function findVersionNpxPkgDir(io, version) {
  const hashes = await io.listNpxHashes();
  for (const h of hashes) {
    const pkgDir = path.join(io.homeDir, ".npm", "_npx", h, "node_modules", PKG_NAME);
    const pkg = await io.readJson(path.join(pkgDir, "package.json"));
    if (pkg?.version === version) return pkgDir;
  }
  return null;
}

/**
 * Build the direct spawn spec for an installed package. Reads the package's `bin`
 * field: newer releases map `claude` → `bin/claude.exe` (native), older ones map
 * it to `cli.js` (run via Node).
 */
async function directSpec(pkgDir, io, version) {
  const pkg = await io.readJson(path.join(pkgDir, "package.json"));
  const bin = pkg?.bin;
  const binPath = typeof bin === "string" ? bin : bin && typeof bin === "object" ? bin.claude : null;

  if (binPath && /\.(js|cjs|mjs)$/.test(binPath)) {
    return { type: "direct", entry: path.join(pkgDir, binPath), entryKind: "node", version };
  }
  if (binPath) {
    return { type: "direct", entry: path.join(pkgDir, binPath), entryKind: "native", version };
  }
  for (const name of BIN_NAMES) {
    const p = path.join(pkgDir, "bin", name);
    const st = await io.stat(p);
    if (st && st.isFile && !isPlaceholderSize(st.size)) {
      return { type: "direct", entry: p, entryKind: "native", version };
    }
  }
  throw new Error(`cannot resolve claude entry in ${pkgDir}`);
}

// ── Error messages ──────────────────────────────────────────────────

function pinError(pinned) {
  return (
    `Claude Code v${pinned} (${VERSION_PIN_ENV}) ships a broken native binary and could not be repaired. ` +
    `Unset ${VERSION_PIN_ENV} or pick a different known-good version.`
  );
}

function clearFallbackError({ brokenForMsg, tried }) {
  return [
    `Claude Code is unusable: the native binary for v${brokenForMsg} is missing or a placeholder,`,
    `self-heal (node install.cjs) failed, and no previous release produced a complete binary.`,
    tried.length ? `  Tried: ${tried.join(", ")}` : "  Tried: (none)",
    "This is a broken Claude Code release — not an h2c bug.",
    "Fix options:",
    "  1. Wait for a fixed release, then clear the broken cache:  npm cache clean --force",
    `  2. Pin a known-good release:  ${VERSION_PIN_ENV}=<version> h2c`,
    `  3. Verify manually:  npx -y ${PKG_NAME}@<version> --version`,
  ].join("\n");
}
