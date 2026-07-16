var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/debugUtils.ts
import {
  logEvent
} from "../services/analytics/index.js";
import { logForDebugging as logForDebugging2 } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { jsonStringify } from "../utils/slowOperations.js";
function debugTruncate(s) {
  const flat = s.replace(/\n/g, "\\n");
  if (flat.length <= DEBUG_MSG_LIMIT) {
    return flat;
  }
  return flat.slice(0, DEBUG_MSG_LIMIT) + `... (${flat.length} chars)`;
}
function describeAxiosError(err) {
  const msg = errorMessage(err);
  if (err && typeof err === "object" && "response" in err) {
    const response = err.response;
    if (response?.data && typeof response.data === "object") {
      const data = response.data;
      const detail = typeof data.message === "string" ? data.message : typeof data.error === "object" && data.error && "message" in data.error && typeof data.error.message === "string" ? data.error.message : void 0;
      if (detail) {
        return `${msg}: ${detail}`;
      }
    }
  }
  return msg;
}
function extractErrorDetail(data) {
  if (!data || typeof data !== "object") return void 0;
  if ("message" in data && typeof data.message === "string") {
    return data.message;
  }
  if ("error" in data && data.error !== null && typeof data.error === "object" && "message" in data.error && typeof data.error.message === "string") {
    return data.error.message;
  }
  return void 0;
}
var DEBUG_MSG_LIMIT, SECRET_FIELD_NAMES, SECRET_PATTERN;
var init_debugUtils = __esm({
  "src/debugUtils.ts"() {
    DEBUG_MSG_LIMIT = 2e3;
    SECRET_FIELD_NAMES = [
      "session_ingress_token",
      "environment_secret",
      "access_token",
      "secret",
      "token"
    ];
    SECRET_PATTERN = new RegExp(
      `"(${SECRET_FIELD_NAMES.join("|")})"\\s*:\\s*"([^"]*)"`,
      "g"
    );
  }
});

// src/sessionIdCompat.ts
function toCompatSessionId(id) {
  if (!id.startsWith("cse_")) return id;
  if (_isCseShimEnabled && !_isCseShimEnabled()) return id;
  return "session_" + id.slice("cse_".length);
}
function toInfraSessionId(id) {
  if (!id.startsWith("session_")) return id;
  return "cse_" + id.slice("session_".length);
}
var _isCseShimEnabled;
var init_sessionIdCompat = __esm({
  "src/sessionIdCompat.ts"() {
  }
});

// src/createSession.ts
var createSession_exports = {};
__export(createSession_exports, {
  archiveBridgeSession: () => archiveBridgeSession,
  createBridgeSession: () => createBridgeSession,
  getBridgeSession: () => getBridgeSession,
  updateBridgeSessionTitle: () => updateBridgeSessionTitle
});
import { logForDebugging as logForDebugging5 } from "../utils/debug.js";
import { errorMessage as errorMessage4 } from "../utils/errors.js";
async function createBridgeSession({
  environmentId,
  title,
  events,
  gitRepoUrl,
  branch,
  signal,
  baseUrl: baseUrlOverride,
  getAccessToken,
  permissionMode
}) {
  const { getClaudeAIOAuthTokens } = await import("../utils/auth.js");
  const { getOrganizationUUID } = await import("../services/oauth/client.js");
  const { getOauthConfig: getOauthConfig2 } = await import("../constants/oauth.js");
  const { getOAuthHeaders } = await import("../utils/teleport/api.js");
  const { parseGitHubRepository } = await import("../utils/detectRepository.js");
  const { getDefaultBranch } = await import("../utils/git.js");
  const { getMainLoopModel } = await import("../utils/model/model.js");
  const { default: axios3 } = await import("axios");
  const accessToken = getAccessToken?.() ?? getClaudeAIOAuthTokens()?.accessToken;
  if (!accessToken) {
    logForDebugging5("[bridge] No access token for session creation");
    return null;
  }
  const orgUUID = await getOrganizationUUID();
  if (!orgUUID) {
    logForDebugging5("[bridge] No org UUID for session creation");
    return null;
  }
  let gitSource = null;
  let gitOutcome = null;
  if (gitRepoUrl) {
    const { parseGitRemote } = await import("../utils/detectRepository.js");
    const parsed = parseGitRemote(gitRepoUrl);
    if (parsed) {
      const { host, owner, name } = parsed;
      const revision = branch || await getDefaultBranch() || void 0;
      gitSource = {
        type: "git_repository",
        url: `https://${host}/${owner}/${name}`,
        revision
      };
      gitOutcome = {
        type: "git_repository",
        git_info: {
          type: "github",
          repo: `${owner}/${name}`,
          branches: [`claude/${branch || "task"}`]
        }
      };
    } else {
      const ownerRepo = parseGitHubRepository(gitRepoUrl);
      if (ownerRepo) {
        const [owner, name] = ownerRepo.split("/");
        if (owner && name) {
          const revision = branch || await getDefaultBranch() || void 0;
          gitSource = {
            type: "git_repository",
            url: `https://github.com/${owner}/${name}`,
            revision
          };
          gitOutcome = {
            type: "git_repository",
            git_info: {
              type: "github",
              repo: `${owner}/${name}`,
              branches: [`claude/${branch || "task"}`]
            }
          };
        }
      }
    }
  }
  const requestBody = {
    ...title !== void 0 && { title },
    events,
    session_context: {
      sources: gitSource ? [gitSource] : [],
      outcomes: gitOutcome ? [gitOutcome] : [],
      model: getMainLoopModel()
    },
    environment_id: environmentId,
    source: "remote-control",
    ...permissionMode && { permission_mode: permissionMode }
  };
  const headers = {
    ...getOAuthHeaders(accessToken),
    "anthropic-beta": "ccr-byoc-2025-07-29",
    "x-organization-uuid": orgUUID
  };
  const url = `${baseUrlOverride ?? getOauthConfig2().BASE_API_URL}/v1/sessions`;
  let response;
  try {
    response = await axios3.post(url, requestBody, {
      headers,
      signal,
      validateStatus: (s) => s < 500
    });
  } catch (err) {
    logForDebugging5(
      `[bridge] Session creation request failed: ${errorMessage4(err)}`
    );
    return null;
  }
  const isSuccess = response.status === 200 || response.status === 201;
  if (!isSuccess) {
    const detail = extractErrorDetail(response.data);
    logForDebugging5(
      `[bridge] Session creation failed with status ${response.status}${detail ? `: ${detail}` : ""}`
    );
    return null;
  }
  const sessionData = response.data;
  if (!sessionData || typeof sessionData !== "object" || !("id" in sessionData) || typeof sessionData.id !== "string") {
    logForDebugging5("[bridge] No session ID in response");
    return null;
  }
  return sessionData.id;
}
async function getBridgeSession(sessionId, opts) {
  const { getClaudeAIOAuthTokens } = await import("../utils/auth.js");
  const { getOrganizationUUID } = await import("../services/oauth/client.js");
  const { getOauthConfig: getOauthConfig2 } = await import("../constants/oauth.js");
  const { getOAuthHeaders } = await import("../utils/teleport/api.js");
  const { default: axios3 } = await import("axios");
  const accessToken = opts?.getAccessToken?.() ?? getClaudeAIOAuthTokens()?.accessToken;
  if (!accessToken) {
    logForDebugging5("[bridge] No access token for session fetch");
    return null;
  }
  const orgUUID = await getOrganizationUUID();
  if (!orgUUID) {
    logForDebugging5("[bridge] No org UUID for session fetch");
    return null;
  }
  const headers = {
    ...getOAuthHeaders(accessToken),
    "anthropic-beta": "ccr-byoc-2025-07-29",
    "x-organization-uuid": orgUUID
  };
  const url = `${opts?.baseUrl ?? getOauthConfig2().BASE_API_URL}/v1/sessions/${sessionId}`;
  logForDebugging5(`[bridge] Fetching session ${sessionId}`);
  let response;
  try {
    response = await axios3.get(
      url,
      { headers, timeout: 1e4, validateStatus: (s) => s < 500 }
    );
  } catch (err) {
    logForDebugging5(
      `[bridge] Session fetch request failed: ${errorMessage4(err)}`
    );
    return null;
  }
  if (response.status !== 200) {
    const detail = extractErrorDetail(response.data);
    logForDebugging5(
      `[bridge] Session fetch failed with status ${response.status}${detail ? `: ${detail}` : ""}`
    );
    return null;
  }
  return response.data;
}
async function archiveBridgeSession(sessionId, opts) {
  const { getClaudeAIOAuthTokens } = await import("../utils/auth.js");
  const { getOrganizationUUID } = await import("../services/oauth/client.js");
  const { getOauthConfig: getOauthConfig2 } = await import("../constants/oauth.js");
  const { getOAuthHeaders } = await import("../utils/teleport/api.js");
  const { default: axios3 } = await import("axios");
  const accessToken = opts?.getAccessToken?.() ?? getClaudeAIOAuthTokens()?.accessToken;
  if (!accessToken) {
    logForDebugging5("[bridge] No access token for session archive");
    return;
  }
  const orgUUID = await getOrganizationUUID();
  if (!orgUUID) {
    logForDebugging5("[bridge] No org UUID for session archive");
    return;
  }
  const headers = {
    ...getOAuthHeaders(accessToken),
    "anthropic-beta": "ccr-byoc-2025-07-29",
    "x-organization-uuid": orgUUID
  };
  const url = `${opts?.baseUrl ?? getOauthConfig2().BASE_API_URL}/v1/sessions/${sessionId}/archive`;
  logForDebugging5(`[bridge] Archiving session ${sessionId}`);
  const response = await axios3.post(
    url,
    {},
    {
      headers,
      timeout: opts?.timeoutMs ?? 1e4,
      validateStatus: (s) => s < 500
    }
  );
  if (response.status === 200) {
    logForDebugging5(`[bridge] Session ${sessionId} archived successfully`);
  } else {
    const detail = extractErrorDetail(response.data);
    logForDebugging5(
      `[bridge] Session archive failed with status ${response.status}${detail ? `: ${detail}` : ""}`
    );
  }
}
async function updateBridgeSessionTitle(sessionId, title, opts) {
  const { getClaudeAIOAuthTokens } = await import("../utils/auth.js");
  const { getOrganizationUUID } = await import("../services/oauth/client.js");
  const { getOauthConfig: getOauthConfig2 } = await import("../constants/oauth.js");
  const { getOAuthHeaders } = await import("../utils/teleport/api.js");
  const { default: axios3 } = await import("axios");
  const accessToken = opts?.getAccessToken?.() ?? getClaudeAIOAuthTokens()?.accessToken;
  if (!accessToken) {
    logForDebugging5("[bridge] No access token for session title update");
    return;
  }
  const orgUUID = await getOrganizationUUID();
  if (!orgUUID) {
    logForDebugging5("[bridge] No org UUID for session title update");
    return;
  }
  const headers = {
    ...getOAuthHeaders(accessToken),
    "anthropic-beta": "ccr-byoc-2025-07-29",
    "x-organization-uuid": orgUUID
  };
  const compatId = toCompatSessionId(sessionId);
  const url = `${opts?.baseUrl ?? getOauthConfig2().BASE_API_URL}/v1/sessions/${compatId}`;
  logForDebugging5(`[bridge] Updating session title: ${compatId} \u2192 ${title}`);
  try {
    const response = await axios3.patch(
      url,
      { title },
      { headers, timeout: 1e4, validateStatus: (s) => s < 500 }
    );
    if (response.status === 200) {
      logForDebugging5(`[bridge] Session title updated successfully`);
    } else {
      const detail = extractErrorDetail(response.data);
      logForDebugging5(
        `[bridge] Session title update failed with status ${response.status}${detail ? `: ${detail}` : ""}`
      );
    }
  } catch (err) {
    logForDebugging5(
      `[bridge] Session title update request failed: ${errorMessage4(err)}`
    );
  }
}
var init_createSession = __esm({
  "src/createSession.ts"() {
    init_debugUtils();
    init_sessionIdCompat();
  }
});

// src/bridgePointer.ts
var bridgePointer_exports = {};
__export(bridgePointer_exports, {
  BRIDGE_POINTER_TTL_MS: () => BRIDGE_POINTER_TTL_MS,
  clearBridgePointer: () => clearBridgePointer,
  getBridgePointerPath: () => getBridgePointerPath,
  readBridgePointer: () => readBridgePointer,
  readBridgePointerAcrossWorktrees: () => readBridgePointerAcrossWorktrees,
  writeBridgePointer: () => writeBridgePointer
});
import { mkdir, readFile, stat, unlink, writeFile } from "fs/promises";
import { dirname as dirname2, join as join2 } from "path";
import { z } from "zod/v4";
import { logForDebugging as logForDebugging6 } from "../utils/debug.js";
import { isENOENT } from "../utils/errors.js";
import { getWorktreePathsPortable } from "../utils/getWorktreePathsPortable.js";
import { lazySchema } from "../utils/lazySchema.js";
import {
  getProjectsDir,
  sanitizePath
} from "../utils/sessionStoragePortable.js";
import { jsonParse as jsonParse4, jsonStringify as jsonStringify5 } from "../utils/slowOperations.js";
function getBridgePointerPath(dir) {
  return join2(getProjectsDir(), sanitizePath(dir), "bridge-pointer.json");
}
async function writeBridgePointer(dir, pointer) {
  const path = getBridgePointerPath(dir);
  try {
    await mkdir(dirname2(path), { recursive: true });
    await writeFile(path, jsonStringify5(pointer), "utf8");
    logForDebugging6(`[bridge:pointer] wrote ${path}`);
  } catch (err) {
    logForDebugging6(`[bridge:pointer] write failed: ${err}`, { level: "warn" });
  }
}
async function readBridgePointer(dir) {
  const path = getBridgePointerPath(dir);
  let raw;
  let mtimeMs;
  try {
    mtimeMs = (await stat(path)).mtimeMs;
    raw = await readFile(path, "utf8");
  } catch {
    return null;
  }
  const parsed = BridgePointerSchema().safeParse(safeJsonParse(raw));
  if (!parsed.success) {
    logForDebugging6(`[bridge:pointer] invalid schema, clearing: ${path}`);
    await clearBridgePointer(dir);
    return null;
  }
  const ageMs = Math.max(0, Date.now() - mtimeMs);
  if (ageMs > BRIDGE_POINTER_TTL_MS) {
    logForDebugging6(`[bridge:pointer] stale (>4h mtime), clearing: ${path}`);
    await clearBridgePointer(dir);
    return null;
  }
  return { ...parsed.data, ageMs };
}
async function readBridgePointerAcrossWorktrees(dir) {
  const here = await readBridgePointer(dir);
  if (here) {
    return { pointer: here, dir };
  }
  const worktrees = await getWorktreePathsPortable(dir);
  if (worktrees.length <= 1) return null;
  if (worktrees.length > MAX_WORKTREE_FANOUT) {
    logForDebugging6(
      `[bridge:pointer] ${worktrees.length} worktrees exceeds fanout cap ${MAX_WORKTREE_FANOUT}, skipping`
    );
    return null;
  }
  const dirKey = sanitizePath(dir);
  const candidates = worktrees.filter((wt) => sanitizePath(wt) !== dirKey);
  const results = await Promise.all(
    candidates.map(async (wt) => {
      const p = await readBridgePointer(wt);
      return p ? { pointer: p, dir: wt } : null;
    })
  );
  let freshest = null;
  for (const r of results) {
    if (r && (!freshest || r.pointer.ageMs < freshest.pointer.ageMs)) {
      freshest = r;
    }
  }
  if (freshest) {
    logForDebugging6(
      `[bridge:pointer] fanout found pointer in worktree ${freshest.dir} (ageMs=${freshest.pointer.ageMs})`
    );
  }
  return freshest;
}
async function clearBridgePointer(dir) {
  const path = getBridgePointerPath(dir);
  try {
    await unlink(path);
    logForDebugging6(`[bridge:pointer] cleared ${path}`);
  } catch (err) {
    if (!isENOENT(err)) {
      logForDebugging6(`[bridge:pointer] clear failed: ${err}`, {
        level: "warn"
      });
    }
  }
}
function safeJsonParse(raw) {
  try {
    return jsonParse4(raw);
  } catch {
    return null;
  }
}
var MAX_WORKTREE_FANOUT, BRIDGE_POINTER_TTL_MS, BridgePointerSchema;
var init_bridgePointer = __esm({
  "src/bridgePointer.ts"() {
    MAX_WORKTREE_FANOUT = 50;
    BRIDGE_POINTER_TTL_MS = 4 * 60 * 60 * 1e3;
    BridgePointerSchema = lazySchema(
      () => z.object({
        sessionId: z.string(),
        environmentId: z.string(),
        source: z.enum(["standalone", "repl"])
      })
    );
  }
});

// src/bridgeConfig.ts
var bridgeConfig_exports = {};
__export(bridgeConfig_exports, {
  getBridgeAccessToken: () => getBridgeAccessToken,
  getBridgeBaseUrl: () => getBridgeBaseUrl,
  getBridgeBaseUrlOverride: () => getBridgeBaseUrlOverride,
  getBridgeTokenOverride: () => getBridgeTokenOverride
});
function getBridgeAccessToken() {
  return void 0;
}
function getBridgeBaseUrl() {
  return process.env.BRIDGE_BASE_URL ?? "http://localhost:9090";
}
function getBridgeTokenOverride() {
  return void 0;
}
function getBridgeBaseUrlOverride() {
  return void 0;
}
var init_bridgeConfig = __esm({
  "src/bridgeConfig.ts"() {
  }
});

// src/bridgeMain.ts
import { feature } from "bun:bundle";
import { randomUUID } from "crypto";
import { hostname, tmpdir as tmpdir2 } from "os";
import { basename, join as join3, resolve } from "path";
import { getRemoteSessionUrl as getRemoteSessionUrl2 } from "../constants/product.js";
import { shutdownDatadog } from "../services/analytics/datadog.js";
import { shutdown1PEventLogging } from "../services/analytics/firstPartyEventLogger.js";
import { checkGate_CACHED_OR_BLOCKING as checkGate_CACHED_OR_BLOCKING2 } from "../services/analytics/growthbook.js";
import {
  logEvent as logEvent3,
  logEventAsync
} from "../services/analytics/index.js";
import { isInBundledMode } from "../utils/bundledMode.js";
import { logForDebugging as logForDebugging7 } from "../utils/debug.js";
import { logForDiagnosticsNoPII as logForDiagnosticsNoPII2 } from "../utils/diagLogs.js";
import { isEnvTruthy, isInProtectedNamespace } from "../utils/envUtils.js";
import { errorMessage as errorMessage5 } from "../utils/errors.js";
import { truncateToWidth as truncateToWidth2 } from "../utils/format.js";
import { logError } from "../utils/log.js";
import { sleep } from "../utils/sleep.js";
import { createAgentWorktree, removeAgentWorktree } from "../utils/worktree.js";

// src/bridgeApi.ts
var BridgeFatalError = class extends Error {
  status;
  errorType;
  constructor(message, status, errorType) {
    super(message);
    this.name = "BridgeFatalError";
    this.status = status;
    this.errorType = errorType;
  }
};
var SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
function validateBridgeId(id, label) {
  if (!id || !SAFE_ID_PATTERN.test(id)) {
    throw new Error(`Invalid ${label}: contains unsafe characters`);
  }
  return id;
}
function isExpiredErrorType(_errorType) {
  return false;
}
function isSuppressible403(_err) {
  return false;
}
function createBridgeApiClient(_deps) {
  const debug = _deps.onDebug ?? (() => {
  });
  return {
    async registerBridgeEnvironment(_config) {
      debug("[bridge:api] HERMES MODE \u2014 registerBridgeEnvironment stub");
      return { environment_id: "local-env", environment_secret: "local-secret" };
    },
    async pollForWork(_environmentId, _environmentSecret, _signal) {
      debug("[bridge:api] HERMES MODE \u2014 pollForWork stub (returns null)");
      return null;
    },
    async acknowledgeWork(_environmentId, _workId, _sessionToken) {
      debug("[bridge:api] HERMES MODE \u2014 acknowledgeWork stub");
    },
    async stopWork(_environmentId, _workId, _force) {
      debug("[bridge:api] HERMES MODE \u2014 stopWork stub");
    },
    async deregisterEnvironment(_environmentId) {
      debug("[bridge:api] HERMES MODE \u2014 deregisterEnvironment stub");
    },
    async archiveSession(_sessionId) {
      debug("[bridge:api] HERMES MODE \u2014 archiveSession stub");
    },
    async reconnectSession(_environmentId, _sessionId) {
      debug("[bridge:api] HERMES MODE \u2014 reconnectSession stub");
    },
    async heartbeatWork(_environmentId, _workId, _sessionToken) {
      debug("[bridge:api] HERMES MODE \u2014 heartbeatWork stub");
      return { lease_extended: false, state: "unknown" };
    },
    async sendPermissionResponseEvent(_sessionId, _event, _sessionToken) {
      debug("[bridge:api] HERMES MODE \u2014 sendPermissionResponseEvent stub");
    }
  };
}

// src/bridgeStatusUtil.ts
import {
  getClaudeAiBaseUrl,
  getRemoteSessionUrl
} from "../constants/product.js";
import { stringWidth } from "../ink/stringWidth.js";
import { formatDuration, truncateToWidth } from "../utils/format.js";
import { getGraphemeSegmenter } from "../utils/intl.js";
var TOOL_DISPLAY_EXPIRY_MS = 3e4;
function timestamp() {
  const now = /* @__PURE__ */ new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
function buildBridgeConnectUrl(environmentId, ingressUrl) {
  const baseUrl = getClaudeAiBaseUrl(void 0, ingressUrl);
  return `${baseUrl}/code?bridge=${environmentId}`;
}
function buildBridgeSessionUrl(sessionId, environmentId, ingressUrl) {
  return `${getRemoteSessionUrl(sessionId, ingressUrl)}?bridge=${environmentId}`;
}
function buildIdleFooterText(url) {
  return `Code everywhere with the Claude app or ${url}`;
}
function buildActiveFooterText(url) {
  return `Continue coding in the Claude app or ${url}`;
}
var FAILED_FOOTER_TEXT = "Something went wrong, please try again";
function wrapWithOsc8Link(text, url) {
  return `\x1B]8;;${url}\x07${text}\x1B]8;;\x07`;
}

// src/bridgeUI.ts
import chalk from "chalk";
import { toString as qrToString } from "qrcode";
import {
  BRIDGE_FAILED_INDICATOR,
  BRIDGE_READY_INDICATOR,
  BRIDGE_SPINNER_FRAMES
} from "../constants/figures.js";
import { stringWidth as stringWidth2 } from "../ink/stringWidth.js";
import { logForDebugging } from "../utils/debug.js";
var QR_OPTIONS = {
  type: "utf8",
  errorCorrectionLevel: "L",
  small: true
};
async function generateQr(url) {
  const qr = await qrToString(url, QR_OPTIONS);
  return qr.split("\n").filter((line) => line.length > 0);
}
function createBridgeLogger(options) {
  const write = options.write ?? ((s) => process.stdout.write(s));
  const verbose = options.verbose;
  let statusLineCount = 0;
  let currentState = "idle";
  let currentStateText = "Ready";
  let repoName = "";
  let branch = "";
  let debugLogPath = "";
  let connectUrl = "";
  let cachedIngressUrl = "";
  let cachedEnvironmentId = "";
  let activeSessionUrl = null;
  let qrLines = [];
  let qrVisible = false;
  let lastToolSummary = null;
  let lastToolTime = 0;
  let sessionActive = 0;
  let sessionMax = 1;
  let spawnModeDisplay = null;
  let spawnMode = "single-session";
  const sessionDisplayInfo = /* @__PURE__ */ new Map();
  let connectingTimer = null;
  let connectingTick = 0;
  function countVisualLines(text) {
    const cols = process.stdout.columns || 80;
    let count = 0;
    for (const logical of text.split("\n")) {
      if (logical.length === 0) {
        count++;
        continue;
      }
      const width = stringWidth2(logical);
      count += Math.max(1, Math.ceil(width / cols));
    }
    if (text.endsWith("\n")) {
      count--;
    }
    return count;
  }
  function writeStatus(text) {
    write(text);
    statusLineCount += countVisualLines(text);
  }
  function clearStatusLines() {
    if (statusLineCount <= 0) return;
    logForDebugging(`[bridge:ui] clearStatusLines count=${statusLineCount}`);
    write(`\x1B[${statusLineCount}A`);
    write("\x1B[J");
    statusLineCount = 0;
  }
  function printLog(line) {
    clearStatusLines();
    write(line);
  }
  function regenerateQr(url) {
    generateQr(url).then((lines) => {
      qrLines = lines;
      renderStatusLine();
    }).catch((e) => {
      logForDebugging(`QR code generation failed: ${e}`, { level: "error" });
    });
  }
  function renderConnectingLine() {
    clearStatusLines();
    const frame = BRIDGE_SPINNER_FRAMES[connectingTick % BRIDGE_SPINNER_FRAMES.length];
    let suffix = "";
    if (repoName) {
      suffix += chalk.dim(" \xB7 ") + chalk.dim(repoName);
    }
    if (branch) {
      suffix += chalk.dim(" \xB7 ") + chalk.dim(branch);
    }
    writeStatus(
      `${chalk.yellow(frame)} ${chalk.yellow("Connecting")}${suffix}
`
    );
  }
  function startConnecting() {
    stopConnecting();
    renderConnectingLine();
    connectingTimer = setInterval(() => {
      connectingTick++;
      renderConnectingLine();
    }, 150);
  }
  function stopConnecting() {
    if (connectingTimer) {
      clearInterval(connectingTimer);
      connectingTimer = null;
    }
  }
  function renderStatusLine() {
    if (currentState === "reconnecting" || currentState === "failed") {
      return;
    }
    clearStatusLines();
    const isIdle = currentState === "idle";
    if (qrVisible) {
      for (const line of qrLines) {
        writeStatus(`${chalk.dim(line)}
`);
      }
    }
    const indicator = BRIDGE_READY_INDICATOR;
    const indicatorColor = isIdle ? chalk.green : chalk.cyan;
    const baseColor = isIdle ? chalk.green : chalk.cyan;
    const stateText = baseColor(currentStateText);
    let suffix = "";
    if (repoName) {
      suffix += chalk.dim(" \xB7 ") + chalk.dim(repoName);
    }
    if (branch && spawnMode !== "worktree") {
      suffix += chalk.dim(" \xB7 ") + chalk.dim(branch);
    }
    if (process.env.USER_TYPE === "ant" && debugLogPath) {
      writeStatus(
        `${chalk.yellow("[ANT-ONLY] Logs:")} ${chalk.dim(debugLogPath)}
`
      );
    }
    writeStatus(`${indicatorColor(indicator)} ${stateText}${suffix}
`);
    if (sessionMax > 1) {
      const modeHint = spawnMode === "worktree" ? "New sessions will be created in an isolated worktree" : "New sessions will be created in the current directory";
      writeStatus(
        `    ${chalk.dim(`Capacity: ${sessionActive}/${sessionMax} \xB7 ${modeHint}`)}
`
      );
      for (const [, info] of sessionDisplayInfo) {
        const titleText = info.title ? truncateToWidth(info.title, 35) : chalk.dim("Attached");
        const titleLinked = wrapWithOsc8Link(titleText, info.url);
        const act = info.activity;
        const showAct = act && act.type !== "result" && act.type !== "error";
        const actText = showAct ? chalk.dim(` ${truncateToWidth(act.summary, 40)}`) : "";
        writeStatus(`    ${titleLinked}${actText}
`);
      }
    }
    if (sessionMax === 1) {
      const modeText = spawnMode === "single-session" ? "Single session \xB7 exits when complete" : spawnMode === "worktree" ? `Capacity: ${sessionActive}/1 \xB7 New sessions will be created in an isolated worktree` : `Capacity: ${sessionActive}/1 \xB7 New sessions will be created in the current directory`;
      writeStatus(`    ${chalk.dim(modeText)}
`);
    }
    if (sessionMax === 1 && !isIdle && lastToolSummary && Date.now() - lastToolTime < TOOL_DISPLAY_EXPIRY_MS) {
      writeStatus(`  ${chalk.dim(truncateToWidth(lastToolSummary, 60))}
`);
    }
    const url = activeSessionUrl ?? connectUrl;
    if (url) {
      writeStatus("\n");
      const footerText = isIdle ? buildIdleFooterText(url) : buildActiveFooterText(url);
      const qrHint = qrVisible ? chalk.dim.italic("space to hide QR code") : chalk.dim.italic("space to show QR code");
      const toggleHint = spawnModeDisplay ? chalk.dim.italic(" \xB7 w to toggle spawn mode") : "";
      writeStatus(`${chalk.dim(footerText)}
`);
      writeStatus(`${qrHint}${toggleHint}
`);
    }
  }
  return {
    printBanner(config, environmentId) {
      cachedIngressUrl = config.sessionIngressUrl;
      cachedEnvironmentId = environmentId;
      connectUrl = buildBridgeConnectUrl(environmentId, cachedIngressUrl);
      regenerateQr(connectUrl);
      if (verbose) {
        write(chalk.dim(`Remote Control`) + ` v${MACRO.VERSION}
`);
      }
      if (verbose) {
        if (config.spawnMode !== "single-session") {
          write(chalk.dim(`Spawn mode: `) + `${config.spawnMode}
`);
          write(
            chalk.dim(`Max concurrent sessions: `) + `${config.maxSessions}
`
          );
        }
        write(chalk.dim(`Environment ID: `) + `${environmentId}
`);
      }
      if (config.sandbox) {
        write(chalk.dim(`Sandbox: `) + `${chalk.green("Enabled")}
`);
      }
      write("\n");
      startConnecting();
    },
    logSessionStart(sessionId, prompt) {
      if (verbose) {
        const short = truncateToWidth(prompt, 80);
        printLog(
          chalk.dim(`[${timestamp()}]`) + ` Session started: ${chalk.white(`"${short}"`)} (${chalk.dim(sessionId)})
`
        );
      }
    },
    logSessionComplete(sessionId, durationMs) {
      printLog(
        chalk.dim(`[${timestamp()}]`) + ` Session ${chalk.green("completed")} (${formatDuration(durationMs)}) ${chalk.dim(sessionId)}
`
      );
    },
    logSessionFailed(sessionId, error) {
      printLog(
        chalk.dim(`[${timestamp()}]`) + ` Session ${chalk.red("failed")}: ${error} ${chalk.dim(sessionId)}
`
      );
    },
    logStatus(message) {
      printLog(chalk.dim(`[${timestamp()}]`) + ` ${message}
`);
    },
    logVerbose(message) {
      if (verbose) {
        printLog(chalk.dim(`[${timestamp()}] ${message}`) + "\n");
      }
    },
    logError(message) {
      printLog(chalk.red(`[${timestamp()}] Error: ${message}`) + "\n");
    },
    logReconnected(disconnectedMs) {
      printLog(
        chalk.dim(`[${timestamp()}]`) + ` ${chalk.green("Reconnected")} after ${formatDuration(disconnectedMs)}
`
      );
    },
    setRepoInfo(repo, branchName) {
      repoName = repo;
      branch = branchName;
    },
    setDebugLogPath(path) {
      debugLogPath = path;
    },
    updateIdleStatus() {
      stopConnecting();
      currentState = "idle";
      currentStateText = "Ready";
      lastToolSummary = null;
      lastToolTime = 0;
      activeSessionUrl = null;
      regenerateQr(connectUrl);
      renderStatusLine();
    },
    setAttached(sessionId) {
      stopConnecting();
      currentState = "attached";
      currentStateText = "Connected";
      lastToolSummary = null;
      lastToolTime = 0;
      if (sessionMax <= 1) {
        activeSessionUrl = buildBridgeSessionUrl(
          sessionId,
          cachedEnvironmentId,
          cachedIngressUrl
        );
        regenerateQr(activeSessionUrl);
      }
      renderStatusLine();
    },
    updateReconnectingStatus(delayStr, elapsedStr) {
      stopConnecting();
      clearStatusLines();
      currentState = "reconnecting";
      if (qrVisible) {
        for (const line of qrLines) {
          writeStatus(`${chalk.dim(line)}
`);
        }
      }
      const frame = BRIDGE_SPINNER_FRAMES[connectingTick % BRIDGE_SPINNER_FRAMES.length];
      connectingTick++;
      writeStatus(
        `${chalk.yellow(frame)} ${chalk.yellow("Reconnecting")} ${chalk.dim("\xB7")} ${chalk.dim(`retrying in ${delayStr}`)} ${chalk.dim("\xB7")} ${chalk.dim(`disconnected ${elapsedStr}`)}
`
      );
    },
    updateFailedStatus(error) {
      stopConnecting();
      clearStatusLines();
      currentState = "failed";
      let suffix = "";
      if (repoName) {
        suffix += chalk.dim(" \xB7 ") + chalk.dim(repoName);
      }
      if (branch) {
        suffix += chalk.dim(" \xB7 ") + chalk.dim(branch);
      }
      writeStatus(
        `${chalk.red(BRIDGE_FAILED_INDICATOR)} ${chalk.red("Remote Control Failed")}${suffix}
`
      );
      writeStatus(`${chalk.dim(FAILED_FOOTER_TEXT)}
`);
      if (error) {
        writeStatus(`${chalk.red(error)}
`);
      }
    },
    updateSessionStatus(_sessionId, _elapsed, activity, _trail) {
      if (activity.type === "tool_start") {
        lastToolSummary = activity.summary;
        lastToolTime = Date.now();
      }
      renderStatusLine();
    },
    clearStatus() {
      stopConnecting();
      clearStatusLines();
    },
    toggleQr() {
      qrVisible = !qrVisible;
      renderStatusLine();
    },
    updateSessionCount(active, max, mode) {
      if (sessionActive === active && sessionMax === max && spawnMode === mode)
        return;
      sessionActive = active;
      sessionMax = max;
      spawnMode = mode;
    },
    setSpawnModeDisplay(mode) {
      if (spawnModeDisplay === mode) return;
      spawnModeDisplay = mode;
      if (mode) spawnMode = mode;
    },
    addSession(sessionId, url) {
      sessionDisplayInfo.set(sessionId, { url });
    },
    updateSessionActivity(sessionId, activity) {
      const info = sessionDisplayInfo.get(sessionId);
      if (!info) return;
      info.activity = activity;
    },
    setSessionTitle(sessionId, title) {
      const info = sessionDisplayInfo.get(sessionId);
      if (!info) return;
      info.title = title;
      if (currentState === "reconnecting" || currentState === "failed") return;
      if (sessionMax === 1) {
        currentState = "titled";
        currentStateText = truncateToWidth(title, 40);
      }
      renderStatusLine();
    },
    removeSession(sessionId) {
      sessionDisplayInfo.delete(sessionId);
    },
    refreshDisplay() {
      if (currentState === "reconnecting" || currentState === "failed") return;
      renderStatusLine();
    }
  };
}

// src/capacityWake.ts
function createCapacityWake(outerSignal) {
  let wakeController = new AbortController();
  function wake() {
    wakeController.abort();
    wakeController = new AbortController();
  }
  function signal() {
    const merged = new AbortController();
    const abort = () => merged.abort();
    if (outerSignal.aborted || wakeController.signal.aborted) {
      merged.abort();
      return { signal: merged.signal, cleanup: () => {
      } };
    }
    outerSignal.addEventListener("abort", abort, { once: true });
    const capSig = wakeController.signal;
    capSig.addEventListener("abort", abort, { once: true });
    return {
      signal: merged.signal,
      cleanup: () => {
        outerSignal.removeEventListener("abort", abort);
        capSig.removeEventListener("abort", abort);
      }
    };
  }
  return { signal, wake };
}

// src/bridgeMain.ts
init_debugUtils();

// src/jwtUtils.ts
import { logEvent as logEvent2 } from "../services/analytics/index.js";
import { logForDebugging as logForDebugging3 } from "../utils/debug.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import { errorMessage as errorMessage2 } from "../utils/errors.js";
import { jsonParse } from "../utils/slowOperations.js";
function formatDuration2(ms) {
  if (ms < 6e4) return `${Math.round(ms / 1e3)}s`;
  const m = Math.floor(ms / 6e4);
  const s = Math.round(ms % 6e4 / 1e3);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
function decodeJwtPayload(token) {
  const jwt = token.startsWith("sk-ant-si-") ? token.slice("sk-ant-si-".length) : token;
  const parts = jwt.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    return jsonParse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
function decodeJwtExpiry(token) {
  const payload = decodeJwtPayload(token);
  if (payload !== null && typeof payload === "object" && "exp" in payload && typeof payload.exp === "number") {
    return payload.exp;
  }
  return null;
}
var TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1e3;
var FALLBACK_REFRESH_INTERVAL_MS = 30 * 60 * 1e3;
var MAX_REFRESH_FAILURES = 3;
var REFRESH_RETRY_DELAY_MS = 6e4;
function createTokenRefreshScheduler({
  getAccessToken,
  onRefresh,
  label,
  refreshBufferMs = TOKEN_REFRESH_BUFFER_MS
}) {
  const timers = /* @__PURE__ */ new Map();
  const failureCounts = /* @__PURE__ */ new Map();
  const generations = /* @__PURE__ */ new Map();
  function nextGeneration(sessionId) {
    const gen = (generations.get(sessionId) ?? 0) + 1;
    generations.set(sessionId, gen);
    return gen;
  }
  function schedule(sessionId, token) {
    const expiry = decodeJwtExpiry(token);
    if (!expiry) {
      logForDebugging3(
        `[${label}:token] Could not decode JWT expiry for sessionId=${sessionId}, token prefix=${token.slice(0, 15)}\u2026, keeping existing timer`
      );
      return;
    }
    const existing = timers.get(sessionId);
    if (existing) {
      clearTimeout(existing);
    }
    const gen = nextGeneration(sessionId);
    const expiryDate = new Date(expiry * 1e3).toISOString();
    const delayMs = expiry * 1e3 - Date.now() - refreshBufferMs;
    if (delayMs <= 0) {
      logForDebugging3(
        `[${label}:token] Token for sessionId=${sessionId} expires=${expiryDate} (past or within buffer), refreshing immediately`
      );
      void doRefresh(sessionId, gen);
      return;
    }
    logForDebugging3(
      `[${label}:token] Scheduled token refresh for sessionId=${sessionId} in ${formatDuration2(delayMs)} (expires=${expiryDate}, buffer=${refreshBufferMs / 1e3}s)`
    );
    const timer = setTimeout(doRefresh, delayMs, sessionId, gen);
    timers.set(sessionId, timer);
  }
  function scheduleFromExpiresIn(sessionId, expiresInSeconds) {
    const existing = timers.get(sessionId);
    if (existing) clearTimeout(existing);
    const gen = nextGeneration(sessionId);
    const delayMs = Math.max(expiresInSeconds * 1e3 - refreshBufferMs, 3e4);
    logForDebugging3(
      `[${label}:token] Scheduled token refresh for sessionId=${sessionId} in ${formatDuration2(delayMs)} (expires_in=${expiresInSeconds}s, buffer=${refreshBufferMs / 1e3}s)`
    );
    const timer = setTimeout(doRefresh, delayMs, sessionId, gen);
    timers.set(sessionId, timer);
  }
  async function doRefresh(sessionId, gen) {
    let oauthToken;
    try {
      oauthToken = await getAccessToken();
    } catch (err) {
      logForDebugging3(
        `[${label}:token] getAccessToken threw for sessionId=${sessionId}: ${errorMessage2(err)}`,
        { level: "error" }
      );
    }
    if (generations.get(sessionId) !== gen) {
      logForDebugging3(
        `[${label}:token] doRefresh for sessionId=${sessionId} stale (gen ${gen} vs ${generations.get(sessionId)}), skipping`
      );
      return;
    }
    if (!oauthToken) {
      const failures = (failureCounts.get(sessionId) ?? 0) + 1;
      failureCounts.set(sessionId, failures);
      logForDebugging3(
        `[${label}:token] No OAuth token available for refresh, sessionId=${sessionId} (failure ${failures}/${MAX_REFRESH_FAILURES})`,
        { level: "error" }
      );
      logForDiagnosticsNoPII("error", "bridge_token_refresh_no_oauth");
      if (failures < MAX_REFRESH_FAILURES) {
        const retryTimer = setTimeout(
          doRefresh,
          REFRESH_RETRY_DELAY_MS,
          sessionId,
          gen
        );
        timers.set(sessionId, retryTimer);
      }
      return;
    }
    failureCounts.delete(sessionId);
    logForDebugging3(
      `[${label}:token] Refreshing token for sessionId=${sessionId}: new token prefix=${oauthToken.slice(0, 15)}\u2026`
    );
    logEvent2("tengu_bridge_token_refreshed", {});
    onRefresh(sessionId, oauthToken);
    const timer = setTimeout(
      doRefresh,
      FALLBACK_REFRESH_INTERVAL_MS,
      sessionId,
      gen
    );
    timers.set(sessionId, timer);
    logForDebugging3(
      `[${label}:token] Scheduled follow-up refresh for sessionId=${sessionId} in ${formatDuration2(FALLBACK_REFRESH_INTERVAL_MS)}`
    );
  }
  function cancel(sessionId) {
    nextGeneration(sessionId);
    const timer = timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      timers.delete(sessionId);
    }
    failureCounts.delete(sessionId);
  }
  function cancelAll() {
    for (const sessionId of generations.keys()) {
      nextGeneration(sessionId);
    }
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
    timers.clear();
    failureCounts.clear();
  }
  return { schedule, scheduleFromExpiresIn, cancel, cancelAll };
}

// src/pollConfig.ts
function getPollIntervalConfig() {
  return {
    multisession_poll_interval_ms_not_at_capacity: 5e3,
    multisession_poll_interval_ms_partial_capacity: 2e3,
    multisession_poll_interval_ms_at_capacity: 1e4,
    non_exclusive_heartbeat_interval_ms: 3e4,
    reclaim_older_than_ms: 3e5
  };
}

// src/bridgeMain.ts
init_sessionIdCompat();

// src/sessionRunner.ts
init_debugUtils();
import { spawn } from "child_process";
import { createWriteStream } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { createInterface } from "readline";
import { jsonParse as jsonParse2, jsonStringify as jsonStringify2 } from "../utils/slowOperations.js";
var MAX_ACTIVITIES = 10;
var MAX_STDERR_LINES = 10;
function safeFilenameId(id) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}
var TOOL_VERBS = {
  Read: "Reading",
  Write: "Writing",
  Edit: "Editing",
  MultiEdit: "Editing",
  Bash: "Running",
  Glob: "Searching",
  Grep: "Searching",
  WebFetch: "Fetching",
  WebSearch: "Searching",
  Task: "Running task",
  FileReadTool: "Reading",
  FileWriteTool: "Writing",
  FileEditTool: "Editing",
  GlobTool: "Searching",
  GrepTool: "Searching",
  BashTool: "Running",
  NotebookEditTool: "Editing notebook",
  LSP: "LSP"
};
function toolSummary(name, input) {
  const verb = TOOL_VERBS[name] ?? name;
  const target = input.file_path ?? input.filePath ?? input.pattern ?? input.command?.slice(0, 60) ?? input.url ?? input.query ?? "";
  if (target) {
    return `${verb} ${target}`;
  }
  return verb;
}
function extractActivities(line, sessionId, onDebug) {
  let parsed;
  try {
    parsed = jsonParse2(line);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") {
    return [];
  }
  const msg = parsed;
  const activities = [];
  const now = Date.now();
  switch (msg.type) {
    case "assistant": {
      const message = msg.message;
      if (!message) break;
      const content = message.content;
      if (!Array.isArray(content)) break;
      for (const block of content) {
        if (!block || typeof block !== "object") continue;
        const b = block;
        if (b.type === "tool_use") {
          const name = b.name ?? "Tool";
          const input = b.input ?? {};
          const summary = toolSummary(name, input);
          activities.push({
            type: "tool_start",
            summary,
            timestamp: now
          });
          onDebug(
            `[bridge:activity] sessionId=${sessionId} tool_use name=${name} ${inputPreview(input)}`
          );
        } else if (b.type === "text") {
          const text = b.text ?? "";
          if (text.length > 0) {
            activities.push({
              type: "text",
              summary: text.slice(0, 80),
              timestamp: now
            });
            onDebug(
              `[bridge:activity] sessionId=${sessionId} text "${text.slice(0, 100)}"`
            );
          }
        }
      }
      break;
    }
    case "result": {
      const subtype = msg.subtype;
      if (subtype === "success") {
        activities.push({
          type: "result",
          summary: "Session completed",
          timestamp: now
        });
        onDebug(
          `[bridge:activity] sessionId=${sessionId} result subtype=success`
        );
      } else if (subtype) {
        const errors = msg.errors;
        const errorSummary = errors?.[0] ?? `Error: ${subtype}`;
        activities.push({
          type: "error",
          summary: errorSummary,
          timestamp: now
        });
        onDebug(
          `[bridge:activity] sessionId=${sessionId} result subtype=${subtype} error="${errorSummary}"`
        );
      } else {
        onDebug(
          `[bridge:activity] sessionId=${sessionId} result subtype=undefined`
        );
      }
      break;
    }
    default:
      break;
  }
  return activities;
}
function extractUserMessageText(msg) {
  if (msg.parent_tool_use_id != null || msg.isSynthetic || msg.isReplay)
    return void 0;
  const message = msg.message;
  const content = message?.content;
  let text;
  if (typeof content === "string") {
    text = content;
  } else if (Array.isArray(content)) {
    for (const block of content) {
      if (block && typeof block === "object" && block.type === "text") {
        text = block.text;
        break;
      }
    }
  }
  text = text?.trim();
  return text ? text : void 0;
}
function inputPreview(input) {
  const parts = [];
  for (const [key, val] of Object.entries(input)) {
    if (typeof val === "string") {
      parts.push(`${key}="${val.slice(0, 100)}"`);
    }
    if (parts.length >= 3) break;
  }
  return parts.join(" ");
}
function createSessionSpawner(deps) {
  return {
    spawn(opts, dir) {
      const safeId = safeFilenameId(opts.sessionId);
      let debugFile;
      if (deps.debugFile) {
        const ext = deps.debugFile.lastIndexOf(".");
        if (ext > 0) {
          debugFile = `${deps.debugFile.slice(0, ext)}-${safeId}${deps.debugFile.slice(ext)}`;
        } else {
          debugFile = `${deps.debugFile}-${safeId}`;
        }
      } else if (deps.verbose || process.env.USER_TYPE === "ant") {
        debugFile = join(tmpdir(), "claude", `bridge-session-${safeId}.log`);
      }
      let transcriptStream = null;
      let transcriptPath;
      if (deps.debugFile) {
        transcriptPath = join(
          dirname(deps.debugFile),
          `bridge-transcript-${safeId}.jsonl`
        );
        transcriptStream = createWriteStream(transcriptPath, { flags: "a" });
        transcriptStream.on("error", (err) => {
          deps.onDebug(
            `[bridge:session] Transcript write error: ${err.message}`
          );
          transcriptStream = null;
        });
        deps.onDebug(`[bridge:session] Transcript log: ${transcriptPath}`);
      }
      const args2 = [
        ...deps.scriptArgs,
        "--print",
        "--sdk-url",
        opts.sdkUrl,
        "--session-id",
        opts.sessionId,
        "--input-format",
        "stream-json",
        "--output-format",
        "stream-json",
        "--replay-user-messages",
        ...deps.verbose ? ["--verbose"] : [],
        ...debugFile ? ["--debug-file", debugFile] : [],
        ...deps.permissionMode ? ["--permission-mode", deps.permissionMode] : []
      ];
      const env = {
        ...deps.env,
        // Strip the bridge's OAuth token so the child CC process uses
        // the session access token for inference instead.
        CLAUDE_CODE_OAUTH_TOKEN: void 0,
        CLAUDE_CODE_ENVIRONMENT_KIND: "bridge",
        ...deps.sandbox && { CLAUDE_CODE_FORCE_SANDBOX: "1" },
        CLAUDE_CODE_SESSION_ACCESS_TOKEN: opts.accessToken,
        // v1: HybridTransport (WS reads + POST writes) to Session-Ingress.
        // Harmless in v2 mode — transportUtils checks CLAUDE_CODE_USE_CCR_V2 first.
        CLAUDE_CODE_POST_FOR_SESSION_INGRESS_V2: "1",
        // v2: SSETransport + CCRClient to CCR's /v1/code/sessions/* endpoints.
        // Same env vars environment-manager sets in the container path.
        ...opts.useCcrV2 && {
          CLAUDE_CODE_USE_CCR_V2: "1",
          CLAUDE_CODE_WORKER_EPOCH: String(opts.workerEpoch)
        }
      };
      deps.onDebug(
        `[bridge:session] Spawning sessionId=${opts.sessionId} sdkUrl=${opts.sdkUrl} accessToken=${opts.accessToken ? "present" : "MISSING"}`
      );
      deps.onDebug(`[bridge:session] Child args: ${args2.join(" ")}`);
      if (debugFile) {
        deps.onDebug(`[bridge:session] Debug log: ${debugFile}`);
      }
      const child = spawn(deps.execPath, args2, {
        cwd: dir,
        stdio: ["pipe", "pipe", "pipe"],
        env,
        windowsHide: true
      });
      deps.onDebug(
        `[bridge:session] sessionId=${opts.sessionId} pid=${child.pid}`
      );
      const activities = [];
      let currentActivity = null;
      const lastStderr = [];
      let sigkillSent = false;
      let firstUserMessageSeen = false;
      if (child.stderr) {
        const stderrRl = createInterface({ input: child.stderr });
        stderrRl.on("line", (line) => {
          if (deps.verbose) {
            process.stderr.write(line + "\n");
          }
          if (lastStderr.length >= MAX_STDERR_LINES) {
            lastStderr.shift();
          }
          lastStderr.push(line);
        });
      }
      if (child.stdout) {
        const rl = createInterface({ input: child.stdout });
        rl.on("line", (line) => {
          if (transcriptStream) {
            transcriptStream.write(line + "\n");
          }
          deps.onDebug(
            `[bridge:ws] sessionId=${opts.sessionId} <<< ${debugTruncate(line)}`
          );
          if (deps.verbose) {
            process.stderr.write(line + "\n");
          }
          const extracted = extractActivities(
            line,
            opts.sessionId,
            deps.onDebug
          );
          for (const activity of extracted) {
            if (activities.length >= MAX_ACTIVITIES) {
              activities.shift();
            }
            activities.push(activity);
            currentActivity = activity;
            deps.onActivity?.(opts.sessionId, activity);
          }
          {
            let parsed;
            try {
              parsed = jsonParse2(line);
            } catch {
            }
            if (parsed && typeof parsed === "object") {
              const msg = parsed;
              if (msg.type === "control_request") {
                const request = msg.request;
                if (request?.subtype === "can_use_tool" && deps.onPermissionRequest) {
                  deps.onPermissionRequest(
                    opts.sessionId,
                    parsed,
                    opts.accessToken
                  );
                }
              } else if (msg.type === "user" && !firstUserMessageSeen && opts.onFirstUserMessage) {
                const text = extractUserMessageText(msg);
                if (text) {
                  firstUserMessageSeen = true;
                  opts.onFirstUserMessage(text);
                }
              }
            }
          }
        });
      }
      const done = new Promise((resolve2) => {
        child.on("close", (code, signal) => {
          if (transcriptStream) {
            transcriptStream.end();
            transcriptStream = null;
          }
          if (signal === "SIGTERM" || signal === "SIGINT") {
            deps.onDebug(
              `[bridge:session] sessionId=${opts.sessionId} interrupted signal=${signal} pid=${child.pid}`
            );
            resolve2("interrupted");
          } else if (code === 0) {
            deps.onDebug(
              `[bridge:session] sessionId=${opts.sessionId} completed exit_code=0 pid=${child.pid}`
            );
            resolve2("completed");
          } else {
            deps.onDebug(
              `[bridge:session] sessionId=${opts.sessionId} failed exit_code=${code} pid=${child.pid}`
            );
            resolve2("failed");
          }
        });
        child.on("error", (err) => {
          deps.onDebug(
            `[bridge:session] sessionId=${opts.sessionId} spawn error: ${err.message}`
          );
          resolve2("failed");
        });
      });
      const handle = {
        sessionId: opts.sessionId,
        done,
        activities,
        accessToken: opts.accessToken,
        lastStderr,
        get currentActivity() {
          return currentActivity;
        },
        kill() {
          if (!child.killed) {
            deps.onDebug(
              `[bridge:session] Sending SIGTERM to sessionId=${opts.sessionId} pid=${child.pid}`
            );
            if (process.platform === "win32") {
              child.kill();
            } else {
              child.kill("SIGTERM");
            }
          }
        },
        forceKill() {
          if (!sigkillSent && child.pid) {
            sigkillSent = true;
            deps.onDebug(
              `[bridge:session] Sending SIGKILL to sessionId=${opts.sessionId} pid=${child.pid}`
            );
            if (process.platform === "win32") {
              child.kill();
            } else {
              child.kill("SIGKILL");
            }
          }
        },
        writeStdin(data) {
          if (child.stdin && !child.stdin.destroyed) {
            deps.onDebug(
              `[bridge:ws] sessionId=${opts.sessionId} >>> ${debugTruncate(data)}`
            );
            child.stdin.write(data);
          }
        },
        updateAccessToken(token) {
          handle.accessToken = token;
          handle.writeStdin(
            jsonStringify2({
              type: "update_environment_variables",
              variables: { CLAUDE_CODE_SESSION_ACCESS_TOKEN: token }
            }) + "\n"
          );
          deps.onDebug(
            `[bridge:session] Sent token refresh via stdin for sessionId=${opts.sessionId}`
          );
        }
      };
      return handle;
    }
  };
}

// src/trustedDevice.ts
import axios from "axios";
import memoize from "lodash-es/memoize.js";
import { getOauthConfig } from "../constants/oauth.js";
import {
  checkGate_CACHED_OR_BLOCKING,
  getFeatureValue_CACHED_MAY_BE_STALE
} from "../services/analytics/growthbook.js";
import { logForDebugging as logForDebugging4 } from "../utils/debug.js";
import { errorMessage as errorMessage3 } from "../utils/errors.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { getSecureStorage } from "../utils/secureStorage/index.js";
import { jsonStringify as jsonStringify3 } from "../utils/slowOperations.js";
var TRUSTED_DEVICE_GATE = "tengu_sessions_elevated_auth_enforcement";
function isGateEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TRUSTED_DEVICE_GATE, false);
}
var readStoredToken = memoize(() => {
  const envToken = process.env.CLAUDE_TRUSTED_DEVICE_TOKEN;
  if (envToken) {
    return envToken;
  }
  return getSecureStorage().read()?.trustedDeviceToken;
});
function getTrustedDeviceToken() {
  if (!isGateEnabled()) {
    return void 0;
  }
  return readStoredToken();
}

// src/types.ts
var DEFAULT_SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1e3;
var BRIDGE_LOGIN_INSTRUCTION = "Remote Control is only available with claude.ai subscriptions. Please use `/login` to sign in with your claude.ai account.";
var BRIDGE_LOGIN_ERROR = "Error: You must be logged in to use Remote Control.\n\n" + BRIDGE_LOGIN_INSTRUCTION;

// src/workSecret.ts
import axios2 from "axios";
import { jsonParse as jsonParse3, jsonStringify as jsonStringify4 } from "../utils/slowOperations.js";
function decodeWorkSecret(secret) {
  const json = Buffer.from(secret, "base64url").toString("utf-8");
  const parsed = jsonParse3(json);
  if (!parsed || typeof parsed !== "object" || !("version" in parsed) || parsed.version !== 1) {
    throw new Error(
      `Unsupported work secret version: ${parsed && typeof parsed === "object" && "version" in parsed ? parsed.version : "unknown"}`
    );
  }
  const obj = parsed;
  if (typeof obj.session_ingress_token !== "string" || obj.session_ingress_token.length === 0) {
    throw new Error(
      "Invalid work secret: missing or empty session_ingress_token"
    );
  }
  if (typeof obj.api_base_url !== "string") {
    throw new Error("Invalid work secret: missing api_base_url");
  }
  return parsed;
}
function buildSdkUrl(apiBaseUrl, sessionId) {
  const isLocalhost = apiBaseUrl.includes("localhost") || apiBaseUrl.includes("127.0.0.1");
  const protocol = isLocalhost ? "ws" : "wss";
  const version = isLocalhost ? "v2" : "v1";
  const host = apiBaseUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `${protocol}://${host}/${version}/session_ingress/ws/${sessionId}`;
}
function sameSessionId(a, b) {
  if (a === b) return true;
  const aBody = a.slice(a.lastIndexOf("_") + 1);
  const bBody = b.slice(b.lastIndexOf("_") + 1);
  return aBody.length >= 4 && aBody === bBody;
}
function buildCCRv2SdkUrl(apiBaseUrl, sessionId) {
  const base = apiBaseUrl.replace(/\/+$/, "");
  return `${base}/v1/code/sessions/${sessionId}`;
}
async function registerWorker(sessionUrl, accessToken) {
  const response = await axios2.post(
    `${sessionUrl}/worker/register`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      timeout: 1e4
    }
  );
  const raw = response.data?.worker_epoch;
  const epoch = typeof raw === "string" ? Number(raw) : raw;
  if (typeof epoch !== "number" || !Number.isFinite(epoch) || !Number.isSafeInteger(epoch)) {
    throw new Error(
      `registerWorker: invalid worker_epoch in response: ${jsonStringify4(response.data)}`
    );
  }
  return epoch;
}

// src/bridgeMain.ts
var DEFAULT_BACKOFF = {
  connInitialMs: 2e3,
  connCapMs: 12e4,
  // 2 minutes
  connGiveUpMs: 6e5,
  // 10 minutes
  generalInitialMs: 500,
  generalCapMs: 3e4,
  generalGiveUpMs: 6e5
  // 10 minutes
};
var STATUS_UPDATE_INTERVAL_MS = 1e3;
var SPAWN_SESSIONS_DEFAULT = 32;
async function isMultiSessionSpawnEnabled() {
  return checkGate_CACHED_OR_BLOCKING2("tengu_ccr_bridge_multi_session");
}
function pollSleepDetectionThresholdMs(backoff) {
  return backoff.connCapMs * 2;
}
function spawnScriptArgs() {
  if (isInBundledMode() || !process.argv[1]) {
    return [];
  }
  return [process.argv[1]];
}
function safeSpawn(spawner, opts, dir) {
  try {
    return spawner.spawn(opts, dir);
  } catch (err) {
    const errMsg = errorMessage5(err);
    logError(new Error(`Session spawn failed: ${errMsg}`));
    return errMsg;
  }
}
async function runBridgeLoop(config, environmentId, environmentSecret, api, spawner, logger, signal, backoffConfig = DEFAULT_BACKOFF, initialSessionId, getAccessToken) {
  const controller = new AbortController();
  if (signal.aborted) {
    controller.abort();
  } else {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  const loopSignal = controller.signal;
  const activeSessions = /* @__PURE__ */ new Map();
  const sessionStartTimes = /* @__PURE__ */ new Map();
  const sessionWorkIds = /* @__PURE__ */ new Map();
  const sessionCompatIds = /* @__PURE__ */ new Map();
  const sessionIngressTokens = /* @__PURE__ */ new Map();
  const sessionTimers = /* @__PURE__ */ new Map();
  const completedWorkIds = /* @__PURE__ */ new Set();
  const sessionWorktrees = /* @__PURE__ */ new Map();
  const timedOutSessions = /* @__PURE__ */ new Set();
  const titledSessions = /* @__PURE__ */ new Set();
  const capacityWake = createCapacityWake(loopSignal);
  async function heartbeatActiveWorkItems() {
    let anySuccess = false;
    let anyFatal = false;
    const authFailedSessions = [];
    for (const [sessionId] of activeSessions) {
      const workId = sessionWorkIds.get(sessionId);
      const ingressToken = sessionIngressTokens.get(sessionId);
      if (!workId || !ingressToken) {
        continue;
      }
      try {
        await api.heartbeatWork(environmentId, workId, ingressToken);
        anySuccess = true;
      } catch (err) {
        logForDebugging7(
          `[bridge:heartbeat] Failed for sessionId=${sessionId} workId=${workId}: ${errorMessage5(err)}`
        );
        if (err instanceof BridgeFatalError) {
          logEvent3("tengu_bridge_heartbeat_error", {
            status: err.status,
            error_type: err.status === 401 || err.status === 403 ? "auth_failed" : "fatal"
          });
          if (err.status === 401 || err.status === 403) {
            authFailedSessions.push(sessionId);
          } else {
            anyFatal = true;
          }
        }
      }
    }
    for (const sessionId of authFailedSessions) {
      logger.logVerbose(
        `Session ${sessionId} token expired \u2014 re-queuing via bridge/reconnect`
      );
      try {
        await api.reconnectSession(environmentId, sessionId);
        logForDebugging7(
          `[bridge:heartbeat] Re-queued sessionId=${sessionId} via bridge/reconnect`
        );
      } catch (err) {
        logger.logError(
          `Failed to refresh session ${sessionId} token: ${errorMessage5(err)}`
        );
        logForDebugging7(
          `[bridge:heartbeat] reconnectSession(${sessionId}) failed: ${errorMessage5(err)}`,
          { level: "error" }
        );
      }
    }
    if (anyFatal) {
      return "fatal";
    }
    if (authFailedSessions.length > 0) {
      return "auth_failed";
    }
    return anySuccess ? "ok" : "failed";
  }
  const v2Sessions = /* @__PURE__ */ new Set();
  const tokenRefresh = getAccessToken ? createTokenRefreshScheduler({
    getAccessToken,
    onRefresh: (sessionId, oauthToken) => {
      const handle = activeSessions.get(sessionId);
      if (!handle) {
        return;
      }
      if (v2Sessions.has(sessionId)) {
        logger.logVerbose(
          `Refreshing session ${sessionId} token via bridge/reconnect`
        );
        void api.reconnectSession(environmentId, sessionId).catch((err) => {
          logger.logError(
            `Failed to refresh session ${sessionId} token: ${errorMessage5(err)}`
          );
          logForDebugging7(
            `[bridge:token] reconnectSession(${sessionId}) failed: ${errorMessage5(err)}`,
            { level: "error" }
          );
        });
      } else {
        handle.updateAccessToken(oauthToken);
      }
    },
    label: "bridge"
  }) : null;
  const loopStartTime = Date.now();
  const pendingCleanups = /* @__PURE__ */ new Set();
  function trackCleanup(p) {
    pendingCleanups.add(p);
    void p.finally(() => pendingCleanups.delete(p));
  }
  let connBackoff = 0;
  let generalBackoff = 0;
  let connErrorStart = null;
  let generalErrorStart = null;
  let lastPollErrorTime = null;
  let statusUpdateTimer = null;
  let fatalExit = false;
  logForDebugging7(
    `[bridge:work] Starting poll loop spawnMode=${config.spawnMode} maxSessions=${config.maxSessions} environmentId=${environmentId}`
  );
  logForDiagnosticsNoPII2("info", "bridge_loop_started", {
    max_sessions: config.maxSessions,
    spawn_mode: config.spawnMode
  });
  if (process.env.USER_TYPE === "ant") {
    let debugGlob;
    if (config.debugFile) {
      const ext = config.debugFile.lastIndexOf(".");
      debugGlob = ext > 0 ? `${config.debugFile.slice(0, ext)}-*${config.debugFile.slice(ext)}` : `${config.debugFile}-*`;
    } else {
      debugGlob = join3(tmpdir2(), "claude", "bridge-session-*.log");
    }
    logger.setDebugLogPath(debugGlob);
  }
  logger.printBanner(config, environmentId);
  logger.updateSessionCount(0, config.maxSessions, config.spawnMode);
  if (initialSessionId) {
    logger.setAttached(initialSessionId);
  }
  function updateStatusDisplay() {
    logger.updateSessionCount(
      activeSessions.size,
      config.maxSessions,
      config.spawnMode
    );
    for (const [sid, handle2] of activeSessions) {
      const act = handle2.currentActivity;
      if (act) {
        logger.updateSessionActivity(sessionCompatIds.get(sid) ?? sid, act);
      }
    }
    if (activeSessions.size === 0) {
      logger.updateIdleStatus();
      return;
    }
    const [sessionId, handle] = [...activeSessions.entries()].pop();
    const startTime = sessionStartTimes.get(sessionId);
    if (!startTime) return;
    const activity = handle.currentActivity;
    if (!activity || activity.type === "result" || activity.type === "error") {
      if (config.maxSessions > 1) logger.refreshDisplay();
      return;
    }
    const elapsed = formatDuration(Date.now() - startTime);
    const trail = handle.activities.filter((a) => a.type === "tool_start").slice(-5).map((a) => a.summary);
    logger.updateSessionStatus(sessionId, elapsed, activity, trail);
  }
  function startStatusUpdates() {
    stopStatusUpdates();
    updateStatusDisplay();
    statusUpdateTimer = setInterval(
      updateStatusDisplay,
      STATUS_UPDATE_INTERVAL_MS
    );
  }
  function stopStatusUpdates() {
    if (statusUpdateTimer) {
      clearInterval(statusUpdateTimer);
      statusUpdateTimer = null;
    }
  }
  function onSessionDone(sessionId, startTime, handle) {
    return (rawStatus) => {
      const workId = sessionWorkIds.get(sessionId);
      activeSessions.delete(sessionId);
      sessionStartTimes.delete(sessionId);
      sessionWorkIds.delete(sessionId);
      sessionIngressTokens.delete(sessionId);
      const compatId = sessionCompatIds.get(sessionId) ?? sessionId;
      sessionCompatIds.delete(sessionId);
      logger.removeSession(compatId);
      titledSessions.delete(compatId);
      v2Sessions.delete(sessionId);
      const timer = sessionTimers.get(sessionId);
      if (timer) {
        clearTimeout(timer);
        sessionTimers.delete(sessionId);
      }
      tokenRefresh?.cancel(sessionId);
      capacityWake.wake();
      const wasTimedOut = timedOutSessions.delete(sessionId);
      const status = wasTimedOut && rawStatus === "interrupted" ? "failed" : rawStatus;
      const durationMs = Date.now() - startTime;
      logForDebugging7(
        `[bridge:session] sessionId=${sessionId} workId=${workId ?? "unknown"} exited status=${status} duration=${formatDuration(durationMs)}`
      );
      logEvent3("tengu_bridge_session_done", {
        status,
        duration_ms: durationMs
      });
      logForDiagnosticsNoPII2("info", "bridge_session_done", {
        status,
        duration_ms: durationMs
      });
      logger.clearStatus();
      stopStatusUpdates();
      const stderrSummary = handle.lastStderr.length > 0 ? handle.lastStderr.join("\n") : void 0;
      let failureMessage;
      switch (status) {
        case "completed":
          logger.logSessionComplete(sessionId, durationMs);
          break;
        case "failed":
          if (!wasTimedOut && !loopSignal.aborted) {
            failureMessage = stderrSummary ?? "Process exited with error";
            logger.logSessionFailed(sessionId, failureMessage);
            logError(new Error(`Bridge session failed: ${failureMessage}`));
          }
          break;
        case "interrupted":
          logger.logVerbose(`Session ${sessionId} interrupted`);
          break;
      }
      if (status !== "interrupted" && workId) {
        trackCleanup(
          stopWorkWithRetry(
            api,
            environmentId,
            workId,
            logger,
            backoffConfig.stopWorkBaseDelayMs
          )
        );
        completedWorkIds.add(workId);
      }
      const wt = sessionWorktrees.get(sessionId);
      if (wt) {
        sessionWorktrees.delete(sessionId);
        trackCleanup(
          removeAgentWorktree(
            wt.worktreePath,
            wt.worktreeBranch,
            wt.gitRoot,
            wt.hookBased
          ).catch(
            (err) => logger.logVerbose(
              `Failed to remove worktree ${wt.worktreePath}: ${errorMessage5(err)}`
            )
          )
        );
      }
      if (status !== "interrupted" && !loopSignal.aborted) {
        if (config.spawnMode !== "single-session") {
          trackCleanup(
            api.archiveSession(compatId).catch(
              (err) => logger.logVerbose(
                `Failed to archive session ${sessionId}: ${errorMessage5(err)}`
              )
            )
          );
          logForDebugging7(
            `[bridge:session] Session ${status}, returning to idle (multi-session mode)`
          );
        } else {
          logForDebugging7(
            `[bridge:session] Session ${status}, aborting poll loop to tear down environment`
          );
          controller.abort();
          return;
        }
      }
      if (!loopSignal.aborted) {
        startStatusUpdates();
      }
    };
  }
  if (!initialSessionId) {
    startStatusUpdates();
  }
  while (!loopSignal.aborted) {
    const pollConfig = getPollIntervalConfig();
    try {
      const work = await api.pollForWork(
        environmentId,
        environmentSecret,
        loopSignal,
        pollConfig.reclaim_older_than_ms
      );
      const wasDisconnected = connErrorStart !== null || generalErrorStart !== null;
      if (wasDisconnected) {
        const disconnectedMs = Date.now() - (connErrorStart ?? generalErrorStart ?? Date.now());
        logger.logReconnected(disconnectedMs);
        logForDebugging7(
          `[bridge:poll] Reconnected after ${formatDuration(disconnectedMs)}`
        );
        logEvent3("tengu_bridge_reconnected", {
          disconnected_ms: disconnectedMs
        });
      }
      connBackoff = 0;
      generalBackoff = 0;
      connErrorStart = null;
      generalErrorStart = null;
      lastPollErrorTime = null;
      if (!work) {
        const atCap = activeSessions.size >= config.maxSessions;
        if (atCap) {
          const atCapMs = pollConfig.multisession_poll_interval_ms_at_capacity;
          if (pollConfig.non_exclusive_heartbeat_interval_ms > 0) {
            logEvent3("tengu_bridge_heartbeat_mode_entered", {
              active_sessions: activeSessions.size,
              heartbeat_interval_ms: pollConfig.non_exclusive_heartbeat_interval_ms
            });
            const pollDeadline = atCapMs > 0 ? Date.now() + atCapMs : null;
            let hbResult = "ok";
            let hbCycles = 0;
            while (!loopSignal.aborted && activeSessions.size >= config.maxSessions && (pollDeadline === null || Date.now() < pollDeadline)) {
              const hbConfig = getPollIntervalConfig();
              if (hbConfig.non_exclusive_heartbeat_interval_ms <= 0) break;
              const cap = capacityWake.signal();
              hbResult = await heartbeatActiveWorkItems();
              if (hbResult === "auth_failed" || hbResult === "fatal") {
                cap.cleanup();
                break;
              }
              hbCycles++;
              await sleep(
                hbConfig.non_exclusive_heartbeat_interval_ms,
                cap.signal
              );
              cap.cleanup();
            }
            const exitReason = hbResult === "auth_failed" || hbResult === "fatal" ? hbResult : loopSignal.aborted ? "shutdown" : activeSessions.size < config.maxSessions ? "capacity_changed" : pollDeadline !== null && Date.now() >= pollDeadline ? "poll_due" : "config_disabled";
            logEvent3("tengu_bridge_heartbeat_mode_exited", {
              reason: exitReason,
              heartbeat_cycles: hbCycles,
              active_sessions: activeSessions.size
            });
            if (exitReason === "poll_due") {
              logForDebugging7(
                `[bridge:poll] Heartbeat poll_due after ${hbCycles} cycles \u2014 falling through to pollForWork`
              );
            }
            if (hbResult === "auth_failed" || hbResult === "fatal") {
              const cap = capacityWake.signal();
              await sleep(
                atCapMs > 0 ? atCapMs : pollConfig.non_exclusive_heartbeat_interval_ms,
                cap.signal
              );
              cap.cleanup();
            }
          } else if (atCapMs > 0) {
            const cap = capacityWake.signal();
            await sleep(atCapMs, cap.signal);
            cap.cleanup();
          }
        } else {
          const interval = activeSessions.size > 0 ? pollConfig.multisession_poll_interval_ms_partial_capacity : pollConfig.multisession_poll_interval_ms_not_at_capacity;
          await sleep(interval, loopSignal);
        }
        continue;
      }
      const atCapacityBeforeSwitch = activeSessions.size >= config.maxSessions;
      if (completedWorkIds.has(work.id)) {
        logForDebugging7(
          `[bridge:work] Skipping already-completed workId=${work.id}`
        );
        if (atCapacityBeforeSwitch) {
          const cap = capacityWake.signal();
          if (pollConfig.non_exclusive_heartbeat_interval_ms > 0) {
            await heartbeatActiveWorkItems();
            await sleep(
              pollConfig.non_exclusive_heartbeat_interval_ms,
              cap.signal
            );
          } else if (pollConfig.multisession_poll_interval_ms_at_capacity > 0) {
            await sleep(
              pollConfig.multisession_poll_interval_ms_at_capacity,
              cap.signal
            );
          }
          cap.cleanup();
        } else {
          await sleep(1e3, loopSignal);
        }
        continue;
      }
      let secret;
      try {
        secret = decodeWorkSecret(work.secret);
      } catch (err) {
        const errMsg = errorMessage5(err);
        logger.logError(
          `Failed to decode work secret for workId=${work.id}: ${errMsg}`
        );
        logEvent3("tengu_bridge_work_secret_failed", {});
        completedWorkIds.add(work.id);
        trackCleanup(
          stopWorkWithRetry(
            api,
            environmentId,
            work.id,
            logger,
            backoffConfig.stopWorkBaseDelayMs
          )
        );
        if (atCapacityBeforeSwitch) {
          const cap = capacityWake.signal();
          if (pollConfig.non_exclusive_heartbeat_interval_ms > 0) {
            await heartbeatActiveWorkItems();
            await sleep(
              pollConfig.non_exclusive_heartbeat_interval_ms,
              cap.signal
            );
          } else if (pollConfig.multisession_poll_interval_ms_at_capacity > 0) {
            await sleep(
              pollConfig.multisession_poll_interval_ms_at_capacity,
              cap.signal
            );
          }
          cap.cleanup();
        }
        continue;
      }
      const ackWork = async () => {
        logForDebugging7(`[bridge:work] Acknowledging workId=${work.id}`);
        try {
          await api.acknowledgeWork(
            environmentId,
            work.id,
            secret.session_ingress_token
          );
        } catch (err) {
          logForDebugging7(
            `[bridge:work] Acknowledge failed workId=${work.id}: ${errorMessage5(err)}`
          );
        }
      };
      const workType = work.data.type;
      switch (work.data.type) {
        case "healthcheck":
          await ackWork();
          logForDebugging7("[bridge:work] Healthcheck received");
          logger.logVerbose("Healthcheck received");
          break;
        case "session": {
          const sessionId = work.data.id;
          try {
            validateBridgeId(sessionId, "session_id");
          } catch {
            await ackWork();
            logger.logError(`Invalid session_id received: ${sessionId}`);
            break;
          }
          const existingHandle = activeSessions.get(sessionId);
          if (existingHandle) {
            existingHandle.updateAccessToken(secret.session_ingress_token);
            sessionIngressTokens.set(sessionId, secret.session_ingress_token);
            sessionWorkIds.set(sessionId, work.id);
            tokenRefresh?.schedule(sessionId, secret.session_ingress_token);
            logForDebugging7(
              `[bridge:work] Updated access token for existing sessionId=${sessionId} workId=${work.id}`
            );
            await ackWork();
            break;
          }
          if (activeSessions.size >= config.maxSessions) {
            logForDebugging7(
              `[bridge:work] At capacity (${activeSessions.size}/${config.maxSessions}), cannot spawn new session for workId=${work.id}`
            );
            break;
          }
          await ackWork();
          const spawnStartTime = Date.now();
          let sdkUrl;
          let useCcrV2 = false;
          let workerEpoch;
          if (secret.use_code_sessions === true || isEnvTruthy(process.env.CLAUDE_BRIDGE_USE_CCR_V2)) {
            sdkUrl = buildCCRv2SdkUrl(config.apiBaseUrl, sessionId);
            for (let attempt = 1; attempt <= 2; attempt++) {
              try {
                workerEpoch = await registerWorker(
                  sdkUrl,
                  secret.session_ingress_token
                );
                useCcrV2 = true;
                logForDebugging7(
                  `[bridge:session] CCR v2: registered worker sessionId=${sessionId} epoch=${workerEpoch} attempt=${attempt}`
                );
                break;
              } catch (err) {
                const errMsg = errorMessage5(err);
                if (attempt < 2) {
                  logForDebugging7(
                    `[bridge:session] CCR v2: registerWorker attempt ${attempt} failed, retrying: ${errMsg}`
                  );
                  await sleep(2e3, loopSignal);
                  if (loopSignal.aborted) break;
                  continue;
                }
                logger.logError(
                  `CCR v2 worker registration failed for session ${sessionId}: ${errMsg}`
                );
                logError(new Error(`registerWorker failed: ${errMsg}`));
                completedWorkIds.add(work.id);
                trackCleanup(
                  stopWorkWithRetry(
                    api,
                    environmentId,
                    work.id,
                    logger,
                    backoffConfig.stopWorkBaseDelayMs
                  )
                );
              }
            }
            if (!useCcrV2) break;
          } else {
            sdkUrl = buildSdkUrl(config.sessionIngressUrl, sessionId);
          }
          const spawnModeAtDecision = config.spawnMode;
          let sessionDir = config.dir;
          let worktreeCreateMs = 0;
          if (spawnModeAtDecision === "worktree" && (initialSessionId === void 0 || !sameSessionId(sessionId, initialSessionId))) {
            const wtStart = Date.now();
            try {
              const wt = await createAgentWorktree(
                `bridge-${safeFilenameId(sessionId)}`
              );
              worktreeCreateMs = Date.now() - wtStart;
              sessionWorktrees.set(sessionId, {
                worktreePath: wt.worktreePath,
                worktreeBranch: wt.worktreeBranch,
                gitRoot: wt.gitRoot,
                hookBased: wt.hookBased
              });
              sessionDir = wt.worktreePath;
              logForDebugging7(
                `[bridge:session] Created worktree for sessionId=${sessionId} at ${wt.worktreePath}`
              );
            } catch (err) {
              const errMsg = errorMessage5(err);
              logger.logError(
                `Failed to create worktree for session ${sessionId}: ${errMsg}`
              );
              logError(new Error(`Worktree creation failed: ${errMsg}`));
              completedWorkIds.add(work.id);
              trackCleanup(
                stopWorkWithRetry(
                  api,
                  environmentId,
                  work.id,
                  logger,
                  backoffConfig.stopWorkBaseDelayMs
                )
              );
              break;
            }
          }
          logForDebugging7(
            `[bridge:session] Spawning sessionId=${sessionId} sdkUrl=${sdkUrl}`
          );
          const compatSessionId = toCompatSessionId(sessionId);
          const spawnResult = safeSpawn(
            spawner,
            {
              sessionId,
              sdkUrl,
              accessToken: secret.session_ingress_token,
              useCcrV2,
              workerEpoch,
              onFirstUserMessage: (text) => {
                if (titledSessions.has(compatSessionId)) return;
                titledSessions.add(compatSessionId);
                const title = deriveSessionTitle(text);
                logger.setSessionTitle(compatSessionId, title);
                logForDebugging7(
                  `[bridge:title] derived title for ${compatSessionId}: ${title}`
                );
                void Promise.resolve().then(() => (init_createSession(), createSession_exports)).then(
                  ({ updateBridgeSessionTitle: updateBridgeSessionTitle2 }) => updateBridgeSessionTitle2(compatSessionId, title, {
                    baseUrl: config.apiBaseUrl
                  })
                ).catch(
                  (err) => logForDebugging7(
                    `[bridge:title] failed to update title for ${compatSessionId}: ${err}`,
                    { level: "error" }
                  )
                );
              }
            },
            sessionDir
          );
          if (typeof spawnResult === "string") {
            logger.logError(
              `Failed to spawn session ${sessionId}: ${spawnResult}`
            );
            const wt = sessionWorktrees.get(sessionId);
            if (wt) {
              sessionWorktrees.delete(sessionId);
              trackCleanup(
                removeAgentWorktree(
                  wt.worktreePath,
                  wt.worktreeBranch,
                  wt.gitRoot,
                  wt.hookBased
                ).catch(
                  (err) => logger.logVerbose(
                    `Failed to remove worktree ${wt.worktreePath}: ${errorMessage5(err)}`
                  )
                )
              );
            }
            completedWorkIds.add(work.id);
            trackCleanup(
              stopWorkWithRetry(
                api,
                environmentId,
                work.id,
                logger,
                backoffConfig.stopWorkBaseDelayMs
              )
            );
            break;
          }
          const handle = spawnResult;
          const spawnDurationMs = Date.now() - spawnStartTime;
          logEvent3("tengu_bridge_session_started", {
            active_sessions: activeSessions.size,
            spawn_mode: spawnModeAtDecision,
            in_worktree: sessionWorktrees.has(sessionId),
            spawn_duration_ms: spawnDurationMs,
            worktree_create_ms: worktreeCreateMs,
            inProtectedNamespace: isInProtectedNamespace()
          });
          logForDiagnosticsNoPII2("info", "bridge_session_started", {
            spawn_mode: spawnModeAtDecision,
            in_worktree: sessionWorktrees.has(sessionId),
            spawn_duration_ms: spawnDurationMs,
            worktree_create_ms: worktreeCreateMs
          });
          activeSessions.set(sessionId, handle);
          sessionWorkIds.set(sessionId, work.id);
          sessionIngressTokens.set(sessionId, secret.session_ingress_token);
          sessionCompatIds.set(sessionId, compatSessionId);
          const startTime = Date.now();
          sessionStartTimes.set(sessionId, startTime);
          logger.logSessionStart(sessionId, `Session ${sessionId}`);
          const safeId = safeFilenameId(sessionId);
          let sessionDebugFile;
          if (config.debugFile) {
            const ext = config.debugFile.lastIndexOf(".");
            if (ext > 0) {
              sessionDebugFile = `${config.debugFile.slice(0, ext)}-${safeId}${config.debugFile.slice(ext)}`;
            } else {
              sessionDebugFile = `${config.debugFile}-${safeId}`;
            }
          } else if (config.verbose || process.env.USER_TYPE === "ant") {
            sessionDebugFile = join3(
              tmpdir2(),
              "claude",
              `bridge-session-${safeId}.log`
            );
          }
          if (sessionDebugFile) {
            logger.logVerbose(`Debug log: ${sessionDebugFile}`);
          }
          logger.addSession(
            compatSessionId,
            getRemoteSessionUrl2(compatSessionId, config.sessionIngressUrl)
          );
          startStatusUpdates();
          logger.setAttached(compatSessionId);
          void fetchSessionTitle(compatSessionId, config.apiBaseUrl).then((title) => {
            if (title && activeSessions.has(sessionId)) {
              titledSessions.add(compatSessionId);
              logger.setSessionTitle(compatSessionId, title);
              logForDebugging7(
                `[bridge:title] server title for ${compatSessionId}: ${title}`
              );
            }
          }).catch(
            (err) => logForDebugging7(
              `[bridge:title] failed to fetch title for ${compatSessionId}: ${err}`,
              { level: "error" }
            )
          );
          const timeoutMs = config.sessionTimeoutMs ?? DEFAULT_SESSION_TIMEOUT_MS;
          if (timeoutMs > 0) {
            const timer = setTimeout(
              onSessionTimeout,
              timeoutMs,
              sessionId,
              timeoutMs,
              logger,
              timedOutSessions,
              handle
            );
            sessionTimers.set(sessionId, timer);
          }
          if (useCcrV2) {
            v2Sessions.add(sessionId);
          }
          tokenRefresh?.schedule(sessionId, secret.session_ingress_token);
          void handle.done.then(onSessionDone(sessionId, startTime, handle));
          break;
        }
        default:
          await ackWork();
          logForDebugging7(
            `[bridge:work] Unknown work type: ${workType}, skipping`
          );
          break;
      }
      if (atCapacityBeforeSwitch) {
        const cap = capacityWake.signal();
        if (pollConfig.non_exclusive_heartbeat_interval_ms > 0) {
          await heartbeatActiveWorkItems();
          await sleep(
            pollConfig.non_exclusive_heartbeat_interval_ms,
            cap.signal
          );
        } else if (pollConfig.multisession_poll_interval_ms_at_capacity > 0) {
          await sleep(
            pollConfig.multisession_poll_interval_ms_at_capacity,
            cap.signal
          );
        }
        cap.cleanup();
      }
    } catch (err) {
      if (loopSignal.aborted) {
        break;
      }
      if (err instanceof BridgeFatalError) {
        fatalExit = true;
        if (isExpiredErrorType(err.errorType)) {
          logger.logStatus(err.message);
        } else if (isSuppressible403(err)) {
          logForDebugging7(`[bridge:work] Suppressed 403 error: ${err.message}`);
        } else {
          logger.logError(err.message);
          logError(err);
        }
        logEvent3("tengu_bridge_fatal_error", {
          status: err.status,
          error_type: err.errorType
        });
        logForDiagnosticsNoPII2(
          isExpiredErrorType(err.errorType) ? "info" : "error",
          "bridge_fatal_error",
          { status: err.status, error_type: err.errorType }
        );
        break;
      }
      const errMsg = describeAxiosError(err);
      if (isConnectionError(err) || isServerError(err)) {
        const now = Date.now();
        if (lastPollErrorTime !== null && now - lastPollErrorTime > pollSleepDetectionThresholdMs(backoffConfig)) {
          logForDebugging7(
            `[bridge:work] Detected system sleep (${Math.round((now - lastPollErrorTime) / 1e3)}s gap), resetting error budget`
          );
          logForDiagnosticsNoPII2("info", "bridge_poll_sleep_detected", {
            gapMs: now - lastPollErrorTime
          });
          connErrorStart = null;
          connBackoff = 0;
          generalErrorStart = null;
          generalBackoff = 0;
        }
        lastPollErrorTime = now;
        if (!connErrorStart) {
          connErrorStart = now;
        }
        const elapsed = now - connErrorStart;
        if (elapsed >= backoffConfig.connGiveUpMs) {
          logger.logError(
            `Server unreachable for ${Math.round(elapsed / 6e4)} minutes, giving up.`
          );
          logEvent3("tengu_bridge_poll_give_up", {
            error_type: "connection",
            elapsed_ms: elapsed
          });
          logForDiagnosticsNoPII2("error", "bridge_poll_give_up", {
            error_type: "connection",
            elapsed_ms: elapsed
          });
          fatalExit = true;
          break;
        }
        generalErrorStart = null;
        generalBackoff = 0;
        connBackoff = connBackoff ? Math.min(connBackoff * 2, backoffConfig.connCapMs) : backoffConfig.connInitialMs;
        const delay = addJitter(connBackoff);
        logger.logVerbose(
          `Connection error, retrying in ${formatDelay(delay)} (${Math.round(elapsed / 1e3)}s elapsed): ${errMsg}`
        );
        logger.updateReconnectingStatus(
          formatDelay(delay),
          formatDuration(elapsed)
        );
        if (getPollIntervalConfig().non_exclusive_heartbeat_interval_ms > 0) {
          await heartbeatActiveWorkItems();
        }
        await sleep(delay, loopSignal);
      } else {
        const now = Date.now();
        if (lastPollErrorTime !== null && now - lastPollErrorTime > pollSleepDetectionThresholdMs(backoffConfig)) {
          logForDebugging7(
            `[bridge:work] Detected system sleep (${Math.round((now - lastPollErrorTime) / 1e3)}s gap), resetting error budget`
          );
          logForDiagnosticsNoPII2("info", "bridge_poll_sleep_detected", {
            gapMs: now - lastPollErrorTime
          });
          connErrorStart = null;
          connBackoff = 0;
          generalErrorStart = null;
          generalBackoff = 0;
        }
        lastPollErrorTime = now;
        if (!generalErrorStart) {
          generalErrorStart = now;
        }
        const elapsed = now - generalErrorStart;
        if (elapsed >= backoffConfig.generalGiveUpMs) {
          logger.logError(
            `Persistent errors for ${Math.round(elapsed / 6e4)} minutes, giving up.`
          );
          logEvent3("tengu_bridge_poll_give_up", {
            error_type: "general",
            elapsed_ms: elapsed
          });
          logForDiagnosticsNoPII2("error", "bridge_poll_give_up", {
            error_type: "general",
            elapsed_ms: elapsed
          });
          fatalExit = true;
          break;
        }
        connErrorStart = null;
        connBackoff = 0;
        generalBackoff = generalBackoff ? Math.min(generalBackoff * 2, backoffConfig.generalCapMs) : backoffConfig.generalInitialMs;
        const delay = addJitter(generalBackoff);
        logger.logVerbose(
          `Poll failed, retrying in ${formatDelay(delay)} (${Math.round(elapsed / 1e3)}s elapsed): ${errMsg}`
        );
        logger.updateReconnectingStatus(
          formatDelay(delay),
          formatDuration(elapsed)
        );
        if (getPollIntervalConfig().non_exclusive_heartbeat_interval_ms > 0) {
          await heartbeatActiveWorkItems();
        }
        await sleep(delay, loopSignal);
      }
    }
  }
  stopStatusUpdates();
  logger.clearStatus();
  const loopDurationMs = Date.now() - loopStartTime;
  logEvent3("tengu_bridge_shutdown", {
    active_sessions: activeSessions.size,
    loop_duration_ms: loopDurationMs
  });
  logForDiagnosticsNoPII2("info", "bridge_shutdown", {
    active_sessions: activeSessions.size,
    loop_duration_ms: loopDurationMs
  });
  const sessionsToArchive = new Set(activeSessions.keys());
  if (initialSessionId) {
    sessionsToArchive.add(initialSessionId);
  }
  const compatIdSnapshot = new Map(sessionCompatIds);
  if (activeSessions.size > 0) {
    logForDebugging7(
      `[bridge:shutdown] Shutting down ${activeSessions.size} active session(s)`
    );
    logger.logStatus(
      `Shutting down ${activeSessions.size} active session(s)\u2026`
    );
    const shutdownWorkIds = new Map(sessionWorkIds);
    for (const [sessionId, handle] of activeSessions.entries()) {
      logForDebugging7(
        `[bridge:shutdown] Sending SIGTERM to sessionId=${sessionId}`
      );
      handle.kill();
    }
    const timeout = new AbortController();
    await Promise.race([
      Promise.allSettled([...activeSessions.values()].map((h) => h.done)),
      sleep(backoffConfig.shutdownGraceMs ?? 3e4, timeout.signal)
    ]);
    timeout.abort();
    for (const [sid, handle] of activeSessions.entries()) {
      logForDebugging7(`[bridge:shutdown] Force-killing stuck sessionId=${sid}`);
      handle.forceKill();
    }
    for (const timer of sessionTimers.values()) {
      clearTimeout(timer);
    }
    sessionTimers.clear();
    tokenRefresh?.cancelAll();
    if (sessionWorktrees.size > 0) {
      const remainingWorktrees = [...sessionWorktrees.values()];
      sessionWorktrees.clear();
      logForDebugging7(
        `[bridge:shutdown] Cleaning up ${remainingWorktrees.length} worktree(s)`
      );
      await Promise.allSettled(
        remainingWorktrees.map(
          (wt) => removeAgentWorktree(
            wt.worktreePath,
            wt.worktreeBranch,
            wt.gitRoot,
            wt.hookBased
          )
        )
      );
    }
    await Promise.allSettled(
      [...shutdownWorkIds.entries()].map(([sessionId, workId]) => {
        return api.stopWork(environmentId, workId, true).catch(
          (err) => logger.logVerbose(
            `Failed to stop work ${workId} for session ${sessionId}: ${errorMessage5(err)}`
          )
        );
      })
    );
  }
  if (pendingCleanups.size > 0) {
    await Promise.allSettled([...pendingCleanups]);
  }
  if (feature("KAIROS") && config.spawnMode === "single-session" && initialSessionId && !fatalExit) {
    logger.logStatus(
      `Resume this session by running \`claude remote-control --continue\``
    );
    logForDebugging7(
      `[bridge:shutdown] Skipping archive+deregister to allow resume of session ${initialSessionId}`
    );
    return;
  }
  if (sessionsToArchive.size > 0) {
    logForDebugging7(
      `[bridge:shutdown] Archiving ${sessionsToArchive.size} session(s)`
    );
    await Promise.allSettled(
      [...sessionsToArchive].map(
        (sessionId) => api.archiveSession(
          compatIdSnapshot.get(sessionId) ?? toCompatSessionId(sessionId)
        ).catch(
          (err) => logger.logVerbose(
            `Failed to archive session ${sessionId}: ${errorMessage5(err)}`
          )
        )
      )
    );
  }
  try {
    await api.deregisterEnvironment(environmentId);
    logForDebugging7(
      `[bridge:shutdown] Environment deregistered, bridge offline`
    );
    logger.logVerbose("Environment deregistered.");
  } catch (err) {
    logger.logVerbose(`Failed to deregister environment: ${errorMessage5(err)}`);
  }
  const { clearBridgePointer: clearBridgePointer2 } = await Promise.resolve().then(() => (init_bridgePointer(), bridgePointer_exports));
  await clearBridgePointer2(config.dir);
  logger.logVerbose("Environment offline.");
}
var CONNECTION_ERROR_CODES = /* @__PURE__ */ new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENETUNREACH",
  "EHOSTUNREACH"
]);
function isConnectionError(err) {
  if (err && typeof err === "object" && "code" in err && typeof err.code === "string" && CONNECTION_ERROR_CODES.has(err.code)) {
    return true;
  }
  return false;
}
function isServerError(err) {
  return !!err && typeof err === "object" && "code" in err && typeof err.code === "string" && err.code === "ERR_BAD_RESPONSE";
}
function addJitter(ms) {
  return Math.max(0, ms + ms * 0.25 * (2 * Math.random() - 1));
}
function formatDelay(ms) {
  return ms >= 1e3 ? `${(ms / 1e3).toFixed(1)}s` : `${Math.round(ms)}ms`;
}
async function stopWorkWithRetry(api, environmentId, workId, logger, baseDelayMs = 1e3) {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await api.stopWork(environmentId, workId, false);
      logForDebugging7(
        `[bridge:work] stopWork succeeded for workId=${workId} on attempt ${attempt}/${MAX_ATTEMPTS}`
      );
      return;
    } catch (err) {
      if (err instanceof BridgeFatalError) {
        if (isSuppressible403(err)) {
          logForDebugging7(
            `[bridge:work] Suppressed stopWork 403 for ${workId}: ${err.message}`
          );
        } else {
          logger.logError(`Failed to stop work ${workId}: ${err.message}`);
        }
        logForDiagnosticsNoPII2("error", "bridge_stop_work_failed", {
          attempts: attempt,
          fatal: true
        });
        return;
      }
      const errMsg = errorMessage5(err);
      if (attempt < MAX_ATTEMPTS) {
        const delay = addJitter(baseDelayMs * Math.pow(2, attempt - 1));
        logger.logVerbose(
          `Failed to stop work ${workId} (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${formatDelay(delay)}: ${errMsg}`
        );
        await sleep(delay);
      } else {
        logger.logError(
          `Failed to stop work ${workId} after ${MAX_ATTEMPTS} attempts: ${errMsg}`
        );
        logForDiagnosticsNoPII2("error", "bridge_stop_work_failed", {
          attempts: MAX_ATTEMPTS
        });
      }
    }
  }
}
function onSessionTimeout(sessionId, timeoutMs, logger, timedOutSessions, handle) {
  logForDebugging7(
    `[bridge:session] sessionId=${sessionId} timed out after ${formatDuration(timeoutMs)}`
  );
  logEvent3("tengu_bridge_session_timeout", {
    timeout_ms: timeoutMs
  });
  logger.logSessionFailed(
    sessionId,
    `Session timed out after ${formatDuration(timeoutMs)}`
  );
  timedOutSessions.add(sessionId);
  handle.kill();
}
var SPAWN_FLAG_VALUES = ["session", "same-dir", "worktree"];
function parseSpawnValue(raw) {
  if (raw === "session") return "single-session";
  if (raw === "same-dir") return "same-dir";
  if (raw === "worktree") return "worktree";
  return `--spawn requires one of: ${SPAWN_FLAG_VALUES.join(", ")} (got: ${raw ?? "<missing>"})`;
}
function parseCapacityValue(raw) {
  const n = raw === void 0 ? NaN : parseInt(raw, 10);
  if (isNaN(n) || n < 1) {
    return `--capacity requires a positive integer (got: ${raw ?? "<missing>"})`;
  }
  return n;
}
function parseArgs(args2) {
  let verbose = false;
  let sandbox = false;
  let debugFile;
  let sessionTimeoutMs;
  let permissionMode;
  let name;
  let help = false;
  let spawnMode;
  let capacity;
  let createSessionInDir;
  let sessionId;
  let continueSession = false;
  for (let i = 0; i < args2.length; i++) {
    const arg = args2[i];
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg === "--verbose" || arg === "-v") {
      verbose = true;
    } else if (arg === "--sandbox") {
      sandbox = true;
    } else if (arg === "--no-sandbox") {
      sandbox = false;
    } else if (arg === "--debug-file" && i + 1 < args2.length) {
      debugFile = resolve(args2[++i]);
    } else if (arg.startsWith("--debug-file=")) {
      debugFile = resolve(arg.slice("--debug-file=".length));
    } else if (arg === "--session-timeout" && i + 1 < args2.length) {
      sessionTimeoutMs = parseInt(args2[++i], 10) * 1e3;
    } else if (arg.startsWith("--session-timeout=")) {
      sessionTimeoutMs = parseInt(arg.slice("--session-timeout=".length), 10) * 1e3;
    } else if (arg === "--permission-mode" && i + 1 < args2.length) {
      permissionMode = args2[++i];
    } else if (arg.startsWith("--permission-mode=")) {
      permissionMode = arg.slice("--permission-mode=".length);
    } else if (arg === "--name" && i + 1 < args2.length) {
      name = args2[++i];
    } else if (arg.startsWith("--name=")) {
      name = arg.slice("--name=".length);
    } else if (feature("KAIROS") && arg === "--session-id" && i + 1 < args2.length) {
      sessionId = args2[++i];
      if (!sessionId) {
        return makeError("--session-id requires a value");
      }
    } else if (feature("KAIROS") && arg.startsWith("--session-id=")) {
      sessionId = arg.slice("--session-id=".length);
      if (!sessionId) {
        return makeError("--session-id requires a value");
      }
    } else if (feature("KAIROS") && (arg === "--continue" || arg === "-c")) {
      continueSession = true;
    } else if (arg === "--spawn" || arg.startsWith("--spawn=")) {
      if (spawnMode !== void 0) {
        return makeError("--spawn may only be specified once");
      }
      const raw = arg.startsWith("--spawn=") ? arg.slice("--spawn=".length) : args2[++i];
      const v = parseSpawnValue(raw);
      if (v === "single-session" || v === "same-dir" || v === "worktree") {
        spawnMode = v;
      } else {
        return makeError(v);
      }
    } else if (arg === "--capacity" || arg.startsWith("--capacity=")) {
      if (capacity !== void 0) {
        return makeError("--capacity may only be specified once");
      }
      const raw = arg.startsWith("--capacity=") ? arg.slice("--capacity=".length) : args2[++i];
      const v = parseCapacityValue(raw);
      if (typeof v === "number") capacity = v;
      else return makeError(v);
    } else if (arg === "--create-session-in-dir") {
      createSessionInDir = true;
    } else if (arg === "--no-create-session-in-dir") {
      createSessionInDir = false;
    } else {
      return makeError(
        `Unknown argument: ${arg}
Run 'claude remote-control --help' for usage.`
      );
    }
  }
  if (spawnMode === "single-session" && capacity !== void 0) {
    return makeError(
      `--capacity cannot be used with --spawn=session (single-session mode has fixed capacity 1).`
    );
  }
  if ((sessionId || continueSession) && (spawnMode !== void 0 || capacity !== void 0 || createSessionInDir !== void 0)) {
    return makeError(
      `--session-id and --continue cannot be used with --spawn, --capacity, or --create-session-in-dir.`
    );
  }
  if (sessionId && continueSession) {
    return makeError(`--session-id and --continue cannot be used together.`);
  }
  return {
    verbose,
    sandbox,
    debugFile,
    sessionTimeoutMs,
    permissionMode,
    name,
    spawnMode,
    capacity,
    createSessionInDir,
    sessionId,
    continueSession,
    help
  };
  function makeError(error) {
    return {
      verbose,
      sandbox,
      debugFile,
      sessionTimeoutMs,
      permissionMode,
      name,
      spawnMode,
      capacity,
      createSessionInDir,
      sessionId,
      continueSession,
      help,
      error
    };
  }
}
async function printHelp() {
  const { EXTERNAL_PERMISSION_MODES } = await import("../types/permissions.js");
  const modes = EXTERNAL_PERMISSION_MODES.join(", ");
  const showServer = await isMultiSessionSpawnEnabled();
  const serverOptions = showServer ? `  --spawn <mode>                   Spawn mode: same-dir, worktree, session
                                   (default: same-dir)
  --capacity <N>                   Max concurrent sessions in worktree or
                                   same-dir mode (default: ${SPAWN_SESSIONS_DEFAULT})
  --[no-]create-session-in-dir     Pre-create a session in the current
                                   directory; in worktree mode this session
                                   stays in cwd while on-demand sessions get
                                   isolated worktrees (default: on)
` : "";
  const serverDescription = showServer ? `
  Remote Control runs as a persistent server that accepts multiple concurrent
  sessions in the current directory. One session is pre-created on start so
  you have somewhere to type immediately. Use --spawn=worktree to isolate
  each on-demand session in its own git worktree, or --spawn=session for
  the classic single-session mode (exits when that session ends). Press 'w'
  during runtime to toggle between same-dir and worktree.
` : "";
  const serverNote = showServer ? `  - Worktree mode requires a git repository or WorktreeCreate/WorktreeRemove hooks
` : "";
  const help = `
Remote Control - Connect your local environment to claude.ai/code

USAGE
  claude remote-control [options]
OPTIONS
  --name <name>                    Name for the session (shown in claude.ai/code)
${feature("KAIROS") ? `  -c, --continue                   Resume the last session in this directory
  --session-id <id>                Resume a specific session by ID (cannot be
                                   used with spawn flags or --continue)
` : ""}  --permission-mode <mode>         Permission mode for spawned sessions
                                   (${modes})
  --debug-file <path>              Write debug logs to file
  -v, --verbose                    Enable verbose output
  -h, --help                       Show this help
${serverOptions}
DESCRIPTION
  Remote Control allows you to control sessions on your local device from
  claude.ai/code (https://claude.ai/code). Run this command in the
  directory you want to work in, then connect from the Claude app or web.
${serverDescription}
NOTES
  - You must be logged in with a Claude account that has a subscription
  - Run \`claude\` first in the directory to accept the workspace trust dialog
${serverNote}`;
  console.log(help);
}
var TITLE_MAX_LEN = 80;
function deriveSessionTitle(text) {
  const flat = text.replace(/\s+/g, " ").trim();
  return truncateToWidth2(flat, TITLE_MAX_LEN);
}
async function fetchSessionTitle(compatSessionId, baseUrl) {
  const { getBridgeSession: getBridgeSession2 } = await Promise.resolve().then(() => (init_createSession(), createSession_exports));
  const session = await getBridgeSession2(compatSessionId, { baseUrl });
  return session?.title || void 0;
}
async function bridgeMain(args2) {
  const parsed = parseArgs(args2);
  if (parsed.help) {
    await printHelp();
    return;
  }
  if (parsed.error) {
    console.error(`Error: ${parsed.error}`);
    process.exit(1);
  }
  const {
    verbose,
    sandbox,
    debugFile,
    sessionTimeoutMs,
    permissionMode,
    name,
    spawnMode: parsedSpawnMode,
    capacity: parsedCapacity,
    createSessionInDir: parsedCreateSessionInDir,
    sessionId: parsedSessionId,
    continueSession
  } = parsed;
  let resumeSessionId = parsedSessionId;
  let resumePointerDir;
  const usedMultiSessionFeature = parsedSpawnMode !== void 0 || parsedCapacity !== void 0 || parsedCreateSessionInDir !== void 0;
  if (permissionMode !== void 0) {
    const { PERMISSION_MODES } = await import("../types/permissions.js");
    const valid = PERMISSION_MODES;
    if (!valid.includes(permissionMode)) {
      console.error(
        `Error: Invalid permission mode '${permissionMode}'. Valid modes: ${valid.join(", ")}`
      );
      process.exit(1);
    }
  }
  const dir = resolve(".");
  const { enableConfigs, checkHasTrustDialogAccepted } = await import("../utils/config.js");
  enableConfigs();
  const { initSinks } = await import("../utils/sinks.js");
  initSinks();
  const multiSessionEnabled = await isMultiSessionSpawnEnabled();
  if (usedMultiSessionFeature && !multiSessionEnabled) {
    await logEventAsync("tengu_bridge_multi_session_denied", {
      used_spawn: parsedSpawnMode !== void 0,
      used_capacity: parsedCapacity !== void 0,
      used_create_session_in_dir: parsedCreateSessionInDir !== void 0
    });
    await Promise.race([
      Promise.all([shutdown1PEventLogging(), shutdownDatadog()]),
      sleep(500, void 0, { unref: true })
    ]).catch(() => {
    });
    console.error(
      "Error: Multi-session Remote Control is not enabled for your account yet."
    );
    process.exit(1);
  }
  const { setOriginalCwd, setCwdState } = await import("../bootstrap/state.js");
  setOriginalCwd(dir);
  setCwdState(dir);
  if (!checkHasTrustDialogAccepted()) {
    console.error(
      `Error: Workspace not trusted. Please run \`claude\` in ${dir} first to review and accept the workspace trust dialog.`
    );
    process.exit(1);
  }
  const { clearOAuthTokenCache, checkAndRefreshOAuthTokenIfNeeded } = await import("../utils/auth.js");
  const { getBridgeAccessToken: getBridgeAccessToken2, getBridgeBaseUrl: getBridgeBaseUrl2 } = await Promise.resolve().then(() => (init_bridgeConfig(), bridgeConfig_exports));
  const bridgeToken = getBridgeAccessToken2();
  if (!bridgeToken) {
    console.error(BRIDGE_LOGIN_ERROR);
    process.exit(1);
  }
  const {
    getGlobalConfig,
    saveGlobalConfig,
    getCurrentProjectConfig,
    saveCurrentProjectConfig
  } = await import("../utils/config.js");
  if (!getGlobalConfig().remoteDialogSeen) {
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    console.log(
      "\nRemote Control lets you access this CLI session from the web (claude.ai/code)\nor the Claude app, so you can pick up where you left off on any device.\n\nYou can disconnect remote access anytime by running /remote-control again.\n"
    );
    const answer = await new Promise((resolve2) => {
      rl.question("Enable Remote Control? (y/n) ", resolve2);
    });
    rl.close();
    saveGlobalConfig((current) => {
      if (current.remoteDialogSeen) return current;
      return { ...current, remoteDialogSeen: true };
    });
    if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
      process.exit(0);
    }
  }
  if (feature("KAIROS") && continueSession) {
    const { readBridgePointerAcrossWorktrees: readBridgePointerAcrossWorktrees2 } = await Promise.resolve().then(() => (init_bridgePointer(), bridgePointer_exports));
    const found = await readBridgePointerAcrossWorktrees2(dir);
    if (!found) {
      console.error(
        `Error: No recent session found in this directory or its worktrees. Run \`claude remote-control\` to start a new one.`
      );
      process.exit(1);
    }
    const { pointer, dir: pointerDir } = found;
    const ageMin = Math.round(pointer.ageMs / 6e4);
    const ageStr = ageMin < 60 ? `${ageMin}m` : `${Math.round(ageMin / 60)}h`;
    const fromWt = pointerDir !== dir ? ` from worktree ${pointerDir}` : "";
    console.error(
      `Resuming session ${pointer.sessionId} (${ageStr} ago)${fromWt}\u2026`
    );
    resumeSessionId = pointer.sessionId;
    resumePointerDir = pointerDir;
  }
  const baseUrl = getBridgeBaseUrl2();
  if (baseUrl.startsWith("http://") && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1")) {
    console.error(
      "Error: Remote Control base URL uses HTTP. Only HTTPS or localhost HTTP is allowed."
    );
    process.exit(1);
  }
  const sessionIngressUrl = process.env.USER_TYPE === "ant" && process.env.CLAUDE_BRIDGE_SESSION_INGRESS_URL ? process.env.CLAUDE_BRIDGE_SESSION_INGRESS_URL : baseUrl;
  const { getBranch, getRemoteUrl, findGitRoot } = await import("../utils/git.js");
  const { hasWorktreeCreateHook } = await import("../utils/hooks.js");
  const worktreeAvailable = hasWorktreeCreateHook() || findGitRoot(dir) !== null;
  let savedSpawnMode = multiSessionEnabled ? getCurrentProjectConfig().remoteControlSpawnMode : void 0;
  if (savedSpawnMode === "worktree" && !worktreeAvailable) {
    console.error(
      "Warning: Saved spawn mode is worktree but this directory is not a git repository. Falling back to same-dir."
    );
    savedSpawnMode = void 0;
    saveCurrentProjectConfig((current) => {
      if (current.remoteControlSpawnMode === void 0) return current;
      return { ...current, remoteControlSpawnMode: void 0 };
    });
  }
  if (multiSessionEnabled && !savedSpawnMode && worktreeAvailable && parsedSpawnMode === void 0 && !resumeSessionId && process.stdin.isTTY) {
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    console.log(
      `
Claude Remote Control is launching in spawn mode which lets you create new sessions in this project from Claude Code on Web or your Mobile app. Learn more here: https://code.claude.com/docs/en/remote-control

Spawn mode for this project:
  [1] same-dir \u2014 sessions share the current directory (default)
  [2] worktree \u2014 each session gets an isolated git worktree

This can be changed later or explicitly set with --spawn=same-dir or --spawn=worktree.
`
    );
    const answer = await new Promise((resolve2) => {
      rl.question("Choose [1/2] (default: 1): ", resolve2);
    });
    rl.close();
    const chosen = answer.trim() === "2" ? "worktree" : "same-dir";
    savedSpawnMode = chosen;
    logEvent3("tengu_bridge_spawn_mode_chosen", {
      spawn_mode: chosen
    });
    saveCurrentProjectConfig((current) => {
      if (current.remoteControlSpawnMode === chosen) return current;
      return { ...current, remoteControlSpawnMode: chosen };
    });
  }
  let spawnModeSource;
  let spawnMode;
  if (resumeSessionId) {
    spawnMode = "single-session";
    spawnModeSource = "resume";
  } else if (parsedSpawnMode !== void 0) {
    spawnMode = parsedSpawnMode;
    spawnModeSource = "flag";
  } else if (savedSpawnMode !== void 0) {
    spawnMode = savedSpawnMode;
    spawnModeSource = "saved";
  } else {
    spawnMode = multiSessionEnabled ? "same-dir" : "single-session";
    spawnModeSource = "gate_default";
  }
  const maxSessions = spawnMode === "single-session" ? 1 : parsedCapacity ?? SPAWN_SESSIONS_DEFAULT;
  const preCreateSession = parsedCreateSessionInDir ?? true;
  if (!resumeSessionId) {
    const { clearBridgePointer: clearBridgePointer2 } = await Promise.resolve().then(() => (init_bridgePointer(), bridgePointer_exports));
    await clearBridgePointer2(dir);
  }
  if (spawnMode === "worktree" && !worktreeAvailable) {
    console.error(
      `Error: Worktree mode requires a git repository or WorktreeCreate hooks configured. Use --spawn=session for single-session mode.`
    );
    process.exit(1);
  }
  const branch = await getBranch();
  const gitRepoUrl = await getRemoteUrl();
  const machineName = hostname();
  const bridgeId = randomUUID();
  const { handleOAuth401Error } = await import("../utils/auth.js");
  const api = createBridgeApiClient({
    baseUrl,
    getAccessToken: getBridgeAccessToken2,
    runnerVersion: MACRO.VERSION,
    onDebug: logForDebugging7,
    onAuth401: handleOAuth401Error,
    getTrustedDeviceToken
  });
  let reuseEnvironmentId;
  if (feature("KAIROS") && resumeSessionId) {
    try {
      validateBridgeId(resumeSessionId, "sessionId");
    } catch {
      console.error(
        `Error: Invalid session ID "${resumeSessionId}". Session IDs must not contain unsafe characters.`
      );
      process.exit(1);
    }
    await checkAndRefreshOAuthTokenIfNeeded();
    clearOAuthTokenCache();
    const { getBridgeSession: getBridgeSession2 } = await Promise.resolve().then(() => (init_createSession(), createSession_exports));
    const session = await getBridgeSession2(resumeSessionId, {
      baseUrl,
      getAccessToken: getBridgeAccessToken2
    });
    if (!session) {
      if (resumePointerDir) {
        const { clearBridgePointer: clearBridgePointer2 } = await Promise.resolve().then(() => (init_bridgePointer(), bridgePointer_exports));
        await clearBridgePointer2(resumePointerDir);
      }
      console.error(
        `Error: Session ${resumeSessionId} not found. It may have been archived or expired, or your login may have lapsed (run \`claude /login\`).`
      );
      process.exit(1);
    }
    if (!session.environment_id) {
      if (resumePointerDir) {
        const { clearBridgePointer: clearBridgePointer2 } = await Promise.resolve().then(() => (init_bridgePointer(), bridgePointer_exports));
        await clearBridgePointer2(resumePointerDir);
      }
      console.error(
        `Error: Session ${resumeSessionId} has no environment_id. It may never have been attached to a bridge.`
      );
      process.exit(1);
    }
    reuseEnvironmentId = session.environment_id;
    logForDebugging7(
      `[bridge:init] Resuming session ${resumeSessionId} on environment ${reuseEnvironmentId}`
    );
  }
  const config = {
    dir,
    machineName,
    branch,
    gitRepoUrl,
    maxSessions,
    spawnMode,
    verbose,
    sandbox,
    bridgeId,
    workerType: "claude_code",
    environmentId: randomUUID(),
    reuseEnvironmentId,
    apiBaseUrl: baseUrl,
    sessionIngressUrl,
    debugFile,
    sessionTimeoutMs
  };
  logForDebugging7(
    `[bridge:init] bridgeId=${bridgeId}${reuseEnvironmentId ? ` reuseEnvironmentId=${reuseEnvironmentId}` : ""} dir=${dir} branch=${branch} gitRepoUrl=${gitRepoUrl} machine=${machineName}`
  );
  logForDebugging7(
    `[bridge:init] apiBaseUrl=${baseUrl} sessionIngressUrl=${sessionIngressUrl}`
  );
  logForDebugging7(
    `[bridge:init] sandbox=${sandbox}${debugFile ? ` debugFile=${debugFile}` : ""}`
  );
  let environmentId;
  let environmentSecret;
  try {
    const reg = await api.registerBridgeEnvironment(config);
    environmentId = reg.environment_id;
    environmentSecret = reg.environment_secret;
  } catch (err) {
    logEvent3("tengu_bridge_registration_failed", {
      status: err instanceof BridgeFatalError ? err.status : void 0
    });
    console.error(
      err instanceof BridgeFatalError && err.status === 404 ? "Remote Control environments are not available for your account." : `Error: ${errorMessage5(err)}`
    );
    process.exit(1);
  }
  let effectiveResumeSessionId;
  if (feature("KAIROS") && resumeSessionId) {
    if (reuseEnvironmentId && environmentId !== reuseEnvironmentId) {
      logError(
        new Error(
          `Bridge resume env mismatch: requested ${reuseEnvironmentId}, backend returned ${environmentId}. Falling back to fresh session.`
        )
      );
      console.warn(
        `Warning: Could not resume session ${resumeSessionId} \u2014 its environment has expired. Creating a fresh session instead.`
      );
    } else {
      const infraResumeId = toInfraSessionId(resumeSessionId);
      const reconnectCandidates = infraResumeId === resumeSessionId ? [resumeSessionId] : [resumeSessionId, infraResumeId];
      let reconnected = false;
      let lastReconnectErr;
      for (const candidateId of reconnectCandidates) {
        try {
          await api.reconnectSession(environmentId, candidateId);
          logForDebugging7(
            `[bridge:init] Session ${candidateId} re-queued via bridge/reconnect`
          );
          effectiveResumeSessionId = resumeSessionId;
          reconnected = true;
          break;
        } catch (err) {
          lastReconnectErr = err;
          logForDebugging7(
            `[bridge:init] reconnectSession(${candidateId}) failed: ${errorMessage5(err)}`
          );
        }
      }
      if (!reconnected) {
        const err = lastReconnectErr;
        const isFatal = err instanceof BridgeFatalError;
        if (resumePointerDir && isFatal) {
          const { clearBridgePointer: clearBridgePointer2 } = await Promise.resolve().then(() => (init_bridgePointer(), bridgePointer_exports));
          await clearBridgePointer2(resumePointerDir);
        }
        console.error(
          isFatal ? `Error: ${errorMessage5(err)}` : `Error: Failed to reconnect session ${resumeSessionId}: ${errorMessage5(err)}
The session may still be resumable \u2014 try running the same command again.`
        );
        process.exit(1);
      }
    }
  }
  logForDebugging7(
    `[bridge:init] Registered, server environmentId=${environmentId}`
  );
  const startupPollConfig = getPollIntervalConfig();
  logEvent3("tengu_bridge_started", {
    max_sessions: config.maxSessions,
    has_debug_file: !!config.debugFile,
    sandbox: config.sandbox,
    verbose: config.verbose,
    heartbeat_interval_ms: startupPollConfig.non_exclusive_heartbeat_interval_ms,
    spawn_mode: config.spawnMode,
    spawn_mode_source: spawnModeSource,
    multi_session_gate: multiSessionEnabled,
    pre_create_session: preCreateSession,
    worktree_available: worktreeAvailable
  });
  logForDiagnosticsNoPII2("info", "bridge_started", {
    max_sessions: config.maxSessions,
    sandbox: config.sandbox,
    spawn_mode: config.spawnMode
  });
  const spawner = createSessionSpawner({
    execPath: process.execPath,
    scriptArgs: spawnScriptArgs(),
    env: process.env,
    verbose,
    sandbox,
    debugFile,
    permissionMode,
    onDebug: logForDebugging7,
    onActivity: (sessionId, activity) => {
      logForDebugging7(
        `[bridge:activity] sessionId=${sessionId} ${activity.type} ${activity.summary}`
      );
    },
    onPermissionRequest: (sessionId, request, _accessToken) => {
      logForDebugging7(
        `[bridge:perm] sessionId=${sessionId} tool=${request.request.tool_name} request_id=${request.request_id} (not auto-approving)`
      );
    }
  });
  const logger = createBridgeLogger({ verbose });
  const { parseGitHubRepository } = await import("../utils/detectRepository.js");
  const ownerRepo = gitRepoUrl ? parseGitHubRepository(gitRepoUrl) : null;
  const repoName = ownerRepo ? ownerRepo.split("/").pop() : basename(dir);
  logger.setRepoInfo(repoName, branch);
  const toggleAvailable = spawnMode !== "single-session" && worktreeAvailable;
  if (toggleAvailable) {
    logger.setSpawnModeDisplay(spawnMode);
  }
  const onStdinData = (data) => {
    if (data[0] === 3 || data[0] === 4) {
      process.emit("SIGINT");
      return;
    }
    if (data[0] === 32) {
      logger.toggleQr();
      return;
    }
    if (data[0] === 119) {
      if (!toggleAvailable) return;
      const newMode = config.spawnMode === "same-dir" ? "worktree" : "same-dir";
      config.spawnMode = newMode;
      logEvent3("tengu_bridge_spawn_mode_toggled", {
        spawn_mode: newMode
      });
      logger.logStatus(
        newMode === "worktree" ? "Spawn mode: worktree (new sessions get isolated git worktrees)" : "Spawn mode: same-dir (new sessions share the current directory)"
      );
      logger.setSpawnModeDisplay(newMode);
      logger.refreshDisplay();
      saveCurrentProjectConfig((current) => {
        if (current.remoteControlSpawnMode === newMode) return current;
        return { ...current, remoteControlSpawnMode: newMode };
      });
      return;
    }
  };
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onStdinData);
  }
  const controller = new AbortController();
  const onSigint = () => {
    logForDebugging7("[bridge:shutdown] SIGINT received, shutting down");
    controller.abort();
  };
  const onSigterm = () => {
    logForDebugging7("[bridge:shutdown] SIGTERM received, shutting down");
    controller.abort();
  };
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);
  let initialSessionId = feature("KAIROS") && effectiveResumeSessionId ? effectiveResumeSessionId : null;
  if (preCreateSession && !(feature("KAIROS") && effectiveResumeSessionId)) {
    const { createBridgeSession: createBridgeSession2 } = await Promise.resolve().then(() => (init_createSession(), createSession_exports));
    try {
      initialSessionId = await createBridgeSession2({
        environmentId,
        title: name,
        events: [],
        gitRepoUrl,
        branch,
        signal: controller.signal,
        baseUrl,
        getAccessToken: getBridgeAccessToken2,
        permissionMode
      });
      if (initialSessionId) {
        logForDebugging7(
          `[bridge:init] Created initial session ${initialSessionId}`
        );
      }
    } catch (err) {
      logForDebugging7(
        `[bridge:init] Session creation failed (non-fatal): ${errorMessage5(err)}`
      );
    }
  }
  let pointerRefreshTimer = null;
  if (initialSessionId && spawnMode === "single-session") {
    const { writeBridgePointer: writeBridgePointer2 } = await Promise.resolve().then(() => (init_bridgePointer(), bridgePointer_exports));
    const pointerPayload = {
      sessionId: initialSessionId,
      environmentId,
      source: "standalone"
    };
    await writeBridgePointer2(config.dir, pointerPayload);
    pointerRefreshTimer = setInterval(
      writeBridgePointer2,
      60 * 60 * 1e3,
      config.dir,
      pointerPayload
    );
    pointerRefreshTimer.unref?.();
  }
  try {
    await runBridgeLoop(
      config,
      environmentId,
      environmentSecret,
      api,
      spawner,
      logger,
      controller.signal,
      void 0,
      initialSessionId ?? void 0,
      async () => {
        clearOAuthTokenCache();
        await checkAndRefreshOAuthTokenIfNeeded();
        return getBridgeAccessToken2();
      }
    );
  } finally {
    if (pointerRefreshTimer !== null) {
      clearInterval(pointerRefreshTimer);
    }
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    process.stdin.off("data", onStdinData);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
  }
  process.exit(0);
}
var BridgeHeadlessPermanentError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "BridgeHeadlessPermanentError";
  }
};
async function runBridgeHeadless(opts, signal) {
  const { dir, log } = opts;
  process.chdir(dir);
  const { setOriginalCwd, setCwdState } = await import("../bootstrap/state.js");
  setOriginalCwd(dir);
  setCwdState(dir);
  const { enableConfigs, checkHasTrustDialogAccepted } = await import("../utils/config.js");
  enableConfigs();
  const { initSinks } = await import("../utils/sinks.js");
  initSinks();
  if (!checkHasTrustDialogAccepted()) {
    throw new BridgeHeadlessPermanentError(
      `Workspace not trusted: ${dir}. Run \`claude\` in that directory first to accept the trust dialog.`
    );
  }
  if (!opts.getAccessToken()) {
    throw new Error(BRIDGE_LOGIN_ERROR);
  }
  const { getBridgeBaseUrl: getBridgeBaseUrl2 } = await Promise.resolve().then(() => (init_bridgeConfig(), bridgeConfig_exports));
  const baseUrl = getBridgeBaseUrl2();
  if (baseUrl.startsWith("http://") && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1")) {
    throw new BridgeHeadlessPermanentError(
      "Remote Control base URL uses HTTP. Only HTTPS or localhost HTTP is allowed."
    );
  }
  const sessionIngressUrl = process.env.USER_TYPE === "ant" && process.env.CLAUDE_BRIDGE_SESSION_INGRESS_URL ? process.env.CLAUDE_BRIDGE_SESSION_INGRESS_URL : baseUrl;
  const { getBranch, getRemoteUrl, findGitRoot } = await import("../utils/git.js");
  const { hasWorktreeCreateHook } = await import("../utils/hooks.js");
  if (opts.spawnMode === "worktree") {
    const worktreeAvailable = hasWorktreeCreateHook() || findGitRoot(dir) !== null;
    if (!worktreeAvailable) {
      throw new BridgeHeadlessPermanentError(
        `Worktree mode requires a git repository or WorktreeCreate hooks. Directory ${dir} has neither.`
      );
    }
  }
  const branch = await getBranch();
  const gitRepoUrl = await getRemoteUrl();
  const machineName = hostname();
  const bridgeId = randomUUID();
  const config = {
    dir,
    machineName,
    branch,
    gitRepoUrl,
    maxSessions: opts.capacity,
    spawnMode: opts.spawnMode,
    verbose: false,
    sandbox: opts.sandbox,
    bridgeId,
    workerType: "claude_code",
    environmentId: randomUUID(),
    apiBaseUrl: baseUrl,
    sessionIngressUrl,
    sessionTimeoutMs: opts.sessionTimeoutMs
  };
  const api = createBridgeApiClient({
    baseUrl,
    getAccessToken: opts.getAccessToken,
    runnerVersion: MACRO.VERSION,
    onDebug: log,
    onAuth401: opts.onAuth401,
    getTrustedDeviceToken
  });
  let environmentId;
  let environmentSecret;
  try {
    const reg = await api.registerBridgeEnvironment(config);
    environmentId = reg.environment_id;
    environmentSecret = reg.environment_secret;
  } catch (err) {
    throw new Error(`Bridge registration failed: ${errorMessage5(err)}`);
  }
  const spawner = createSessionSpawner({
    execPath: process.execPath,
    scriptArgs: spawnScriptArgs(),
    env: process.env,
    verbose: false,
    sandbox: opts.sandbox,
    permissionMode: opts.permissionMode,
    onDebug: log
  });
  const logger = createHeadlessBridgeLogger(log);
  logger.printBanner(config, environmentId);
  let initialSessionId;
  if (opts.createSessionOnStart) {
    const { createBridgeSession: createBridgeSession2 } = await Promise.resolve().then(() => (init_createSession(), createSession_exports));
    try {
      const sid = await createBridgeSession2({
        environmentId,
        title: opts.name,
        events: [],
        gitRepoUrl,
        branch,
        signal,
        baseUrl,
        getAccessToken: opts.getAccessToken,
        permissionMode: opts.permissionMode
      });
      if (sid) {
        initialSessionId = sid;
        log(`created initial session ${sid}`);
      }
    } catch (err) {
      log(`session pre-creation failed (non-fatal): ${errorMessage5(err)}`);
    }
  }
  await runBridgeLoop(
    config,
    environmentId,
    environmentSecret,
    api,
    spawner,
    logger,
    signal,
    void 0,
    initialSessionId,
    async () => opts.getAccessToken()
  );
}
function createHeadlessBridgeLogger(log) {
  const noop = () => {
  };
  return {
    printBanner: (cfg, envId) => log(
      `registered environmentId=${envId} dir=${cfg.dir} spawnMode=${cfg.spawnMode} capacity=${cfg.maxSessions}`
    ),
    logSessionStart: (id, _prompt) => log(`session start ${id}`),
    logSessionComplete: (id, ms) => log(`session complete ${id} (${ms}ms)`),
    logSessionFailed: (id, err) => log(`session failed ${id}: ${err}`),
    logStatus: log,
    logVerbose: log,
    logError: (s) => log(`error: ${s}`),
    logReconnected: (ms) => log(`reconnected after ${ms}ms`),
    addSession: (id, _url) => log(`session attached ${id}`),
    removeSession: (id) => log(`session detached ${id}`),
    updateIdleStatus: noop,
    updateReconnectingStatus: noop,
    updateSessionStatus: noop,
    updateSessionActivity: noop,
    updateSessionCount: noop,
    updateFailedStatus: noop,
    setSpawnModeDisplay: noop,
    setRepoInfo: noop,
    setDebugLogPath: noop,
    setAttached: noop,
    setSessionTitle: noop,
    clearStatus: noop,
    toggleQr: noop,
    refreshDisplay: noop
  };
}
var args = process.argv.slice(2);
if (args.length > 0 && (args[0] === "--help" || args[0] === "-h")) {
  bridgeMain(args).catch(console.error);
}
export {
  BridgeHeadlessPermanentError,
  bridgeMain,
  isConnectionError,
  isServerError,
  parseArgs,
  runBridgeHeadless,
  runBridgeLoop
};
