// Unit tests for the claude launch resilience layer
// (src/hermes_to_claude/claudeLauncher.mjs).
//
// Everything is mocked: fs (via a fake io.stat/readJson), npm (fake
// runInstall/npmViewVersions/installVersion), and spawn (never reached).
//
// Coverage:
//   ① healthy native binary → no self-heal, no version query
//   ② placeholder binary → layer-1 self-heal (node install.cjs)
//   ③ self-heal fails → version-enumeration fallback, picks the SECOND-NEWEST
//      (versions[len-2], NOT slice(1))
//   ④ every candidate fails → clear, actionable error
//   ⑤ concurrent ensureClaudeBinary calls self-heal only once
//   ⑥ H2C_CLAUDE_VERSION pin → no fallback, respects the pin
//
// Run via: node tests/test_claude_launcher.mjs

import path from "path";
import {
  ensureClaudeBinary,
  resetClaudeLauncherState,
  isPlaceholderSize,
  secondNewest,
  fallbackCandidates,
  classifyInstallError,
  compareVersions,
  createMutex,
  createDetectionCache,
  quoteArg,
  buildCmdLine,
} from "../src/hermes_to_claude/claudeLauncher.mjs";

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`  FAIL: ${msg}`); fail++; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HOME = "/home/tester";
const FALLBACK_ROOT = `${HOME}/.cache/hermes-to-claude/claude-code`;
const npxPkgDir = (hash = "hash1") =>
  path.join(HOME, ".npm", "_npx", hash, "node_modules", "@anthropic-ai", "claude-code");
const fallbackPkgDir = (v) =>
  path.join(FALLBACK_ROOT, v, "node_modules", "@anthropic-ai", "claude-code");
const binPath = (pkgDir) => path.join(pkgDir, "bin", "claude");
const BIG = 512 * 1024 * 1024; // healthy native binary ~512MB
const STUB = 500;              // broken-release placeholder stub

/**
 * Build a fake io. `overrides`:
 *  - npxVersion        package.json version reported for the npx-cache package
 *  - stat(path)        optional stat hook (return undefined to fall through)
 *  - readJson(path)    optional read hook
 *  - hashes            npx cache hashes (default ['hash1'])
 *  - runInstall()      optional; default success
 *  - npmViewVersions() optional; default [1.0.0..1.0.3]
 *  - installVersion()  optional; default success
 * The returned io also exposes `files` (path -> stat) and `calls` counters.
 */
function makeFakeIO(overrides = {}) {
  const files = new Map();
  const calls = { runInstall: 0, npmView: 0, installVersion: [], writes: [], removes: [] };
  const io = {
    platform: "linux",
    homeDir: HOME,
    fallbackRoot: FALLBACK_ROOT,
    lockMarkerPath: path.join(FALLBACK_ROOT, "lock.json"),
    files,
    calls,
    now: () => 1000,
    sleep: async () => {},
    log: () => {},
    setFile(p, size, isFile = true) { files.set(p, { size, isFile }); },
    async stat(p) {
      if (overrides.stat) { const r = await overrides.stat(p); if (r !== undefined) return r; }
      return files.get(p) ?? null;
    },
    async readJson(p) {
      if (overrides.readJson) { const r = await overrides.readJson(p); if (r !== undefined) return r; }
      if (p.endsWith("package.json")) {
        if (p.startsWith(FALLBACK_ROOT + "/")) {
          const version = p.slice(FALLBACK_ROOT.length + 1).split("/")[0];
          if (/^\d/.test(version)) return { version, bin: { claude: "bin/claude" } };
        }
        return { version: overrides.npxVersion || "2.1.237", bin: { claude: "bin/claude" } };
      }
      return files.get(p) ?? null;
    },
    async writeJson(p, obj) { calls.writes.push({ p, obj }); files.set(p, { size: 8, isFile: true }); },
    async remove(p) { calls.removes.push(p); files.delete(p); },
    async listNpxHashes() { return overrides.hashes ?? ["hash1"]; },
    async runInstall() { calls.runInstall++; if (overrides.runInstall) return overrides.runInstall(); },
    async npmViewVersions() { calls.npmView++; if (overrides.npmViewVersions) return overrides.npmViewVersions(); return ["1.0.0", "1.0.1", "1.0.2", "1.0.3"]; },
    async installVersion(v, destDir) { calls.installVersion.push(v); if (overrides.installVersion) return overrides.installVersion(v, destDir); },
  };
  return io;
}

async function main() {
  resetClaudeLauncherState();
  console.log("=== claudeLauncher tests ===\n");

  // ── Pure helpers ────────────────────────────────────────────────
  console.log("-- pure helpers --");
  assert(isPlaceholderSize(STUB) === true, "500B stub is a placeholder");
  assert(isPlaceholderSize(0) === true, "0B file is a placeholder");
  assert(isPlaceholderSize(undefined) === true, "missing file is a placeholder");
  assert(isPlaceholderSize(null) === true, "null size is a placeholder");
  assert(isPlaceholderSize(4096) === false, "4096B (threshold) is not a placeholder");
  assert(isPlaceholderSize(BIG) === false, "512MB binary is not a placeholder");

  const versions = ["1.0.0", "1.0.1", "1.0.2", "1.0.3"];
  assert(secondNewest(versions) === "1.0.2", "secondNewest = versions[len-2] (publish order old→new)");
  assert(secondNewest([]) === null, "secondNewest empty -> null");
  assert(secondNewest(["1.0.0"]) === null, "secondNewest single -> null");
  assert(secondNewest("nope") === null, "secondNewest non-array -> null");

  const cands = fallbackCandidates(versions, { exclude: ["1.0.3"] });
  assert(cands[0] === "1.0.2", "fallback starts at second-newest, NOT slice(1) (which would be 1.0.1)");
  assert(JSON.stringify(cands) === JSON.stringify(["1.0.2", "1.0.1", "1.0.0"]),
    "fallback order newest→oldest excluding broken");
  assert(fallbackCandidates(versions).length === 4, "no exclude keeps all");

  assert(classifyInstallError({ message: "npm ERR! code E404\n404 Not Found - GET ..." }) === "not-found",
    "404 → not-found");
  assert(classifyInstallError({ message: "ETARGET No matching version found" }) === "not-found",
    "ETARGET → not-found");
  assert(classifyInstallError({ message: "getaddrinfo ENOTFOUND registry.npmjs.org" }) === "network",
    "ENOTFOUND → network");
  assert(classifyInstallError({ message: "fetch failed", code: "ECONNRESET" }) === "network",
    "ECONNRESET → network");
  assert(classifyInstallError({ message: "some random failure" }) === "other",
    "unknown → other");

  assert(compareVersions("2.1.237", "2.1.236") > 0, "2.1.237 > 2.1.236");
  assert(compareVersions("1.0.9", "1.0.10") < 0, "1.0.9 < 1.0.10 (numeric parts)");
  assert(compareVersions("1.0.2", "1.0.2") === 0, "equal versions");

  const m = createMutex();
  const order = [];
  await Promise.all([
    m.runExclusive(async () => { await sleep(20); order.push("a"); }),
    m.runExclusive(async () => { order.push("b"); }),
  ]);
  assert(JSON.stringify(order) === JSON.stringify(["a", "b"]), "mutex serializes runExclusive");

  const ttlNow = (() => { let t = 1000; return () => t; })();
  const c = createDetectionCache({ now: ttlNow });
  c.set("x");
  assert(c.get() === "x", "cache hit within TTL");
  assert(c.get() === "x", "cache hit (ttlNow fixed)");

  assert(quoteArg("plain") === "plain", "quoteArg: no spaces → bare");
  assert(quoteArg("a b") === '"a b"', "quoteArg: spaces → quoted");
  assert(buildCmdLine(["a", "b c", "d"]) === 'a "b c" d', "buildCmdLine quotes only as needed");

  // ── ① healthy binary → no self-heal, no version query ──────────
  console.log("-- ① healthy binary → no self-heal --");
  {
    const io = makeFakeIO();
    io.setFile(binPath(npxPkgDir()), BIG);
    const spec = await ensureClaudeBinary({ env: {}, io, cache: createDetectionCache(), mutex: createMutex() });
    assert(spec.type === "npx" && spec.pkgArg === "@anthropic-ai/claude-code",
      "healthy → npx spec for latest");
    assert(io.calls.runInstall === 0, "healthy → no install.cjs run");
    assert(io.calls.npmView === 0, "healthy → no npm view");
    assert(io.calls.installVersion.length === 0, "healthy → no fallback installs");
  }

  // ── ② placeholder → layer-1 self-heal ──────────────────────────
  console.log("-- ② placeholder → self-heal (install.cjs) --");
  {
    const io = makeFakeIO();
    io.setFile(binPath(npxPkgDir()), STUB);
    let healed = false;
    const io2 = Object.assign(io, {
      runInstall: async () => { io.calls.runInstall++; healed = true; io.setFile(binPath(npxPkgDir()), BIG); },
    });
    const spec = await ensureClaudeBinary({ env: {}, io: io2, cache: createDetectionCache(), mutex: createMutex() });
    assert(healed, "placeholder → install.cjs ran");
    assert(io2.calls.runInstall === 1, "exactly one self-heal attempt on success");
    assert(spec.type === "npx" && spec.pkgArg === "@anthropic-ai/claude-code",
      "healed → still spawns latest via npx");
    assert(io2.calls.npmView === 0, "self-heal success → no fallback enumeration");
    assert(io2.calls.installVersion.length === 0, "self-heal success → no fallback installs");
  }

  // ── ③ self-heal fails → version fallback (second-newest) ──────
  console.log("-- ③ self-heal fails → fallback picks second-newest --");
  {
    let io;
    io = makeFakeIO({
      npxVersion: "1.0.3", // the broken release currently in the npx cache
      runInstall: async () => { throw Object.assign(new Error("npm ERR! code E404"), { code: "E404" }); },
      npmViewVersions: async () => ["1.0.0", "1.0.1", "1.0.2", "1.0.3"],
      installVersion: async (version) => {
        if (version === "1.0.2") io.setFile(binPath(fallbackPkgDir("1.0.2")), BIG);
      },
    });
    io.setFile(binPath(npxPkgDir()), STUB);
    const spec = await ensureClaudeBinary({ env: {}, io, cache: createDetectionCache(), mutex: createMutex() });

    assert(io.calls.runInstall === 1, "self-heal tried once, aborted on 404 (no pointless retries)");
    assert(io.calls.npmView === 1, "fallback queried npm once");
    assert(io.calls.installVersion.length >= 1, "fallback installed at least one candidate");
    assert(io.calls.installVersion[0] === "1.0.2",
      `fallback installs second-newest FIRST (got ${io.calls.installVersion[0]} — slice(1) would be 1.0.1)`);
    assert(spec.type === "direct", "locked fallback → direct spawn spec");
    assert(spec.entry.includes(`claude-code${path.sep}1.0.2${path.sep}`), `direct entry points at locked v1.0.2 (${spec.entry})`);
    assert(spec.entryKind === "native", "new-structure package → native binary entry");

    const lockWrite = io.calls.writes.find((w) => w.p.endsWith("lock.json"));
    assert(lockWrite && lockWrite.obj.version === "1.0.2", "fallback lock written with version 1.0.2");
  }

  // ── ④ all candidates fail → clear error ───────────────────────
  console.log("-- ④ all candidates fail → clear error --");
  {
    let io;
    io = makeFakeIO({
      npxVersion: "1.0.2",
      runInstall: async () => { throw Object.assign(new Error("npm ERR! code E404"), { code: "E404" }); },
      npmViewVersions: async () => ["1.0.0", "1.0.1", "1.0.2"],
      installVersion: async () => { throw Object.assign(new Error("npm ERR! code E404"), { code: "E404" }); },
    });
    io.setFile(binPath(npxPkgDir()), STUB);
    let err = null;
    try {
      await ensureClaudeBinary({ env: {}, io, cache: createDetectionCache(), mutex: createMutex() });
    } catch (e) { err = e; }
    assert(err !== null, "all-fail → ensureClaudeBinary rejects");
    assert(/Claude Code is unusable/.test(err?.message ?? ""), "error explains broken release, not an h2c bug");
    assert(/Tried: 1\.0\.1, 1\.0\.0/.test(err?.message ?? ""), "error lists tried versions");
  }

  // ── ⑤ concurrency → self-heal exactly once ────────────────────
  console.log("-- ⑤ concurrent calls self-heal once --");
  {
    const cache = createDetectionCache();
    const mutex = createMutex();
    const io = makeFakeIO();
    io.setFile(binPath(npxPkgDir()), STUB);
    let healCount = 0;
    const io2 = Object.assign(io, {
      runInstall: async () => { healCount++; io.setFile(binPath(npxPkgDir()), BIG); },
    });
    const [specA, specB] = await Promise.all([
      ensureClaudeBinary({ env: {}, io: io2, cache, mutex }),
      ensureClaudeBinary({ env: {}, io: io2, cache, mutex }),
    ]);
    assert(healCount === 1, `two concurrent spawns → install.cjs ran once (got ${healCount})`);
    assert(specA.type === "npx" && specB.type === "npx", "both callers got a usable npx spec");
  }

  // ── ⑥ pinned version → no fallback ────────────────────────────
  console.log("-- ⑥ H2C_CLAUDE_VERSION pin → no fallback --");
  {
    let io;
    io = makeFakeIO({
      hashes: [], // nothing cached in npx
      installVersion: async () => { throw new Error("install boom"); },
    });
    io.setFile(binPath(fallbackPkgDir("1.0.2")), STUB); // pinned install is broken
    let err = null;
    try {
      await ensureClaudeBinary({ env: { H2C_CLAUDE_VERSION: "1.0.2" }, io, cache: createDetectionCache(), mutex: createMutex() });
    } catch (e) { err = e; }
    assert(err !== null, "broken pinned version → rejects (never falls back)");
    assert(/H2C_CLAUDE_VERSION/.test(err?.message ?? ""), "pin error references the env var");
    assert(io.calls.npmView === 0, "pinned → npm view versions never queried (no fallback)");
  }

  // ── ⑥b pinned healthy version in npx cache → npx@version spec ──
  {
    const io = makeFakeIO();
    io.setFile(binPath(npxPkgDir()), BIG); // healthy
    const spec = await ensureClaudeBinary({ env: { H2C_CLAUDE_VERSION: "2.1.237" }, io, cache: createDetectionCache(), mutex: createMutex() });
    assert(spec.type === "npx" && spec.pkgArg === "@anthropic-ai/claude-code@2.1.237",
      "pinned healthy → npx @version spec");
    assert(io.calls.npmView === 0, "pinned healthy → no npm view");
  }

  // ── ②b detection cache: second call within TTL does not re-scan ──
  console.log("-- detection cache short-circuit --");
  {
    const cache = createDetectionCache();
    const mutex = createMutex();
    const io = makeFakeIO();
    io.setFile(binPath(npxPkgDir()), BIG);
    await ensureClaudeBinary({ env: {}, io, cache, mutex });
    const scansBefore = io.calls.runInstall + io.calls.npmView + io.calls.installVersion.length;
    await ensureClaudeBinary({ env: {}, io, cache, mutex });
    const scansAfter = io.calls.runInstall + io.calls.npmView + io.calls.installVersion.length;
    assert(scansAfter === scansBefore, "cached decision → no re-scan/re-heal within TTL");
  }

  // ── ⑦ fresh-install network error + retry also fails → no throw, fallback ──
  console.log("-- ⑦ fresh install network error (retry also fails) → fallback --");
  {
    let io;
    io = makeFakeIO({
      hashes: [], // nothing in npx cache → installLatestFresh
      npmViewVersions: async () => ["1.0.0", "1.0.1", "1.0.2", "1.0.3"],
      installVersion: async () => {
        // the fake io already records the call; only fail here
        throw Object.assign(new Error("getaddrinfo ENOTFOUND registry.npmjs.org"), { code: "ENOTFOUND" });
      },
    });
    // v1.0.2 already healthy in the fallback root → versionFallback locks it.
    io.setFile(binPath(fallbackPkgDir("1.0.2")), BIG);

    const spec = await ensureClaudeBinary({ env: {}, io, cache: createDetectionCache(), mutex: createMutex() });

    // Retry is attempted and its failure is swallowed (no throw from ensureClaudeBinary),
    // falling through to the isBinaryHealthy check → versionFallback.
    assert(JSON.stringify(io.calls.installVersion) === JSON.stringify(["1.0.3", "1.0.3"]),
      `fresh install + one retry both attempted (got ${JSON.stringify(io.calls.installVersion)})`);
    assert(spec.type === "direct" && spec.version === "1.0.2",
      `no throw → fell through to healthy fallback v1.0.2 (got ${spec.version})`);
    const lockWrite = io.calls.writes.find((w) => w.p.endsWith("lock.json"));
    assert(lockWrite && lockWrite.obj.version === "1.0.2", "fallback lock written for v1.0.2");
  }

  // ── ⑧ lock.json write failure → fallback still proceeds ──────────
  console.log("-- ⑧ lock.json write failure → fallback proceeds --");
  {
    const io = makeFakeIO({
      npxVersion: "1.0.3", // broken release currently in the npx cache
      runInstall: async () => { throw Object.assign(new Error("npm ERR! code E404"), { code: "E404" }); },
      npmViewVersions: async () => ["1.0.0", "1.0.1", "1.0.2", "1.0.3"],
      writeJson: async () => { throw new Error("ENOSPC: no space left on device"); },
    });
    io.setFile(binPath(npxPkgDir()), STUB);               // current release broken
    io.setFile(binPath(fallbackPkgDir("1.0.2")), BIG);     // healthy fallback candidate

    const spec = await ensureClaudeBinary({ env: {}, io, cache: createDetectionCache(), mutex: createMutex() });

    assert(spec.type === "direct" && spec.version === "1.0.2",
      `lock write failed but healthy fallback v1.0.2 still used (got ${spec.version})`);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
