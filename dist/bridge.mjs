var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// claude-code-deps/bun-bundle-stub.ts
function feature(_key) {
  return false;
}
var init_bun_bundle_stub = __esm({
  "claude-code-deps/bun-bundle-stub.ts"() {
  }
});

// claude-code-deps/services/analytics/index.ts
function logEvent(_event, _metadata) {
}
function logEventAsync(_event, _metadata) {
  return Promise.resolve();
}
var init_analytics = __esm({
  "claude-code-deps/services/analytics/index.ts"() {
  }
});

// claude-code-deps/utils/crypto.ts
import { randomUUID } from "crypto";
var init_crypto = __esm({
  "claude-code-deps/utils/crypto.ts"() {
  }
});

// claude-code-deps/utils/settings/settingsCache.ts
function resetSettingsCache() {
  sessionSettingsCache = null;
  perSourceCache.clear();
  parseFileCache.clear();
}
var sessionSettingsCache, perSourceCache, parseFileCache;
var init_settingsCache = __esm({
  "claude-code-deps/utils/settings/settingsCache.ts"() {
    sessionSettingsCache = null;
    perSourceCache = /* @__PURE__ */ new Map();
    parseFileCache = /* @__PURE__ */ new Map();
  }
});

// claude-code-deps/utils/signal.ts
function createSignal() {
  const listeners = /* @__PURE__ */ new Set();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(...args2) {
      for (const listener of listeners) listener(...args2);
    },
    clear() {
      listeners.clear();
    }
  };
}
var init_signal = __esm({
  "claude-code-deps/utils/signal.ts"() {
  }
});

// claude-code-deps/bootstrap/state.ts
var state_exports = {};
__export(state_exports, {
  addInvokedSkill: () => addInvokedSkill,
  addSessionCronTask: () => addSessionCronTask,
  addSlowOperation: () => addSlowOperation,
  addToInMemoryErrorLog: () => addToInMemoryErrorLog,
  addToToolDuration: () => addToToolDuration,
  addToTotalCostState: () => addToTotalCostState,
  addToTotalDurationState: () => addToTotalDurationState,
  addToTotalLinesChanged: () => addToTotalLinesChanged,
  addToTurnClassifierDuration: () => addToTurnClassifierDuration,
  addToTurnHookDuration: () => addToTurnHookDuration,
  clearBetaHeaderLatches: () => clearBetaHeaderLatches,
  clearInvokedSkills: () => clearInvokedSkills,
  clearInvokedSkillsForAgent: () => clearInvokedSkillsForAgent,
  clearRegisteredHooks: () => clearRegisteredHooks,
  clearRegisteredPluginHooks: () => clearRegisteredPluginHooks,
  clearSystemPromptSectionState: () => clearSystemPromptSectionState,
  consumePostCompaction: () => consumePostCompaction,
  flushInteractionTime: () => flushInteractionTime,
  getActiveTimeCounter: () => getActiveTimeCounter,
  getAdditionalDirectoriesForClaudeMd: () => getAdditionalDirectoriesForClaudeMd,
  getAfkModeHeaderLatched: () => getAfkModeHeaderLatched,
  getAgentColorMap: () => getAgentColorMap,
  getAllowedChannels: () => getAllowedChannels,
  getAllowedSettingSources: () => getAllowedSettingSources,
  getApiKeyFromFd: () => getApiKeyFromFd,
  getBudgetContinuationCount: () => getBudgetContinuationCount,
  getCacheEditingHeaderLatched: () => getCacheEditingHeaderLatched,
  getCachedClaudeMdContent: () => getCachedClaudeMdContent,
  getChromeFlagOverride: () => getChromeFlagOverride,
  getClientType: () => getClientType,
  getCodeEditToolDecisionCounter: () => getCodeEditToolDecisionCounter,
  getCommitCounter: () => getCommitCounter,
  getCostCounter: () => getCostCounter,
  getCurrentTurnTokenBudget: () => getCurrentTurnTokenBudget,
  getCwdState: () => getCwdState,
  getDirectConnectServerUrl: () => getDirectConnectServerUrl,
  getEventLogger: () => getEventLogger,
  getFastModeHeaderLatched: () => getFastModeHeaderLatched,
  getFlagSettingsInline: () => getFlagSettingsInline,
  getFlagSettingsPath: () => getFlagSettingsPath,
  getHasDevChannels: () => getHasDevChannels,
  getInitJsonSchema: () => getInitJsonSchema,
  getInitialMainLoopModel: () => getInitialMainLoopModel,
  getInlinePlugins: () => getInlinePlugins,
  getInvokedSkills: () => getInvokedSkills,
  getInvokedSkillsForAgent: () => getInvokedSkillsForAgent,
  getIsInteractive: () => getIsInteractive,
  getIsNonInteractiveSession: () => getIsNonInteractiveSession,
  getIsRemoteMode: () => getIsRemoteMode,
  getIsScrollDraining: () => getIsScrollDraining,
  getKairosActive: () => getKairosActive,
  getLastAPIRequest: () => getLastAPIRequest,
  getLastAPIRequestMessages: () => getLastAPIRequestMessages,
  getLastApiCompletionTimestamp: () => getLastApiCompletionTimestamp,
  getLastClassifierRequests: () => getLastClassifierRequests,
  getLastEmittedDate: () => getLastEmittedDate,
  getLastInteractionTime: () => getLastInteractionTime,
  getLastMainRequestId: () => getLastMainRequestId,
  getLocCounter: () => getLocCounter,
  getLoggerProvider: () => getLoggerProvider,
  getMainLoopModelOverride: () => getMainLoopModelOverride,
  getMainThreadAgentType: () => getMainThreadAgentType,
  getMeter: () => getMeter,
  getMeterProvider: () => getMeterProvider,
  getModelStrings: () => getModelStrings,
  getModelUsage: () => getModelUsage,
  getOauthTokenFromFd: () => getOauthTokenFromFd,
  getOriginalCwd: () => getOriginalCwd,
  getParentSessionId: () => getParentSessionId,
  getPlanSlugCache: () => getPlanSlugCache,
  getPrCounter: () => getPrCounter,
  getProjectRoot: () => getProjectRoot,
  getPromptCache1hAllowlist: () => getPromptCache1hAllowlist,
  getPromptCache1hEligible: () => getPromptCache1hEligible,
  getPromptId: () => getPromptId,
  getQuestionPreviewFormat: () => getQuestionPreviewFormat,
  getRegisteredHooks: () => getRegisteredHooks,
  getScheduledTasksEnabled: () => getScheduledTasksEnabled,
  getSdkAgentProgressSummariesEnabled: () => getSdkAgentProgressSummariesEnabled,
  getSdkBetas: () => getSdkBetas,
  getSessionBypassPermissionsMode: () => getSessionBypassPermissionsMode,
  getSessionCounter: () => getSessionCounter,
  getSessionCreatedTeams: () => getSessionCreatedTeams,
  getSessionCronTasks: () => getSessionCronTasks,
  getSessionId: () => getSessionId,
  getSessionIngressToken: () => getSessionIngressToken,
  getSessionProjectDir: () => getSessionProjectDir,
  getSessionSource: () => getSessionSource,
  getSessionTrustAccepted: () => getSessionTrustAccepted,
  getSlowOperations: () => getSlowOperations,
  getStatsStore: () => getStatsStore,
  getStrictToolResultPairing: () => getStrictToolResultPairing,
  getSystemPromptSectionCache: () => getSystemPromptSectionCache,
  getTeleportedSessionInfo: () => getTeleportedSessionInfo,
  getThinkingClearLatched: () => getThinkingClearLatched,
  getTokenCounter: () => getTokenCounter,
  getTotalAPIDuration: () => getTotalAPIDuration,
  getTotalAPIDurationWithoutRetries: () => getTotalAPIDurationWithoutRetries,
  getTotalCacheCreationInputTokens: () => getTotalCacheCreationInputTokens,
  getTotalCacheReadInputTokens: () => getTotalCacheReadInputTokens,
  getTotalCostUSD: () => getTotalCostUSD,
  getTotalDuration: () => getTotalDuration,
  getTotalInputTokens: () => getTotalInputTokens,
  getTotalLinesAdded: () => getTotalLinesAdded,
  getTotalLinesRemoved: () => getTotalLinesRemoved,
  getTotalOutputTokens: () => getTotalOutputTokens,
  getTotalToolDuration: () => getTotalToolDuration,
  getTotalWebSearchRequests: () => getTotalWebSearchRequests,
  getTracerProvider: () => getTracerProvider,
  getTurnClassifierCount: () => getTurnClassifierCount,
  getTurnClassifierDurationMs: () => getTurnClassifierDurationMs,
  getTurnHookCount: () => getTurnHookCount,
  getTurnHookDurationMs: () => getTurnHookDurationMs,
  getTurnOutputTokens: () => getTurnOutputTokens,
  getTurnToolCount: () => getTurnToolCount,
  getTurnToolDurationMs: () => getTurnToolDurationMs,
  getUsageForModel: () => getUsageForModel,
  getUseCoworkPlugins: () => getUseCoworkPlugins,
  getUserMsgOptIn: () => getUserMsgOptIn,
  handleAutoModeTransition: () => handleAutoModeTransition,
  handlePlanModeTransition: () => handlePlanModeTransition,
  hasExitedPlanModeInSession: () => hasExitedPlanModeInSession,
  hasShownLspRecommendationThisSession: () => hasShownLspRecommendationThisSession,
  hasUnknownModelCost: () => hasUnknownModelCost,
  incrementBudgetContinuationCount: () => incrementBudgetContinuationCount,
  isSessionPersistenceDisabled: () => isSessionPersistenceDisabled,
  markFirstTeleportMessageLogged: () => markFirstTeleportMessageLogged,
  markPostCompaction: () => markPostCompaction,
  markScrollActivity: () => markScrollActivity,
  needsAutoModeExitAttachment: () => needsAutoModeExitAttachment,
  needsPlanModeExitAttachment: () => needsPlanModeExitAttachment,
  onSessionSwitch: () => onSessionSwitch,
  preferThirdPartyAuthentication: () => preferThirdPartyAuthentication,
  regenerateSessionId: () => regenerateSessionId,
  registerHookCallbacks: () => registerHookCallbacks,
  removeSessionCronTasks: () => removeSessionCronTasks,
  resetCostState: () => resetCostState,
  resetModelStringsForTestingOnly: () => resetModelStringsForTestingOnly,
  resetSdkInitState: () => resetSdkInitState,
  resetStateForTests: () => resetStateForTests,
  resetTotalDurationStateAndCost_FOR_TESTS_ONLY: () => resetTotalDurationStateAndCost_FOR_TESTS_ONLY,
  resetTurnClassifierDuration: () => resetTurnClassifierDuration,
  resetTurnHookDuration: () => resetTurnHookDuration,
  resetTurnToolDuration: () => resetTurnToolDuration,
  setAdditionalDirectoriesForClaudeMd: () => setAdditionalDirectoriesForClaudeMd,
  setAfkModeHeaderLatched: () => setAfkModeHeaderLatched,
  setAllowedChannels: () => setAllowedChannels,
  setAllowedSettingSources: () => setAllowedSettingSources,
  setApiKeyFromFd: () => setApiKeyFromFd,
  setCacheEditingHeaderLatched: () => setCacheEditingHeaderLatched,
  setCachedClaudeMdContent: () => setCachedClaudeMdContent,
  setChromeFlagOverride: () => setChromeFlagOverride,
  setClientType: () => setClientType,
  setCostStateForRestore: () => setCostStateForRestore,
  setCwdState: () => setCwdState,
  setDirectConnectServerUrl: () => setDirectConnectServerUrl,
  setEventLogger: () => setEventLogger,
  setFastModeHeaderLatched: () => setFastModeHeaderLatched,
  setFlagSettingsInline: () => setFlagSettingsInline,
  setFlagSettingsPath: () => setFlagSettingsPath,
  setHasDevChannels: () => setHasDevChannels,
  setHasExitedPlanMode: () => setHasExitedPlanMode,
  setHasUnknownModelCost: () => setHasUnknownModelCost,
  setInitJsonSchema: () => setInitJsonSchema,
  setInitialMainLoopModel: () => setInitialMainLoopModel,
  setInlinePlugins: () => setInlinePlugins,
  setIsInteractive: () => setIsInteractive,
  setIsRemoteMode: () => setIsRemoteMode,
  setKairosActive: () => setKairosActive,
  setLastAPIRequest: () => setLastAPIRequest,
  setLastAPIRequestMessages: () => setLastAPIRequestMessages,
  setLastApiCompletionTimestamp: () => setLastApiCompletionTimestamp,
  setLastClassifierRequests: () => setLastClassifierRequests,
  setLastEmittedDate: () => setLastEmittedDate,
  setLastMainRequestId: () => setLastMainRequestId,
  setLoggerProvider: () => setLoggerProvider,
  setLspRecommendationShownThisSession: () => setLspRecommendationShownThisSession,
  setMainLoopModelOverride: () => setMainLoopModelOverride,
  setMainThreadAgentType: () => setMainThreadAgentType,
  setMeter: () => setMeter,
  setMeterProvider: () => setMeterProvider,
  setModelStrings: () => setModelStrings,
  setNeedsAutoModeExitAttachment: () => setNeedsAutoModeExitAttachment,
  setNeedsPlanModeExitAttachment: () => setNeedsPlanModeExitAttachment,
  setOauthTokenFromFd: () => setOauthTokenFromFd,
  setOriginalCwd: () => setOriginalCwd,
  setProjectRoot: () => setProjectRoot,
  setPromptCache1hAllowlist: () => setPromptCache1hAllowlist,
  setPromptCache1hEligible: () => setPromptCache1hEligible,
  setPromptId: () => setPromptId,
  setQuestionPreviewFormat: () => setQuestionPreviewFormat,
  setScheduledTasksEnabled: () => setScheduledTasksEnabled,
  setSdkAgentProgressSummariesEnabled: () => setSdkAgentProgressSummariesEnabled,
  setSdkBetas: () => setSdkBetas,
  setSessionBypassPermissionsMode: () => setSessionBypassPermissionsMode,
  setSessionIngressToken: () => setSessionIngressToken,
  setSessionPersistenceDisabled: () => setSessionPersistenceDisabled,
  setSessionSource: () => setSessionSource,
  setSessionTrustAccepted: () => setSessionTrustAccepted,
  setStatsStore: () => setStatsStore,
  setStrictToolResultPairing: () => setStrictToolResultPairing,
  setSystemPromptSectionCacheEntry: () => setSystemPromptSectionCacheEntry,
  setTeleportedSessionInfo: () => setTeleportedSessionInfo,
  setThinkingClearLatched: () => setThinkingClearLatched,
  setTracerProvider: () => setTracerProvider,
  setUseCoworkPlugins: () => setUseCoworkPlugins,
  setUserMsgOptIn: () => setUserMsgOptIn,
  snapshotOutputTokensForTurn: () => snapshotOutputTokensForTurn,
  switchSession: () => switchSession,
  updateLastInteractionTime: () => updateLastInteractionTime,
  waitForScrollIdle: () => waitForScrollIdle
});
import { realpathSync } from "fs";
import sumBy from "lodash-es/sumBy.js";
import { cwd } from "process";
function getInitialState() {
  let resolvedCwd = "";
  if (typeof process !== "undefined" && typeof process.cwd === "function" && typeof realpathSync === "function") {
    const rawCwd = cwd();
    try {
      resolvedCwd = realpathSync(rawCwd).normalize("NFC");
    } catch {
      resolvedCwd = rawCwd.normalize("NFC");
    }
  }
  const state = {
    originalCwd: resolvedCwd,
    projectRoot: resolvedCwd,
    totalCostUSD: 0,
    totalAPIDuration: 0,
    totalAPIDurationWithoutRetries: 0,
    totalToolDuration: 0,
    turnHookDurationMs: 0,
    turnToolDurationMs: 0,
    turnClassifierDurationMs: 0,
    turnToolCount: 0,
    turnHookCount: 0,
    turnClassifierCount: 0,
    startTime: Date.now(),
    lastInteractionTime: Date.now(),
    totalLinesAdded: 0,
    totalLinesRemoved: 0,
    hasUnknownModelCost: false,
    cwd: resolvedCwd,
    modelUsage: {},
    mainLoopModelOverride: void 0,
    initialMainLoopModel: null,
    modelStrings: null,
    isInteractive: false,
    kairosActive: false,
    strictToolResultPairing: false,
    sdkAgentProgressSummariesEnabled: false,
    userMsgOptIn: false,
    clientType: "cli",
    sessionSource: void 0,
    questionPreviewFormat: void 0,
    sessionIngressToken: void 0,
    oauthTokenFromFd: void 0,
    apiKeyFromFd: void 0,
    flagSettingsPath: void 0,
    flagSettingsInline: null,
    allowedSettingSources: [
      "userSettings",
      "projectSettings",
      "localSettings",
      "flagSettings",
      "policySettings"
    ],
    // Telemetry state
    meter: null,
    sessionCounter: null,
    locCounter: null,
    prCounter: null,
    commitCounter: null,
    costCounter: null,
    tokenCounter: null,
    codeEditToolDecisionCounter: null,
    activeTimeCounter: null,
    statsStore: null,
    sessionId: randomUUID(),
    parentSessionId: void 0,
    // Logger state
    loggerProvider: null,
    eventLogger: null,
    // Meter provider state
    meterProvider: null,
    tracerProvider: null,
    // Agent color state
    agentColorMap: /* @__PURE__ */ new Map(),
    agentColorIndex: 0,
    // Last API request for bug reports
    lastAPIRequest: null,
    lastAPIRequestMessages: null,
    // Last auto-mode classifier request(s) for /share transcript
    lastClassifierRequests: null,
    cachedClaudeMdContent: null,
    // In-memory error log for recent errors
    inMemoryErrorLog: [],
    // Session-only plugins from --plugin-dir flag
    inlinePlugins: [],
    // Explicit --chrome / --no-chrome flag value (undefined = not set on CLI)
    chromeFlagOverride: void 0,
    // Use cowork_plugins directory instead of plugins
    useCoworkPlugins: false,
    // Session-only bypass permissions mode flag (not persisted)
    sessionBypassPermissionsMode: false,
    // Scheduled tasks disabled until flag or dialog enables them
    scheduledTasksEnabled: false,
    sessionCronTasks: [],
    sessionCreatedTeams: /* @__PURE__ */ new Set(),
    // Session-only trust flag (not persisted to disk)
    sessionTrustAccepted: false,
    // Session-only flag to disable session persistence to disk
    sessionPersistenceDisabled: false,
    // Track if user has exited plan mode in this session
    hasExitedPlanMode: false,
    // Track if we need to show the plan mode exit attachment
    needsPlanModeExitAttachment: false,
    // Track if we need to show the auto mode exit attachment
    needsAutoModeExitAttachment: false,
    // Track if LSP plugin recommendation has been shown this session
    lspRecommendationShownThisSession: false,
    // SDK init event state
    initJsonSchema: null,
    registeredHooks: null,
    // Cache for plan slugs
    planSlugCache: /* @__PURE__ */ new Map(),
    // Track teleported session for reliability logging
    teleportedSessionInfo: null,
    // Track invoked skills for preservation across compaction
    invokedSkills: /* @__PURE__ */ new Map(),
    // Track slow operations for dev bar display
    slowOperations: [],
    // SDK-provided betas
    sdkBetas: void 0,
    // Main thread agent type
    mainThreadAgentType: void 0,
    // Remote mode
    isRemoteMode: false,
    ...process.env.USER_TYPE === "ant" ? {
      replBridgeActive: false
    } : {},
    // Direct connect server URL
    directConnectServerUrl: void 0,
    // System prompt section cache state
    systemPromptSectionCache: /* @__PURE__ */ new Map(),
    // Last date emitted to the model
    lastEmittedDate: null,
    // Additional directories from --add-dir flag (for CLAUDE.md loading)
    additionalDirectoriesForClaudeMd: [],
    // Channel server allowlist from --channels flag
    allowedChannels: [],
    hasDevChannels: false,
    // Session project dir (null = derive from originalCwd)
    sessionProjectDir: null,
    // Prompt cache 1h allowlist (null = not yet fetched from GrowthBook)
    promptCache1hAllowlist: null,
    // Prompt cache 1h eligibility (null = not yet evaluated)
    promptCache1hEligible: null,
    // Beta header latches (null = not yet triggered)
    afkModeHeaderLatched: null,
    fastModeHeaderLatched: null,
    cacheEditingHeaderLatched: null,
    thinkingClearLatched: null,
    // Current prompt ID
    promptId: null,
    lastMainRequestId: void 0,
    lastApiCompletionTimestamp: null,
    pendingPostCompaction: false
  };
  return state;
}
function getSessionId() {
  return STATE.sessionId;
}
function regenerateSessionId(options = {}) {
  if (options.setCurrentAsParent) {
    STATE.parentSessionId = STATE.sessionId;
  }
  STATE.planSlugCache.delete(STATE.sessionId);
  STATE.sessionId = randomUUID();
  STATE.sessionProjectDir = null;
  return STATE.sessionId;
}
function getParentSessionId() {
  return STATE.parentSessionId;
}
function switchSession(sessionId, projectDir = null) {
  STATE.planSlugCache.delete(STATE.sessionId);
  STATE.sessionId = sessionId;
  STATE.sessionProjectDir = projectDir;
  sessionSwitched.emit(sessionId);
}
function getSessionProjectDir() {
  return STATE.sessionProjectDir;
}
function getOriginalCwd() {
  return STATE.originalCwd;
}
function getProjectRoot() {
  return STATE.projectRoot;
}
function setOriginalCwd(cwd2) {
  STATE.originalCwd = cwd2.normalize("NFC");
}
function setProjectRoot(cwd2) {
  STATE.projectRoot = cwd2.normalize("NFC");
}
function getCwdState() {
  return STATE.cwd;
}
function setCwdState(cwd2) {
  STATE.cwd = cwd2.normalize("NFC");
}
function getDirectConnectServerUrl() {
  return STATE.directConnectServerUrl;
}
function setDirectConnectServerUrl(url) {
  STATE.directConnectServerUrl = url;
}
function addToTotalDurationState(duration, durationWithoutRetries) {
  STATE.totalAPIDuration += duration;
  STATE.totalAPIDurationWithoutRetries += durationWithoutRetries;
}
function resetTotalDurationStateAndCost_FOR_TESTS_ONLY() {
  STATE.totalAPIDuration = 0;
  STATE.totalAPIDurationWithoutRetries = 0;
  STATE.totalCostUSD = 0;
}
function addToTotalCostState(cost, modelUsage, model) {
  STATE.modelUsage[model] = modelUsage;
  STATE.totalCostUSD += cost;
}
function getTotalCostUSD() {
  return STATE.totalCostUSD;
}
function getTotalAPIDuration() {
  return STATE.totalAPIDuration;
}
function getTotalDuration() {
  return Date.now() - STATE.startTime;
}
function getTotalAPIDurationWithoutRetries() {
  return STATE.totalAPIDurationWithoutRetries;
}
function getTotalToolDuration() {
  return STATE.totalToolDuration;
}
function addToToolDuration(duration) {
  STATE.totalToolDuration += duration;
  STATE.turnToolDurationMs += duration;
  STATE.turnToolCount++;
}
function getTurnHookDurationMs() {
  return STATE.turnHookDurationMs;
}
function addToTurnHookDuration(duration) {
  STATE.turnHookDurationMs += duration;
  STATE.turnHookCount++;
}
function resetTurnHookDuration() {
  STATE.turnHookDurationMs = 0;
  STATE.turnHookCount = 0;
}
function getTurnHookCount() {
  return STATE.turnHookCount;
}
function getTurnToolDurationMs() {
  return STATE.turnToolDurationMs;
}
function resetTurnToolDuration() {
  STATE.turnToolDurationMs = 0;
  STATE.turnToolCount = 0;
}
function getTurnToolCount() {
  return STATE.turnToolCount;
}
function getTurnClassifierDurationMs() {
  return STATE.turnClassifierDurationMs;
}
function addToTurnClassifierDuration(duration) {
  STATE.turnClassifierDurationMs += duration;
  STATE.turnClassifierCount++;
}
function resetTurnClassifierDuration() {
  STATE.turnClassifierDurationMs = 0;
  STATE.turnClassifierCount = 0;
}
function getTurnClassifierCount() {
  return STATE.turnClassifierCount;
}
function getStatsStore() {
  return STATE.statsStore;
}
function setStatsStore(store) {
  STATE.statsStore = store;
}
function updateLastInteractionTime(immediate) {
  if (immediate) {
    flushInteractionTime_inner();
  } else {
    interactionTimeDirty = true;
  }
}
function flushInteractionTime() {
  if (interactionTimeDirty) {
    flushInteractionTime_inner();
  }
}
function flushInteractionTime_inner() {
  STATE.lastInteractionTime = Date.now();
  interactionTimeDirty = false;
}
function addToTotalLinesChanged(added, removed) {
  STATE.totalLinesAdded += added;
  STATE.totalLinesRemoved += removed;
}
function getTotalLinesAdded() {
  return STATE.totalLinesAdded;
}
function getTotalLinesRemoved() {
  return STATE.totalLinesRemoved;
}
function getTotalInputTokens() {
  return sumBy(Object.values(STATE.modelUsage), "inputTokens");
}
function getTotalOutputTokens() {
  return sumBy(Object.values(STATE.modelUsage), "outputTokens");
}
function getTotalCacheReadInputTokens() {
  return sumBy(Object.values(STATE.modelUsage), "cacheReadInputTokens");
}
function getTotalCacheCreationInputTokens() {
  return sumBy(Object.values(STATE.modelUsage), "cacheCreationInputTokens");
}
function getTotalWebSearchRequests() {
  return sumBy(Object.values(STATE.modelUsage), "webSearchRequests");
}
function getTurnOutputTokens() {
  return getTotalOutputTokens() - outputTokensAtTurnStart;
}
function getCurrentTurnTokenBudget() {
  return currentTurnTokenBudget;
}
function snapshotOutputTokensForTurn(budget) {
  outputTokensAtTurnStart = getTotalOutputTokens();
  currentTurnTokenBudget = budget;
  budgetContinuationCount = 0;
}
function getBudgetContinuationCount() {
  return budgetContinuationCount;
}
function incrementBudgetContinuationCount() {
  budgetContinuationCount++;
}
function setHasUnknownModelCost() {
  STATE.hasUnknownModelCost = true;
}
function hasUnknownModelCost() {
  return STATE.hasUnknownModelCost;
}
function getLastMainRequestId() {
  return STATE.lastMainRequestId;
}
function setLastMainRequestId(requestId) {
  STATE.lastMainRequestId = requestId;
}
function getLastApiCompletionTimestamp() {
  return STATE.lastApiCompletionTimestamp;
}
function setLastApiCompletionTimestamp(timestamp2) {
  STATE.lastApiCompletionTimestamp = timestamp2;
}
function markPostCompaction() {
  STATE.pendingPostCompaction = true;
}
function consumePostCompaction() {
  const was = STATE.pendingPostCompaction;
  STATE.pendingPostCompaction = false;
  return was;
}
function getLastInteractionTime() {
  return STATE.lastInteractionTime;
}
function markScrollActivity() {
  scrollDraining = true;
  if (scrollDrainTimer) clearTimeout(scrollDrainTimer);
  scrollDrainTimer = setTimeout(() => {
    scrollDraining = false;
    scrollDrainTimer = void 0;
  }, SCROLL_DRAIN_IDLE_MS);
  scrollDrainTimer.unref?.();
}
function getIsScrollDraining() {
  return scrollDraining;
}
async function waitForScrollIdle() {
  while (scrollDraining) {
    await new Promise((r) => setTimeout(r, SCROLL_DRAIN_IDLE_MS).unref?.());
  }
}
function getModelUsage() {
  return STATE.modelUsage;
}
function getUsageForModel(model) {
  return STATE.modelUsage[model];
}
function getMainLoopModelOverride() {
  return STATE.mainLoopModelOverride;
}
function getInitialMainLoopModel() {
  return STATE.initialMainLoopModel;
}
function setMainLoopModelOverride(model) {
  STATE.mainLoopModelOverride = model;
}
function setInitialMainLoopModel(model) {
  STATE.initialMainLoopModel = model;
}
function getSdkBetas() {
  return STATE.sdkBetas;
}
function setSdkBetas(betas) {
  STATE.sdkBetas = betas;
}
function resetCostState() {
  STATE.totalCostUSD = 0;
  STATE.totalAPIDuration = 0;
  STATE.totalAPIDurationWithoutRetries = 0;
  STATE.totalToolDuration = 0;
  STATE.startTime = Date.now();
  STATE.totalLinesAdded = 0;
  STATE.totalLinesRemoved = 0;
  STATE.hasUnknownModelCost = false;
  STATE.modelUsage = {};
  STATE.promptId = null;
}
function setCostStateForRestore({
  totalCostUSD,
  totalAPIDuration,
  totalAPIDurationWithoutRetries,
  totalToolDuration,
  totalLinesAdded,
  totalLinesRemoved,
  lastDuration,
  modelUsage
}) {
  STATE.totalCostUSD = totalCostUSD;
  STATE.totalAPIDuration = totalAPIDuration;
  STATE.totalAPIDurationWithoutRetries = totalAPIDurationWithoutRetries;
  STATE.totalToolDuration = totalToolDuration;
  STATE.totalLinesAdded = totalLinesAdded;
  STATE.totalLinesRemoved = totalLinesRemoved;
  if (modelUsage) {
    STATE.modelUsage = modelUsage;
  }
  if (lastDuration) {
    STATE.startTime = Date.now() - lastDuration;
  }
}
function resetStateForTests() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("resetStateForTests can only be called in tests");
  }
  Object.entries(getInitialState()).forEach(([key, value]) => {
    STATE[key] = value;
  });
  outputTokensAtTurnStart = 0;
  currentTurnTokenBudget = null;
  budgetContinuationCount = 0;
  sessionSwitched.clear();
}
function getModelStrings() {
  return STATE.modelStrings;
}
function setModelStrings(modelStrings) {
  STATE.modelStrings = modelStrings;
}
function resetModelStringsForTestingOnly() {
  STATE.modelStrings = null;
}
function setMeter(meter, createCounter) {
  STATE.meter = meter;
  STATE.sessionCounter = createCounter("claude_code.session.count", {
    description: "Count of CLI sessions started"
  });
  STATE.locCounter = createCounter("claude_code.lines_of_code.count", {
    description: "Count of lines of code modified, with the 'type' attribute indicating whether lines were added or removed"
  });
  STATE.prCounter = createCounter("claude_code.pull_request.count", {
    description: "Number of pull requests created"
  });
  STATE.commitCounter = createCounter("claude_code.commit.count", {
    description: "Number of git commits created"
  });
  STATE.costCounter = createCounter("claude_code.cost.usage", {
    description: "Cost of the Claude Code session",
    unit: "USD"
  });
  STATE.tokenCounter = createCounter("claude_code.token.usage", {
    description: "Number of tokens used",
    unit: "tokens"
  });
  STATE.codeEditToolDecisionCounter = createCounter(
    "claude_code.code_edit_tool.decision",
    {
      description: "Count of code editing tool permission decisions (accept/reject) for Edit, Write, and NotebookEdit tools"
    }
  );
  STATE.activeTimeCounter = createCounter("claude_code.active_time.total", {
    description: "Total active time in seconds",
    unit: "s"
  });
}
function getMeter() {
  return STATE.meter;
}
function getSessionCounter() {
  return STATE.sessionCounter;
}
function getLocCounter() {
  return STATE.locCounter;
}
function getPrCounter() {
  return STATE.prCounter;
}
function getCommitCounter() {
  return STATE.commitCounter;
}
function getCostCounter() {
  return STATE.costCounter;
}
function getTokenCounter() {
  return STATE.tokenCounter;
}
function getCodeEditToolDecisionCounter() {
  return STATE.codeEditToolDecisionCounter;
}
function getActiveTimeCounter() {
  return STATE.activeTimeCounter;
}
function getLoggerProvider() {
  return STATE.loggerProvider;
}
function setLoggerProvider(provider) {
  STATE.loggerProvider = provider;
}
function getEventLogger() {
  return STATE.eventLogger;
}
function setEventLogger(logger) {
  STATE.eventLogger = logger;
}
function getMeterProvider() {
  return STATE.meterProvider;
}
function setMeterProvider(provider) {
  STATE.meterProvider = provider;
}
function getTracerProvider() {
  return STATE.tracerProvider;
}
function setTracerProvider(provider) {
  STATE.tracerProvider = provider;
}
function getIsNonInteractiveSession() {
  return !STATE.isInteractive;
}
function getIsInteractive() {
  return STATE.isInteractive;
}
function setIsInteractive(value) {
  STATE.isInteractive = value;
}
function getClientType() {
  return STATE.clientType;
}
function setClientType(type) {
  STATE.clientType = type;
}
function getSdkAgentProgressSummariesEnabled() {
  return STATE.sdkAgentProgressSummariesEnabled;
}
function setSdkAgentProgressSummariesEnabled(value) {
  STATE.sdkAgentProgressSummariesEnabled = value;
}
function getKairosActive() {
  return STATE.kairosActive;
}
function setKairosActive(value) {
  STATE.kairosActive = value;
}
function getStrictToolResultPairing() {
  return STATE.strictToolResultPairing;
}
function setStrictToolResultPairing(value) {
  STATE.strictToolResultPairing = value;
}
function getUserMsgOptIn() {
  return STATE.userMsgOptIn;
}
function setUserMsgOptIn(value) {
  STATE.userMsgOptIn = value;
}
function getSessionSource() {
  return STATE.sessionSource;
}
function setSessionSource(source) {
  STATE.sessionSource = source;
}
function getQuestionPreviewFormat() {
  return STATE.questionPreviewFormat;
}
function setQuestionPreviewFormat(format) {
  STATE.questionPreviewFormat = format;
}
function getAgentColorMap() {
  return STATE.agentColorMap;
}
function getFlagSettingsPath() {
  return STATE.flagSettingsPath;
}
function setFlagSettingsPath(path) {
  STATE.flagSettingsPath = path;
}
function getFlagSettingsInline() {
  return STATE.flagSettingsInline;
}
function setFlagSettingsInline(settings) {
  STATE.flagSettingsInline = settings;
}
function getSessionIngressToken() {
  return STATE.sessionIngressToken;
}
function setSessionIngressToken(token) {
  STATE.sessionIngressToken = token;
}
function getOauthTokenFromFd() {
  return STATE.oauthTokenFromFd;
}
function setOauthTokenFromFd(token) {
  STATE.oauthTokenFromFd = token;
}
function getApiKeyFromFd() {
  return STATE.apiKeyFromFd;
}
function setApiKeyFromFd(key) {
  STATE.apiKeyFromFd = key;
}
function setLastAPIRequest(params) {
  STATE.lastAPIRequest = params;
}
function getLastAPIRequest() {
  return STATE.lastAPIRequest;
}
function setLastAPIRequestMessages(messages) {
  STATE.lastAPIRequestMessages = messages;
}
function getLastAPIRequestMessages() {
  return STATE.lastAPIRequestMessages;
}
function setLastClassifierRequests(requests) {
  STATE.lastClassifierRequests = requests;
}
function getLastClassifierRequests() {
  return STATE.lastClassifierRequests;
}
function setCachedClaudeMdContent(content) {
  STATE.cachedClaudeMdContent = content;
}
function getCachedClaudeMdContent() {
  return STATE.cachedClaudeMdContent;
}
function addToInMemoryErrorLog(errorInfo) {
  const MAX_IN_MEMORY_ERRORS = 100;
  if (STATE.inMemoryErrorLog.length >= MAX_IN_MEMORY_ERRORS) {
    STATE.inMemoryErrorLog.shift();
  }
  STATE.inMemoryErrorLog.push(errorInfo);
}
function getAllowedSettingSources() {
  return STATE.allowedSettingSources;
}
function setAllowedSettingSources(sources) {
  STATE.allowedSettingSources = sources;
}
function preferThirdPartyAuthentication() {
  return getIsNonInteractiveSession() && STATE.clientType !== "claude-vscode";
}
function setInlinePlugins(plugins) {
  STATE.inlinePlugins = plugins;
}
function getInlinePlugins() {
  return STATE.inlinePlugins;
}
function setChromeFlagOverride(value) {
  STATE.chromeFlagOverride = value;
}
function getChromeFlagOverride() {
  return STATE.chromeFlagOverride;
}
function setUseCoworkPlugins(value) {
  STATE.useCoworkPlugins = value;
  resetSettingsCache();
}
function getUseCoworkPlugins() {
  return STATE.useCoworkPlugins;
}
function setSessionBypassPermissionsMode(enabled) {
  STATE.sessionBypassPermissionsMode = enabled;
}
function getSessionBypassPermissionsMode() {
  return STATE.sessionBypassPermissionsMode;
}
function setScheduledTasksEnabled(enabled) {
  STATE.scheduledTasksEnabled = enabled;
}
function getScheduledTasksEnabled() {
  return STATE.scheduledTasksEnabled;
}
function getSessionCronTasks() {
  return STATE.sessionCronTasks;
}
function addSessionCronTask(task) {
  STATE.sessionCronTasks.push(task);
}
function removeSessionCronTasks(ids) {
  if (ids.length === 0) return 0;
  const idSet = new Set(ids);
  const remaining = STATE.sessionCronTasks.filter((t) => !idSet.has(t.id));
  const removed = STATE.sessionCronTasks.length - remaining.length;
  if (removed === 0) return 0;
  STATE.sessionCronTasks = remaining;
  return removed;
}
function setSessionTrustAccepted(accepted) {
  STATE.sessionTrustAccepted = accepted;
}
function getSessionTrustAccepted() {
  return STATE.sessionTrustAccepted;
}
function setSessionPersistenceDisabled(disabled) {
  STATE.sessionPersistenceDisabled = disabled;
}
function isSessionPersistenceDisabled() {
  return STATE.sessionPersistenceDisabled;
}
function hasExitedPlanModeInSession() {
  return STATE.hasExitedPlanMode;
}
function setHasExitedPlanMode(value) {
  STATE.hasExitedPlanMode = value;
}
function needsPlanModeExitAttachment() {
  return STATE.needsPlanModeExitAttachment;
}
function setNeedsPlanModeExitAttachment(value) {
  STATE.needsPlanModeExitAttachment = value;
}
function handlePlanModeTransition(fromMode, toMode) {
  if (toMode === "plan" && fromMode !== "plan") {
    STATE.needsPlanModeExitAttachment = false;
  }
  if (fromMode === "plan" && toMode !== "plan") {
    STATE.needsPlanModeExitAttachment = true;
  }
}
function needsAutoModeExitAttachment() {
  return STATE.needsAutoModeExitAttachment;
}
function setNeedsAutoModeExitAttachment(value) {
  STATE.needsAutoModeExitAttachment = value;
}
function handleAutoModeTransition(fromMode, toMode) {
  if (fromMode === "auto" && toMode === "plan" || fromMode === "plan" && toMode === "auto") {
    return;
  }
  const fromIsAuto = fromMode === "auto";
  const toIsAuto = toMode === "auto";
  if (toIsAuto && !fromIsAuto) {
    STATE.needsAutoModeExitAttachment = false;
  }
  if (fromIsAuto && !toIsAuto) {
    STATE.needsAutoModeExitAttachment = true;
  }
}
function hasShownLspRecommendationThisSession() {
  return STATE.lspRecommendationShownThisSession;
}
function setLspRecommendationShownThisSession(value) {
  STATE.lspRecommendationShownThisSession = value;
}
function setInitJsonSchema(schema) {
  STATE.initJsonSchema = schema;
}
function getInitJsonSchema() {
  return STATE.initJsonSchema;
}
function registerHookCallbacks(hooks) {
  if (!STATE.registeredHooks) {
    STATE.registeredHooks = {};
  }
  for (const [event, matchers] of Object.entries(hooks)) {
    const eventKey = event;
    if (!STATE.registeredHooks[eventKey]) {
      STATE.registeredHooks[eventKey] = [];
    }
    STATE.registeredHooks[eventKey].push(...matchers);
  }
}
function getRegisteredHooks() {
  return STATE.registeredHooks;
}
function clearRegisteredHooks() {
  STATE.registeredHooks = null;
}
function clearRegisteredPluginHooks() {
  if (!STATE.registeredHooks) {
    return;
  }
  const filtered = {};
  for (const [event, matchers] of Object.entries(STATE.registeredHooks)) {
    const callbackHooks = matchers.filter((m) => !("pluginRoot" in m));
    if (callbackHooks.length > 0) {
      filtered[event] = callbackHooks;
    }
  }
  STATE.registeredHooks = Object.keys(filtered).length > 0 ? filtered : null;
}
function resetSdkInitState() {
  STATE.initJsonSchema = null;
  STATE.registeredHooks = null;
}
function getPlanSlugCache() {
  return STATE.planSlugCache;
}
function getSessionCreatedTeams() {
  return STATE.sessionCreatedTeams;
}
function setTeleportedSessionInfo(info) {
  STATE.teleportedSessionInfo = {
    isTeleported: true,
    hasLoggedFirstMessage: false,
    sessionId: info.sessionId
  };
}
function getTeleportedSessionInfo() {
  return STATE.teleportedSessionInfo;
}
function markFirstTeleportMessageLogged() {
  if (STATE.teleportedSessionInfo) {
    STATE.teleportedSessionInfo.hasLoggedFirstMessage = true;
  }
}
function addInvokedSkill(skillName, skillPath, content, agentId = null) {
  const key = `${agentId ?? ""}:${skillName}`;
  STATE.invokedSkills.set(key, {
    skillName,
    skillPath,
    content,
    invokedAt: Date.now(),
    agentId
  });
}
function getInvokedSkills() {
  return STATE.invokedSkills;
}
function getInvokedSkillsForAgent(agentId) {
  const normalizedId = agentId ?? null;
  const filtered = /* @__PURE__ */ new Map();
  for (const [key, skill] of STATE.invokedSkills) {
    if (skill.agentId === normalizedId) {
      filtered.set(key, skill);
    }
  }
  return filtered;
}
function clearInvokedSkills(preservedAgentIds) {
  if (!preservedAgentIds || preservedAgentIds.size === 0) {
    STATE.invokedSkills.clear();
    return;
  }
  for (const [key, skill] of STATE.invokedSkills) {
    if (skill.agentId === null || !preservedAgentIds.has(skill.agentId)) {
      STATE.invokedSkills.delete(key);
    }
  }
}
function clearInvokedSkillsForAgent(agentId) {
  for (const [key, skill] of STATE.invokedSkills) {
    if (skill.agentId === agentId) {
      STATE.invokedSkills.delete(key);
    }
  }
}
function addSlowOperation(operation, durationMs) {
  if (process.env.USER_TYPE !== "ant") return;
  if (operation.includes("exec") && operation.includes("claude-prompt-")) {
    return;
  }
  const now = Date.now();
  STATE.slowOperations = STATE.slowOperations.filter(
    (op) => now - op.timestamp < SLOW_OPERATION_TTL_MS
  );
  STATE.slowOperations.push({ operation, durationMs, timestamp: now });
  if (STATE.slowOperations.length > MAX_SLOW_OPERATIONS) {
    STATE.slowOperations = STATE.slowOperations.slice(-MAX_SLOW_OPERATIONS);
  }
}
function getSlowOperations() {
  if (STATE.slowOperations.length === 0) {
    return EMPTY_SLOW_OPERATIONS;
  }
  const now = Date.now();
  if (STATE.slowOperations.some((op) => now - op.timestamp >= SLOW_OPERATION_TTL_MS)) {
    STATE.slowOperations = STATE.slowOperations.filter(
      (op) => now - op.timestamp < SLOW_OPERATION_TTL_MS
    );
    if (STATE.slowOperations.length === 0) {
      return EMPTY_SLOW_OPERATIONS;
    }
  }
  return STATE.slowOperations;
}
function getMainThreadAgentType() {
  return STATE.mainThreadAgentType;
}
function setMainThreadAgentType(agentType) {
  STATE.mainThreadAgentType = agentType;
}
function getIsRemoteMode() {
  return STATE.isRemoteMode;
}
function setIsRemoteMode(value) {
  STATE.isRemoteMode = value;
}
function getSystemPromptSectionCache() {
  return STATE.systemPromptSectionCache;
}
function setSystemPromptSectionCacheEntry(name, value) {
  STATE.systemPromptSectionCache.set(name, value);
}
function clearSystemPromptSectionState() {
  STATE.systemPromptSectionCache.clear();
}
function getLastEmittedDate() {
  return STATE.lastEmittedDate;
}
function setLastEmittedDate(date) {
  STATE.lastEmittedDate = date;
}
function getAdditionalDirectoriesForClaudeMd() {
  return STATE.additionalDirectoriesForClaudeMd;
}
function setAdditionalDirectoriesForClaudeMd(directories) {
  STATE.additionalDirectoriesForClaudeMd = directories;
}
function getAllowedChannels() {
  return STATE.allowedChannels;
}
function setAllowedChannels(entries) {
  STATE.allowedChannels = entries;
}
function getHasDevChannels() {
  return STATE.hasDevChannels;
}
function setHasDevChannels(value) {
  STATE.hasDevChannels = value;
}
function getPromptCache1hAllowlist() {
  return STATE.promptCache1hAllowlist;
}
function setPromptCache1hAllowlist(allowlist) {
  STATE.promptCache1hAllowlist = allowlist;
}
function getPromptCache1hEligible() {
  return STATE.promptCache1hEligible;
}
function setPromptCache1hEligible(eligible) {
  STATE.promptCache1hEligible = eligible;
}
function getAfkModeHeaderLatched() {
  return STATE.afkModeHeaderLatched;
}
function setAfkModeHeaderLatched(v) {
  STATE.afkModeHeaderLatched = v;
}
function getFastModeHeaderLatched() {
  return STATE.fastModeHeaderLatched;
}
function setFastModeHeaderLatched(v) {
  STATE.fastModeHeaderLatched = v;
}
function getCacheEditingHeaderLatched() {
  return STATE.cacheEditingHeaderLatched;
}
function setCacheEditingHeaderLatched(v) {
  STATE.cacheEditingHeaderLatched = v;
}
function getThinkingClearLatched() {
  return STATE.thinkingClearLatched;
}
function setThinkingClearLatched(v) {
  STATE.thinkingClearLatched = v;
}
function clearBetaHeaderLatches() {
  STATE.afkModeHeaderLatched = null;
  STATE.fastModeHeaderLatched = null;
  STATE.cacheEditingHeaderLatched = null;
  STATE.thinkingClearLatched = null;
}
function getPromptId() {
  return STATE.promptId;
}
function setPromptId(id) {
  STATE.promptId = id;
}
var STATE, sessionSwitched, onSessionSwitch, interactionTimeDirty, outputTokensAtTurnStart, currentTurnTokenBudget, budgetContinuationCount, scrollDraining, scrollDrainTimer, SCROLL_DRAIN_IDLE_MS, MAX_SLOW_OPERATIONS, SLOW_OPERATION_TTL_MS, EMPTY_SLOW_OPERATIONS;
var init_state = __esm({
  "claude-code-deps/bootstrap/state.ts"() {
    init_crypto();
    init_settingsCache();
    init_signal();
    STATE = getInitialState();
    sessionSwitched = createSignal();
    onSessionSwitch = sessionSwitched.subscribe;
    interactionTimeDirty = false;
    outputTokensAtTurnStart = 0;
    currentTurnTokenBudget = null;
    budgetContinuationCount = 0;
    scrollDraining = false;
    SCROLL_DRAIN_IDLE_MS = 150;
    MAX_SLOW_OPERATIONS = 10;
    SLOW_OPERATION_TTL_MS = 1e4;
    EMPTY_SLOW_OPERATIONS = [];
  }
});

// claude-code-deps/utils/bufferedWriter.ts
function createBufferedWriter(_onChunk) {
  return new BufferedWriter();
}
var BufferedWriter;
var init_bufferedWriter = __esm({
  "claude-code-deps/utils/bufferedWriter.ts"() {
    BufferedWriter = class {
      write(_data) {
      }
      flush() {
      }
    };
  }
});

// claude-code-deps/utils/cleanupRegistry.ts
function registerCleanup(_fn) {
}
var init_cleanupRegistry = __esm({
  "claude-code-deps/utils/cleanupRegistry.ts"() {
  }
});

// claude-code-deps/utils/debugFilter.ts
function shouldShowDebugMessage(_filter, _message, _categories) {
  return true;
}
var parseDebugFilter;
var init_debugFilter = __esm({
  "claude-code-deps/utils/debugFilter.ts"() {
    parseDebugFilter = (_filterString) => null;
  }
});

// claude-code-deps/utils/envUtils.ts
function isEnvTruthy(val) {
  return val === "1" || val === "true";
}
function isInProtectedNamespace() {
  return false;
}
function getClaudeConfigHomeDir() {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return __require("path").join(home, ".claude");
}
var init_envUtils = __esm({
  "claude-code-deps/utils/envUtils.ts"() {
  }
});

// claude-code-deps/utils/fsOperations.ts
function getFsImplementation() {
  return __require("fs");
}
var init_fsOperations = __esm({
  "claude-code-deps/utils/fsOperations.ts"() {
  }
});

// claude-code-deps/utils/process.ts
function writeToStderr(s) {
  process.stderr.write(s);
}
var init_process = __esm({
  "claude-code-deps/utils/process.ts"() {
  }
});

// claude-code-deps/utils/slowOperations.ts
import {
  closeSync,
  writeFileSync as fsWriteFileSync,
  fsyncSync,
  openSync
} from "fs";
import lodashCloneDeep from "lodash-es/cloneDeep.js";
function callerFrame(stack) {
  if (!stack) return "";
  for (const line of stack.split("\n")) {
    if (line.includes("slowOperations")) continue;
    const m = line.match(/([^/\\]+?):(\d+):\d+\)?$/);
    if (m) return ` @ ${m[1]}:${m[2]}`;
  }
  return "";
}
function buildDescription(args2) {
  const strings = args2[0];
  let result = "";
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i + 1 < args2.length) {
      const v = args2[i + 1];
      if (Array.isArray(v)) {
        result += `Array[${v.length}]`;
      } else if (v !== null && typeof v === "object") {
        result += `Object{${Object.keys(v).length} keys}`;
      } else if (typeof v === "string") {
        result += v.length > 80 ? `${v.slice(0, 80)}\u2026` : v;
      } else {
        result += String(v);
      }
    }
  }
  return result;
}
function slowLoggingAnt(_strings, ..._values) {
  return new AntSlowLogger(arguments);
}
function slowLoggingExternal() {
  return NOOP_LOGGER;
}
function jsonStringify(value, replacer, space) {
  using _ = slowLogging`JSON.stringify(${value})`;
  return JSON.stringify(
    value,
    replacer,
    space
  );
}
var SLOW_OPERATION_THRESHOLD_MS, isLogging, AntSlowLogger, NOOP_LOGGER, slowLogging, jsonParse;
var init_slowOperations = __esm({
  "claude-code-deps/utils/slowOperations.ts"() {
    init_bun_bundle_stub();
    init_state();
    init_debug();
    SLOW_OPERATION_THRESHOLD_MS = (() => {
      const envValue = process.env.CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS;
      if (envValue !== void 0) {
        const parsed = Number(envValue);
        if (!Number.isNaN(parsed) && parsed >= 0) {
          return parsed;
        }
      }
      if (process.env.NODE_ENV === "development") {
        return 20;
      }
      if (process.env.USER_TYPE === "ant") {
        return 300;
      }
      return Infinity;
    })();
    isLogging = false;
    AntSlowLogger = class {
      startTime;
      args;
      err;
      constructor(args2) {
        this.startTime = performance.now();
        this.args = args2;
        this.err = new Error();
      }
      [Symbol.dispose]() {
        const duration = performance.now() - this.startTime;
        if (duration > SLOW_OPERATION_THRESHOLD_MS && !isLogging) {
          isLogging = true;
          try {
            const description = buildDescription(this.args) + callerFrame(this.err.stack);
            logForDebugging(
              `[SLOW OPERATION DETECTED] ${description} (${duration.toFixed(1)}ms)`
            );
            addSlowOperation(description, duration);
          } finally {
            isLogging = false;
          }
        }
      }
    };
    NOOP_LOGGER = { [Symbol.dispose]() {
    } };
    slowLogging = feature("SLOW_OPERATION_LOGGING") ? slowLoggingAnt : slowLoggingExternal;
    jsonParse = (text, reviver) => {
      using _ = slowLogging`JSON.parse(${text})`;
      return typeof reviver === "undefined" ? JSON.parse(text) : JSON.parse(text, reviver);
    };
  }
});

// claude-code-deps/utils/debug.ts
import { appendFile, mkdir, symlink, unlink } from "fs/promises";
import memoize from "lodash-es/memoize.js";
import { dirname, join } from "path";
function shouldLogDebugMessage(message) {
  if (process.env.NODE_ENV === "test" && !isDebugToStdErr()) {
    return false;
  }
  if (process.env.USER_TYPE !== "ant" && !isDebugMode()) {
    return false;
  }
  if (typeof process === "undefined" || typeof process.versions === "undefined" || typeof process.versions.node === "undefined") {
    return false;
  }
  const filter = getDebugFilter();
  return shouldShowDebugMessage(message, filter);
}
async function appendAsync(needMkdir, dir, path, content) {
  if (needMkdir) {
    await mkdir(dir, { recursive: true }).catch(() => {
    });
  }
  await appendFile(path, content);
  void updateLatestDebugLogSymlink();
}
function noop() {
}
function getDebugWriter() {
  if (!debugWriter) {
    let ensuredDir = null;
    debugWriter = createBufferedWriter({
      writeFn: (content) => {
        const path = getDebugLogPath();
        const dir = dirname(path);
        const needMkdir = ensuredDir !== dir;
        ensuredDir = dir;
        if (isDebugMode()) {
          if (needMkdir) {
            try {
              getFsImplementation().mkdirSync(dir);
            } catch {
            }
          }
          getFsImplementation().appendFileSync(path, content);
          void updateLatestDebugLogSymlink();
          return;
        }
        pendingWrite = pendingWrite.then(appendAsync.bind(null, needMkdir, dir, path, content)).catch(noop);
      },
      flushIntervalMs: 1e3,
      maxBufferSize: 100,
      immediateMode: isDebugMode()
    });
    registerCleanup(async () => {
      debugWriter?.dispose();
      await pendingWrite;
    });
  }
  return debugWriter;
}
function logForDebugging(message, { level } = {
  level: "debug"
}) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[getMinDebugLogLevel()]) {
    return;
  }
  if (!shouldLogDebugMessage(message)) {
    return;
  }
  if (hasFormattedOutput && message.includes("\n")) {
    message = jsonStringify(message);
  }
  const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
  const output = `${timestamp2} [${level.toUpperCase()}] ${message.trim()}
`;
  if (isDebugToStdErr()) {
    writeToStderr(output);
    return;
  }
  getDebugWriter().write(output);
}
function getDebugLogPath() {
  return getDebugFilePath() ?? process.env.CLAUDE_CODE_DEBUG_LOGS_DIR ?? join(getClaudeConfigHomeDir(), "debug", `${getSessionId()}.txt`);
}
var LEVEL_ORDER, getMinDebugLogLevel, runtimeDebugEnabled, isDebugMode, getDebugFilter, isDebugToStdErr, getDebugFilePath, hasFormattedOutput, debugWriter, pendingWrite, updateLatestDebugLogSymlink;
var init_debug = __esm({
  "claude-code-deps/utils/debug.ts"() {
    init_state();
    init_bufferedWriter();
    init_cleanupRegistry();
    init_debugFilter();
    init_envUtils();
    init_fsOperations();
    init_process();
    init_slowOperations();
    LEVEL_ORDER = {
      verbose: 0,
      debug: 1,
      info: 2,
      warn: 3,
      error: 4
    };
    getMinDebugLogLevel = memoize(() => {
      const raw = process.env.CLAUDE_CODE_DEBUG_LOG_LEVEL?.toLowerCase().trim();
      if (raw && Object.hasOwn(LEVEL_ORDER, raw)) {
        return raw;
      }
      return "debug";
    });
    runtimeDebugEnabled = false;
    isDebugMode = memoize(() => {
      return runtimeDebugEnabled || isEnvTruthy(process.env.DEBUG) || isEnvTruthy(process.env.DEBUG_SDK) || process.argv.includes("--debug") || process.argv.includes("-d") || isDebugToStdErr() || // Also check for --debug=pattern syntax
      process.argv.some((arg) => arg.startsWith("--debug=")) || // --debug-file implicitly enables debug mode
      getDebugFilePath() !== null;
    });
    getDebugFilter = memoize(() => {
      const debugArg = process.argv.find((arg) => arg.startsWith("--debug="));
      if (!debugArg) {
        return null;
      }
      const filterPattern = debugArg.substring("--debug=".length);
      return parseDebugFilter(filterPattern);
    });
    isDebugToStdErr = memoize(() => {
      return process.argv.includes("--debug-to-stderr") || process.argv.includes("-d2e");
    });
    getDebugFilePath = memoize(() => {
      for (let i = 0; i < process.argv.length; i++) {
        const arg = process.argv[i];
        if (arg.startsWith("--debug-file=")) {
          return arg.substring("--debug-file=".length);
        }
        if (arg === "--debug-file" && i + 1 < process.argv.length) {
          return process.argv[i + 1];
        }
      }
      return null;
    });
    hasFormattedOutput = false;
    debugWriter = null;
    pendingWrite = Promise.resolve();
    updateLatestDebugLogSymlink = memoize(async () => {
      try {
        const debugLogPath = getDebugLogPath();
        const debugLogsDir = dirname(debugLogPath);
        const latestSymlinkPath = join(debugLogsDir, "latest");
        await unlink(latestSymlinkPath).catch(() => {
        });
        await symlink(debugLogPath, latestSymlinkPath);
      } catch {
      }
    });
  }
});

// claude-code-deps/utils/errors.ts
import { APIUserAbortError } from "@anthropic-ai/sdk";
function errorMessage(e) {
  return e instanceof Error ? e.message : String(e);
}
function getErrnoCode(e) {
  if (e && typeof e === "object" && "code" in e && typeof e.code === "string") {
    return e.code;
  }
  return void 0;
}
function isENOENT(e) {
  return getErrnoCode(e) === "ENOENT";
}
var init_errors = __esm({
  "claude-code-deps/utils/errors.ts"() {
  }
});

// node_modules/emoji-regex/index.js
var require_emoji_regex = __commonJS({
  "node_modules/emoji-regex/index.js"(exports, module) {
    "use strict";
    module.exports = function() {
      return /\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F|\uD83D\uDC68(?:\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68\uD83C\uDFFB|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|[\u2695\u2696\u2708]\uFE0F|\uD83D[\uDC66\uDC67]|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708])\uFE0F|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C[\uDFFB-\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)\uD83C\uDFFB|\uD83E\uDDD1(?:\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])|\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1)|(?:\uD83E\uDDD1\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFE])|(?:\uD83E\uDDD1\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)(?:\uD83C[\uDFFB\uDFFC])|\uD83D\uDC69(?:\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|(?:\uD83E\uDDD1\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)(?:\uD83C[\uDFFB-\uDFFD])|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|(?:(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)\uFE0F|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD6-\uDDDD])(?:(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\u200D[\u2640\u2642])|\uD83C\uDFF4\u200D\u2620)\uFE0F|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF4\uD83C\uDDF2|\uD83C\uDDF6\uD83C\uDDE6|[#\*0-9]\uFE0F\u20E3|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83D\uDC69(?:\uD83C[\uDFFB-\uDFFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270A-\u270D]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC70\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDCAA\uDD74\uDD7A\uDD90\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD36\uDDB5\uDDB6\uDDBB\uDDD2-\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDED5\uDEEB\uDEEC\uDEF4-\uDEFA\uDFE0-\uDFEB]|\uD83E[\uDD0D-\uDD3A\uDD3C-\uDD45\uDD47-\uDD71\uDD73-\uDD76\uDD7A-\uDDA2\uDDA5-\uDDAA\uDDAE-\uDDCA\uDDCD-\uDDFF\uDE70-\uDE73\uDE78-\uDE7A\uDE80-\uDE82\uDE90-\uDE95])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFA\uDFE0-\uDFEB]|\uD83E[\uDD0D-\uDD3A\uDD3C-\uDD45\uDD47-\uDD71\uDD73-\uDD76\uDD7A-\uDDA2\uDDA5-\uDDAA\uDDAE-\uDDCA\uDDCD-\uDDFF\uDE70-\uDE73\uDE78-\uDE7A\uDE80-\uDE82\uDE90-\uDE95])\uFE0F|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDC8F\uDC91\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD0F\uDD18-\uDD1F\uDD26\uDD30-\uDD39\uDD3C-\uDD3E\uDDB5\uDDB6\uDDB8\uDDB9\uDDBB\uDDCD-\uDDCF\uDDD1-\uDDDD])/g;
    };
  }
});

// node_modules/ansi-regex/index.js
var require_ansi_regex = __commonJS({
  "node_modules/ansi-regex/index.js"(exports, module) {
    "use strict";
    module.exports = ({ onlyFirst = false } = {}) => {
      const pattern = [
        "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
        "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))"
      ].join("|");
      return new RegExp(pattern, onlyFirst ? void 0 : "g");
    };
  }
});

// node_modules/strip-ansi/index.js
var require_strip_ansi = __commonJS({
  "node_modules/strip-ansi/index.js"(exports, module) {
    "use strict";
    var ansiRegex = require_ansi_regex();
    module.exports = (string) => typeof string === "string" ? string.replace(ansiRegex(), "") : string;
  }
});

// src/debugUtils.ts
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
    init_analytics();
    init_debug();
    init_errors();
    init_slowOperations();
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

// claude-code-deps/constants/oauth.ts
var oauth_exports = {};
__export(oauth_exports, {
  getOauthConfig: () => getOauthConfig
});
function getOauthConfig() {
  return { BASE_API_URL: process.env.BRIDGE_BASE_URL || "http://localhost:9090" };
}
var init_oauth = __esm({
  "claude-code-deps/constants/oauth.ts"() {
  }
});

// claude-code-deps/utils/auth.ts
var auth_exports = {};
__export(auth_exports, {
  checkAndRefreshOAuthTokenIfNeeded: () => checkAndRefreshOAuthTokenIfNeeded,
  clearOAuthTokenCache: () => clearOAuthTokenCache,
  getClaudeAIOAuthTokens: () => getClaudeAIOAuthTokens,
  getOauthAccountInfo: () => getOauthAccountInfo,
  handleOAuth401Error: () => handleOAuth401Error,
  hasProfileScope: () => hasProfileScope,
  isClaudeAISubscriber: () => isClaudeAISubscriber
});
function getClaudeAIOAuthTokens() {
  return null;
}
function isClaudeAISubscriber() {
  return false;
}
function hasProfileScope() {
  return false;
}
function getOauthAccountInfo() {
  return null;
}
async function checkAndRefreshOAuthTokenIfNeeded() {
}
async function handleOAuth401Error(_token) {
  return true;
}
function clearOAuthTokenCache() {
}
var init_auth = __esm({
  "claude-code-deps/utils/auth.ts"() {
  }
});

// claude-code-deps/services/oauth/client.ts
var client_exports = {};
__export(client_exports, {
  getOrganizationUUID: () => getOrganizationUUID
});
async function getOrganizationUUID() {
  return null;
}
var init_client = __esm({
  "claude-code-deps/services/oauth/client.ts"() {
  }
});

// claude-code-deps/utils/teleport/api.ts
var api_exports = {};
__export(api_exports, {
  getOAuthHeaders: () => getOAuthHeaders
});
function getOAuthHeaders(_token) {
  return {};
}
var init_api = __esm({
  "claude-code-deps/utils/teleport/api.ts"() {
  }
});

// claude-code-deps/utils/detectRepository.ts
var detectRepository_exports = {};
__export(detectRepository_exports, {
  parseGitHubRepository: () => parseGitHubRepository,
  parseGitRemote: () => parseGitRemote
});
function parseGitHubRepository(_url) {
  return null;
}
function parseGitRemote(_url) {
  return null;
}
var init_detectRepository = __esm({
  "claude-code-deps/utils/detectRepository.ts"() {
  }
});

// claude-code-deps/utils/git.ts
var git_exports = {};
__export(git_exports, {
  findGitRoot: () => findGitRoot,
  getBranch: () => getBranch,
  getDefaultBranch: () => getDefaultBranch,
  getRemoteUrl: () => getRemoteUrl
});
async function getBranch() {
  return "main";
}
async function getRemoteUrl() {
  return null;
}
function findGitRoot(_dir) {
  return null;
}
async function getDefaultBranch() {
  return void 0;
}
var init_git = __esm({
  "claude-code-deps/utils/git.ts"() {
  }
});

// claude-code-deps/utils/model/model.ts
var model_exports = {};
__export(model_exports, {
  getMainLoopModel: () => getMainLoopModel
});
function getMainLoopModel() {
  return "claude-sonnet-5";
}
var init_model = __esm({
  "claude-code-deps/utils/model/model.ts"() {
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
  const { getClaudeAIOAuthTokens: getClaudeAIOAuthTokens2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
  const { getOrganizationUUID: getOrganizationUUID2 } = await Promise.resolve().then(() => (init_client(), client_exports));
  const { getOauthConfig: getOauthConfig2 } = await Promise.resolve().then(() => (init_oauth(), oauth_exports));
  const { getOAuthHeaders: getOAuthHeaders2 } = await Promise.resolve().then(() => (init_api(), api_exports));
  const { parseGitHubRepository: parseGitHubRepository2 } = await Promise.resolve().then(() => (init_detectRepository(), detectRepository_exports));
  const { getDefaultBranch: getDefaultBranch2 } = await Promise.resolve().then(() => (init_git(), git_exports));
  const { getMainLoopModel: getMainLoopModel2 } = await Promise.resolve().then(() => (init_model(), model_exports));
  const { default: axios3 } = await import("axios");
  const accessToken = getAccessToken?.() ?? getClaudeAIOAuthTokens2()?.accessToken;
  if (!accessToken) {
    logForDebugging("[bridge] No access token for session creation");
    return null;
  }
  const orgUUID = await getOrganizationUUID2();
  if (!orgUUID) {
    logForDebugging("[bridge] No org UUID for session creation");
    return null;
  }
  let gitSource = null;
  let gitOutcome = null;
  if (gitRepoUrl) {
    const { parseGitRemote: parseGitRemote2 } = await Promise.resolve().then(() => (init_detectRepository(), detectRepository_exports));
    const parsed = parseGitRemote2(gitRepoUrl);
    if (parsed) {
      const { host, owner, name } = parsed;
      const revision = branch || await getDefaultBranch2() || void 0;
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
      const ownerRepo = parseGitHubRepository2(gitRepoUrl);
      if (ownerRepo) {
        const [owner, name] = ownerRepo.split("/");
        if (owner && name) {
          const revision = branch || await getDefaultBranch2() || void 0;
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
      model: getMainLoopModel2()
    },
    environment_id: environmentId,
    source: "remote-control",
    ...permissionMode && { permission_mode: permissionMode }
  };
  const headers = {
    ...getOAuthHeaders2(accessToken),
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
    logForDebugging(
      `[bridge] Session creation request failed: ${errorMessage(err)}`
    );
    return null;
  }
  const isSuccess = response.status === 200 || response.status === 201;
  if (!isSuccess) {
    const detail = extractErrorDetail(response.data);
    logForDebugging(
      `[bridge] Session creation failed with status ${response.status}${detail ? `: ${detail}` : ""}`
    );
    return null;
  }
  const sessionData = response.data;
  if (!sessionData || typeof sessionData !== "object" || !("id" in sessionData) || typeof sessionData.id !== "string") {
    logForDebugging("[bridge] No session ID in response");
    return null;
  }
  return sessionData.id;
}
async function getBridgeSession(sessionId, opts) {
  const { getClaudeAIOAuthTokens: getClaudeAIOAuthTokens2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
  const { getOrganizationUUID: getOrganizationUUID2 } = await Promise.resolve().then(() => (init_client(), client_exports));
  const { getOauthConfig: getOauthConfig2 } = await Promise.resolve().then(() => (init_oauth(), oauth_exports));
  const { getOAuthHeaders: getOAuthHeaders2 } = await Promise.resolve().then(() => (init_api(), api_exports));
  const { default: axios3 } = await import("axios");
  const accessToken = opts?.getAccessToken?.() ?? getClaudeAIOAuthTokens2()?.accessToken;
  if (!accessToken) {
    logForDebugging("[bridge] No access token for session fetch");
    return null;
  }
  const orgUUID = await getOrganizationUUID2();
  if (!orgUUID) {
    logForDebugging("[bridge] No org UUID for session fetch");
    return null;
  }
  const headers = {
    ...getOAuthHeaders2(accessToken),
    "anthropic-beta": "ccr-byoc-2025-07-29",
    "x-organization-uuid": orgUUID
  };
  const url = `${opts?.baseUrl ?? getOauthConfig2().BASE_API_URL}/v1/sessions/${sessionId}`;
  logForDebugging(`[bridge] Fetching session ${sessionId}`);
  let response;
  try {
    response = await axios3.get(
      url,
      { headers, timeout: 1e4, validateStatus: (s) => s < 500 }
    );
  } catch (err) {
    logForDebugging(
      `[bridge] Session fetch request failed: ${errorMessage(err)}`
    );
    return null;
  }
  if (response.status !== 200) {
    const detail = extractErrorDetail(response.data);
    logForDebugging(
      `[bridge] Session fetch failed with status ${response.status}${detail ? `: ${detail}` : ""}`
    );
    return null;
  }
  return response.data;
}
async function archiveBridgeSession(sessionId, opts) {
  const { getClaudeAIOAuthTokens: getClaudeAIOAuthTokens2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
  const { getOrganizationUUID: getOrganizationUUID2 } = await Promise.resolve().then(() => (init_client(), client_exports));
  const { getOauthConfig: getOauthConfig2 } = await Promise.resolve().then(() => (init_oauth(), oauth_exports));
  const { getOAuthHeaders: getOAuthHeaders2 } = await Promise.resolve().then(() => (init_api(), api_exports));
  const { default: axios3 } = await import("axios");
  const accessToken = opts?.getAccessToken?.() ?? getClaudeAIOAuthTokens2()?.accessToken;
  if (!accessToken) {
    logForDebugging("[bridge] No access token for session archive");
    return;
  }
  const orgUUID = await getOrganizationUUID2();
  if (!orgUUID) {
    logForDebugging("[bridge] No org UUID for session archive");
    return;
  }
  const headers = {
    ...getOAuthHeaders2(accessToken),
    "anthropic-beta": "ccr-byoc-2025-07-29",
    "x-organization-uuid": orgUUID
  };
  const url = `${opts?.baseUrl ?? getOauthConfig2().BASE_API_URL}/v1/sessions/${sessionId}/archive`;
  logForDebugging(`[bridge] Archiving session ${sessionId}`);
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
    logForDebugging(`[bridge] Session ${sessionId} archived successfully`);
  } else {
    const detail = extractErrorDetail(response.data);
    logForDebugging(
      `[bridge] Session archive failed with status ${response.status}${detail ? `: ${detail}` : ""}`
    );
  }
}
async function updateBridgeSessionTitle(sessionId, title, opts) {
  const { getClaudeAIOAuthTokens: getClaudeAIOAuthTokens2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
  const { getOrganizationUUID: getOrganizationUUID2 } = await Promise.resolve().then(() => (init_client(), client_exports));
  const { getOauthConfig: getOauthConfig2 } = await Promise.resolve().then(() => (init_oauth(), oauth_exports));
  const { getOAuthHeaders: getOAuthHeaders2 } = await Promise.resolve().then(() => (init_api(), api_exports));
  const { default: axios3 } = await import("axios");
  const accessToken = opts?.getAccessToken?.() ?? getClaudeAIOAuthTokens2()?.accessToken;
  if (!accessToken) {
    logForDebugging("[bridge] No access token for session title update");
    return;
  }
  const orgUUID = await getOrganizationUUID2();
  if (!orgUUID) {
    logForDebugging("[bridge] No org UUID for session title update");
    return;
  }
  const headers = {
    ...getOAuthHeaders2(accessToken),
    "anthropic-beta": "ccr-byoc-2025-07-29",
    "x-organization-uuid": orgUUID
  };
  const compatId = toCompatSessionId(sessionId);
  const url = `${opts?.baseUrl ?? getOauthConfig2().BASE_API_URL}/v1/sessions/${compatId}`;
  logForDebugging(`[bridge] Updating session title: ${compatId} \u2192 ${title}`);
  try {
    const response = await axios3.patch(
      url,
      { title },
      { headers, timeout: 1e4, validateStatus: (s) => s < 500 }
    );
    if (response.status === 200) {
      logForDebugging(`[bridge] Session title updated successfully`);
    } else {
      const detail = extractErrorDetail(response.data);
      logForDebugging(
        `[bridge] Session title update failed with status ${response.status}${detail ? `: ${detail}` : ""}`
      );
    }
  } catch (err) {
    logForDebugging(
      `[bridge] Session title update request failed: ${errorMessage(err)}`
    );
  }
}
var init_createSession = __esm({
  "src/createSession.ts"() {
    init_debug();
    init_errors();
    init_debugUtils();
    init_sessionIdCompat();
  }
});

// claude-code-deps/utils/getWorktreePathsPortable.ts
async function getWorktreePathsPortable(_dir) {
  return [];
}
var init_getWorktreePathsPortable = __esm({
  "claude-code-deps/utils/getWorktreePathsPortable.ts"() {
  }
});

// claude-code-deps/utils/lazySchema.ts
function lazySchema(fn) {
  return fn;
}
var init_lazySchema = __esm({
  "claude-code-deps/utils/lazySchema.ts"() {
  }
});

// claude-code-deps/utils/sessionStoragePortable.ts
function getProjectsDir() {
  return __require("path").join(__require("os").homedir(), ".claude");
}
function sanitizePath(p) {
  return p.replace(/[\/\:]/g, "_");
}
var init_sessionStoragePortable = __esm({
  "claude-code-deps/utils/sessionStoragePortable.ts"() {
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
import { mkdir as mkdir2, readFile, stat, unlink as unlink2, writeFile } from "fs/promises";
import { dirname as dirname4, join as join3 } from "path";
import { z } from "zod/v4";
function getBridgePointerPath(dir) {
  return join3(getProjectsDir(), sanitizePath(dir), "bridge-pointer.json");
}
async function writeBridgePointer(dir, pointer) {
  const path = getBridgePointerPath(dir);
  try {
    await mkdir2(dirname4(path), { recursive: true });
    await writeFile(path, jsonStringify(pointer), "utf8");
    logForDebugging(`[bridge:pointer] wrote ${path}`);
  } catch (err) {
    logForDebugging(`[bridge:pointer] write failed: ${err}`, { level: "warn" });
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
    logForDebugging(`[bridge:pointer] invalid schema, clearing: ${path}`);
    await clearBridgePointer(dir);
    return null;
  }
  const ageMs = Math.max(0, Date.now() - mtimeMs);
  if (ageMs > BRIDGE_POINTER_TTL_MS) {
    logForDebugging(`[bridge:pointer] stale (>4h mtime), clearing: ${path}`);
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
    logForDebugging(
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
    logForDebugging(
      `[bridge:pointer] fanout found pointer in worktree ${freshest.dir} (ageMs=${freshest.pointer.ageMs})`
    );
  }
  return freshest;
}
async function clearBridgePointer(dir) {
  const path = getBridgePointerPath(dir);
  try {
    await unlink2(path);
    logForDebugging(`[bridge:pointer] cleared ${path}`);
  } catch (err) {
    if (!isENOENT(err)) {
      logForDebugging(`[bridge:pointer] clear failed: ${err}`, {
        level: "warn"
      });
    }
  }
}
function safeJsonParse(raw) {
  try {
    return jsonParse(raw);
  } catch {
    return null;
  }
}
var MAX_WORKTREE_FANOUT, BRIDGE_POINTER_TTL_MS, BridgePointerSchema;
var init_bridgePointer = __esm({
  "src/bridgePointer.ts"() {
    init_debug();
    init_errors();
    init_getWorktreePathsPortable();
    init_lazySchema();
    init_sessionStoragePortable();
    init_slowOperations();
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

// claude-code-deps/types/permissions.ts
var permissions_exports = {};
__export(permissions_exports, {
  EXTERNAL_PERMISSION_MODES: () => EXTERNAL_PERMISSION_MODES,
  PERMISSION_MODES: () => PERMISSION_MODES
});
var EXTERNAL_PERMISSION_MODES, PERMISSION_MODES;
var init_permissions = __esm({
  "claude-code-deps/types/permissions.ts"() {
    EXTERNAL_PERMISSION_MODES = [];
    PERMISSION_MODES = [];
  }
});

// claude-code-deps/utils/config.ts
var config_exports = {};
__export(config_exports, {
  checkHasTrustDialogAccepted: () => checkHasTrustDialogAccepted,
  enableConfigs: () => enableConfigs,
  getCurrentProjectConfig: () => getCurrentProjectConfig,
  getGlobalConfig: () => getGlobalConfig,
  saveCurrentProjectConfig: () => saveCurrentProjectConfig,
  saveGlobalConfig: () => saveGlobalConfig
});
function enableConfigs() {
}
function checkHasTrustDialogAccepted() {
  return true;
}
function getGlobalConfig() {
  return {};
}
function saveGlobalConfig(_fn) {
}
function getCurrentProjectConfig() {
  return {};
}
function saveCurrentProjectConfig(_fn) {
}
var init_config = __esm({
  "claude-code-deps/utils/config.ts"() {
  }
});

// claude-code-deps/utils/sinks.ts
var sinks_exports = {};
__export(sinks_exports, {
  initSinks: () => initSinks
});
function initSinks() {
}
var init_sinks = __esm({
  "claude-code-deps/utils/sinks.ts"() {
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

// claude-code-deps/utils/hooks.ts
var hooks_exports = {};
__export(hooks_exports, {
  hasWorktreeCreateHook: () => hasWorktreeCreateHook
});
function hasWorktreeCreateHook() {
  return false;
}
var init_hooks = __esm({
  "claude-code-deps/utils/hooks.ts"() {
  }
});

// src/bridgeMain.ts
init_bun_bundle_stub();
import { randomUUID as randomUUID2 } from "crypto";
import { hostname as hostname2, tmpdir as tmpdir2 } from "os";
import { basename, join as join4, resolve } from "path";

// claude-code-deps/constants/product.ts
function getRemoteSessionUrl(_sessionId, _ingressUrl) {
  return `http://localhost:9090/session/${_sessionId}`;
}
function getClaudeAiBaseUrl(_arg, _ingressUrl) {
  return process.env.BRIDGE_BASE_URL || "http://localhost:9090";
}

// claude-code-deps/services/analytics/datadog.ts
async function shutdownDatadog() {
}

// claude-code-deps/services/analytics/firstPartyEventLogger.ts
async function shutdown1PEventLogging() {
}

// claude-code-deps/services/analytics/growthbook.ts
async function checkGate_CACHED_OR_BLOCKING(_gate) {
  return false;
}
function getFeatureValue_CACHED_MAY_BE_STALE(_key, defaultValue) {
  return defaultValue;
}

// src/bridgeMain.ts
init_analytics();

// claude-code-deps/utils/bundledMode.ts
function isInBundledMode() {
  return typeof Bun !== "undefined" && Array.isArray(Bun.embeddedFiles) && Bun.embeddedFiles.length > 0;
}

// src/bridgeMain.ts
init_debug();

// claude-code-deps/utils/diagLogs.ts
init_fsOperations();
init_slowOperations();
import { dirname as dirname2 } from "path";
function logForDiagnosticsNoPII(level, event, data) {
  const logFile = getDiagnosticLogFile();
  if (!logFile) {
    return;
  }
  const entry = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    level,
    event,
    data: data ?? {}
  };
  const fs = getFsImplementation();
  const line = jsonStringify(entry) + "\n";
  try {
    fs.appendFileSync(logFile, line);
  } catch {
    try {
      fs.mkdirSync(dirname2(logFile));
      fs.appendFileSync(logFile, line);
    } catch {
    }
  }
}
function getDiagnosticLogFile() {
  return process.env.CLAUDE_CODE_DIAGNOSTICS_FILE;
}

// src/bridgeMain.ts
init_envUtils();
init_errors();

// claude-code-deps/utils/intl.ts
var graphemeSegmenter = null;
function getGraphemeSegmenter() {
  if (!graphemeSegmenter) {
    graphemeSegmenter = new Intl.Segmenter(void 0, {
      granularity: "grapheme"
    });
  }
  return graphemeSegmenter;
}

// claude-code-deps/utils/truncate.ts
function truncateToWidth(text, maxWidth) {
  if (text.length <= maxWidth) return text;
  return text.slice(0, Math.max(0, maxWidth - 1)) + "\u2026";
}

// claude-code-deps/utils/format.ts
function formatDuration(ms, options) {
  if (ms < 6e4) {
    if (ms === 0) {
      return "0s";
    }
    if (ms < 1) {
      const s2 = (ms / 1e3).toFixed(1);
      return `${s2}s`;
    }
    const s = Math.floor(ms / 1e3).toString();
    return `${s}s`;
  }
  let days = Math.floor(ms / 864e5);
  let hours = Math.floor(ms % 864e5 / 36e5);
  let minutes = Math.floor(ms % 36e5 / 6e4);
  let seconds = Math.round(ms % 6e4 / 1e3);
  if (seconds === 60) {
    seconds = 0;
    minutes++;
  }
  if (minutes === 60) {
    minutes = 0;
    hours++;
  }
  if (hours === 24) {
    hours = 0;
    days++;
  }
  const hide = options?.hideTrailingZeros;
  if (options?.mostSignificantOnly) {
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }
  if (days > 0) {
    if (hide && hours === 0 && minutes === 0) return `${days}d`;
    if (hide && minutes === 0) return `${days}d ${hours}h`;
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    if (hide && minutes === 0 && seconds === 0) return `${hours}h`;
    if (hide && seconds === 0) return `${hours}h ${minutes}m`;
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    if (hide && seconds === 0) return `${minutes}m`;
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

// claude-code-deps/utils/log.ts
function logError(err) {
  console.error(err);
}

// claude-code-deps/utils/sleep.ts
function sleep(ms, signal, opts) {
  return new Promise((resolve2, reject) => {
    if (signal?.aborted) {
      if (opts?.throwOnAbort || opts?.abortError) {
        void reject(opts.abortError?.() ?? new Error("aborted"));
      } else {
        void resolve2();
      }
      return;
    }
    const timer = setTimeout(
      (signal2, onAbort2, resolve3) => {
        signal2?.removeEventListener("abort", onAbort2);
        void resolve3();
      },
      ms,
      signal,
      onAbort,
      resolve2
    );
    function onAbort() {
      clearTimeout(timer);
      if (opts?.throwOnAbort || opts?.abortError) {
        void reject(opts.abortError?.() ?? new Error("aborted"));
      } else {
        void resolve2();
      }
    }
    signal?.addEventListener("abort", onAbort, { once: true });
    if (opts?.unref) {
      timer.unref();
    }
  });
}

// claude-code-deps/utils/worktree.ts
async function createAgentWorktree(_name) {
  throw new Error("Worktree not available in standalone mode");
}
async function removeAgentWorktree(_path, _branch, _gitRoot, _hookBased) {
}

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

// claude-code-deps/ink/stringWidth.ts
var import_emoji_regex = __toESM(require_emoji_regex());
var import_strip_ansi = __toESM(require_strip_ansi());
import { eastAsianWidth } from "get-east-asian-width";
var EMOJI_REGEX = (0, import_emoji_regex.default)();
function stringWidthJavaScript(str) {
  if (typeof str !== "string" || str.length === 0) {
    return 0;
  }
  let isPureAscii = true;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 127 || code === 27) {
      isPureAscii = false;
      break;
    }
  }
  if (isPureAscii) {
    let width2 = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code > 31) {
        width2++;
      }
    }
    return width2;
  }
  if (str.includes("\x1B")) {
    str = (0, import_strip_ansi.default)(str);
    if (str.length === 0) {
      return 0;
    }
  }
  if (!needsSegmentation(str)) {
    let width2 = 0;
    for (const char of str) {
      const codePoint = char.codePointAt(0);
      if (!isZeroWidth(codePoint)) {
        width2 += eastAsianWidth(codePoint, { ambiguousAsWide: false });
      }
    }
    return width2;
  }
  let width = 0;
  for (const { segment: grapheme } of getGraphemeSegmenter().segment(str)) {
    EMOJI_REGEX.lastIndex = 0;
    if (EMOJI_REGEX.test(grapheme)) {
      width += getEmojiWidth(grapheme);
      continue;
    }
    for (const char of grapheme) {
      const codePoint = char.codePointAt(0);
      if (!isZeroWidth(codePoint)) {
        width += eastAsianWidth(codePoint, { ambiguousAsWide: false });
        break;
      }
    }
  }
  return width;
}
function needsSegmentation(str) {
  for (const char of str) {
    const cp = char.codePointAt(0);
    if (cp >= 127744 && cp <= 129791) return true;
    if (cp >= 9728 && cp <= 10175) return true;
    if (cp >= 127462 && cp <= 127487) return true;
    if (cp >= 65024 && cp <= 65039) return true;
    if (cp === 8205) return true;
  }
  return false;
}
function getEmojiWidth(grapheme) {
  const first = grapheme.codePointAt(0);
  if (first >= 127462 && first <= 127487) {
    let count = 0;
    for (const _ of grapheme) count++;
    return count === 1 ? 1 : 2;
  }
  if (grapheme.length === 2) {
    const second = grapheme.codePointAt(1);
    if (second === 65039 && (first >= 48 && first <= 57 || first === 35 || first === 42)) {
      return 1;
    }
  }
  return 2;
}
function isZeroWidth(codePoint) {
  if (codePoint >= 32 && codePoint < 127) return false;
  if (codePoint >= 160 && codePoint < 768) return codePoint === 173;
  if (codePoint <= 31 || codePoint >= 127 && codePoint <= 159) return true;
  if (codePoint >= 8203 && codePoint <= 8205 || // ZW space/joiner
  codePoint === 65279 || // BOM
  codePoint >= 8288 && codePoint <= 8292) {
    return true;
  }
  if (codePoint >= 65024 && codePoint <= 65039 || codePoint >= 917760 && codePoint <= 917999) {
    return true;
  }
  if (codePoint >= 768 && codePoint <= 879 || codePoint >= 6832 && codePoint <= 6911 || codePoint >= 7616 && codePoint <= 7679 || codePoint >= 8400 && codePoint <= 8447 || codePoint >= 65056 && codePoint <= 65071) {
    return true;
  }
  if (codePoint >= 2304 && codePoint <= 3407) {
    const offset = codePoint & 127;
    if (offset <= 3) return true;
    if (offset >= 58 && offset <= 79) return true;
    if (offset >= 81 && offset <= 87) return true;
    if (offset >= 98 && offset <= 99) return true;
  }
  if (codePoint === 3633 || // Thai MAI HAN-AKAT
  codePoint >= 3636 && codePoint <= 3642 || // Thai vowel signs (skip U+0E32, U+0E33)
  codePoint >= 3655 && codePoint <= 3662 || // Thai vowel signs and marks
  codePoint === 3761 || // Lao MAI KAN
  codePoint >= 3764 && codePoint <= 3772 || // Lao vowel signs (skip U+0EB2, U+0EB3)
  codePoint >= 3784 && codePoint <= 3789) {
    return true;
  }
  if (codePoint >= 1536 && codePoint <= 1541 || codePoint === 1757 || codePoint === 1807 || codePoint === 2274) {
    return true;
  }
  if (codePoint >= 55296 && codePoint <= 57343) return true;
  if (codePoint >= 917504 && codePoint <= 917631) return true;
  return false;
}
var bunStringWidth = typeof Bun !== "undefined" && typeof Bun.stringWidth === "function" ? Bun.stringWidth : null;
var BUN_STRING_WIDTH_OPTS = { ambiguousIsNarrow: true };
var stringWidth = bunStringWidth ? (str) => bunStringWidth(str, BUN_STRING_WIDTH_OPTS) : stringWidthJavaScript;

// src/bridgeStatusUtil.ts
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

// claude-code-deps/constants/figures.ts
var BRIDGE_READY_INDICATOR = "\u25C9";
var BRIDGE_FAILED_INDICATOR = "\u2716";
var BRIDGE_SPINNER_FRAMES = ["\u280B", "\u2819", "\u2811", "\u2809"];

// src/bridgeUI.ts
init_debug();
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
      const width = stringWidth(logical);
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
init_analytics();
init_debug();
init_errors();
init_slowOperations();
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
      logForDebugging(
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
      logForDebugging(
        `[${label}:token] Token for sessionId=${sessionId} expires=${expiryDate} (past or within buffer), refreshing immediately`
      );
      void doRefresh(sessionId, gen);
      return;
    }
    logForDebugging(
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
    logForDebugging(
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
      logForDebugging(
        `[${label}:token] getAccessToken threw for sessionId=${sessionId}: ${errorMessage(err)}`,
        { level: "error" }
      );
    }
    if (generations.get(sessionId) !== gen) {
      logForDebugging(
        `[${label}:token] doRefresh for sessionId=${sessionId} stale (gen ${gen} vs ${generations.get(sessionId)}), skipping`
      );
      return;
    }
    if (!oauthToken) {
      const failures = (failureCounts.get(sessionId) ?? 0) + 1;
      failureCounts.set(sessionId, failures);
      logForDebugging(
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
    logForDebugging(
      `[${label}:token] Refreshing token for sessionId=${sessionId}: new token prefix=${oauthToken.slice(0, 15)}\u2026`
    );
    logEvent("tengu_bridge_token_refreshed", {});
    onRefresh(sessionId, oauthToken);
    const timer = setTimeout(
      doRefresh,
      FALLBACK_REFRESH_INTERVAL_MS,
      sessionId,
      gen
    );
    timers.set(sessionId, timer);
    logForDebugging(
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
init_slowOperations();
init_debugUtils();
import { spawn } from "child_process";
import { createWriteStream } from "fs";
import { tmpdir } from "os";
import { dirname as dirname3, join as join2 } from "path";
import { createInterface } from "readline";
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
    parsed = jsonParse(line);
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
        debugFile = join2(tmpdir(), "claude", `bridge-session-${safeId}.log`);
      }
      let transcriptStream = null;
      let transcriptPath;
      if (deps.debugFile) {
        transcriptPath = join2(
          dirname3(deps.debugFile),
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
              parsed = jsonParse(line);
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
            jsonStringify({
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
init_oauth();
import axios from "axios";
import memoize2 from "lodash-es/memoize.js";
import { hostname } from "os";
init_debug();
init_errors();

// claude-code-deps/utils/secureStorage/index.ts
function getSecureStorage() {
  return { read: () => ({}), update: () => ({ success: true }) };
}

// src/trustedDevice.ts
init_slowOperations();
var TRUSTED_DEVICE_GATE = "tengu_sessions_elevated_auth_enforcement";
function isGateEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TRUSTED_DEVICE_GATE, false);
}
var readStoredToken = memoize2(() => {
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
init_slowOperations();
import axios2 from "axios";
function decodeWorkSecret(secret) {
  const json = Buffer.from(secret, "base64url").toString("utf-8");
  const parsed = jsonParse(json);
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
      `registerWorker: invalid worker_epoch in response: ${jsonStringify(response.data)}`
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
  return checkGate_CACHED_OR_BLOCKING("tengu_ccr_bridge_multi_session");
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
    const errMsg = errorMessage(err);
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
        logForDebugging(
          `[bridge:heartbeat] Failed for sessionId=${sessionId} workId=${workId}: ${errorMessage(err)}`
        );
        if (err instanceof BridgeFatalError) {
          logEvent("tengu_bridge_heartbeat_error", {
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
        logForDebugging(
          `[bridge:heartbeat] Re-queued sessionId=${sessionId} via bridge/reconnect`
        );
      } catch (err) {
        logger.logError(
          `Failed to refresh session ${sessionId} token: ${errorMessage(err)}`
        );
        logForDebugging(
          `[bridge:heartbeat] reconnectSession(${sessionId}) failed: ${errorMessage(err)}`,
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
            `Failed to refresh session ${sessionId} token: ${errorMessage(err)}`
          );
          logForDebugging(
            `[bridge:token] reconnectSession(${sessionId}) failed: ${errorMessage(err)}`,
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
  logForDebugging(
    `[bridge:work] Starting poll loop spawnMode=${config.spawnMode} maxSessions=${config.maxSessions} environmentId=${environmentId}`
  );
  logForDiagnosticsNoPII("info", "bridge_loop_started", {
    max_sessions: config.maxSessions,
    spawn_mode: config.spawnMode
  });
  if (process.env.USER_TYPE === "ant") {
    let debugGlob;
    if (config.debugFile) {
      const ext = config.debugFile.lastIndexOf(".");
      debugGlob = ext > 0 ? `${config.debugFile.slice(0, ext)}-*${config.debugFile.slice(ext)}` : `${config.debugFile}-*`;
    } else {
      debugGlob = join4(tmpdir2(), "claude", "bridge-session-*.log");
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
      logForDebugging(
        `[bridge:session] sessionId=${sessionId} workId=${workId ?? "unknown"} exited status=${status} duration=${formatDuration(durationMs)}`
      );
      logEvent("tengu_bridge_session_done", {
        status,
        duration_ms: durationMs
      });
      logForDiagnosticsNoPII("info", "bridge_session_done", {
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
              `Failed to remove worktree ${wt.worktreePath}: ${errorMessage(err)}`
            )
          )
        );
      }
      if (status !== "interrupted" && !loopSignal.aborted) {
        if (config.spawnMode !== "single-session") {
          trackCleanup(
            api.archiveSession(compatId).catch(
              (err) => logger.logVerbose(
                `Failed to archive session ${sessionId}: ${errorMessage(err)}`
              )
            )
          );
          logForDebugging(
            `[bridge:session] Session ${status}, returning to idle (multi-session mode)`
          );
        } else {
          logForDebugging(
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
        logForDebugging(
          `[bridge:poll] Reconnected after ${formatDuration(disconnectedMs)}`
        );
        logEvent("tengu_bridge_reconnected", {
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
            logEvent("tengu_bridge_heartbeat_mode_entered", {
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
            logEvent("tengu_bridge_heartbeat_mode_exited", {
              reason: exitReason,
              heartbeat_cycles: hbCycles,
              active_sessions: activeSessions.size
            });
            if (exitReason === "poll_due") {
              logForDebugging(
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
        logForDebugging(
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
        const errMsg = errorMessage(err);
        logger.logError(
          `Failed to decode work secret for workId=${work.id}: ${errMsg}`
        );
        logEvent("tengu_bridge_work_secret_failed", {});
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
        logForDebugging(`[bridge:work] Acknowledging workId=${work.id}`);
        try {
          await api.acknowledgeWork(
            environmentId,
            work.id,
            secret.session_ingress_token
          );
        } catch (err) {
          logForDebugging(
            `[bridge:work] Acknowledge failed workId=${work.id}: ${errorMessage(err)}`
          );
        }
      };
      const workType = work.data.type;
      switch (work.data.type) {
        case "healthcheck":
          await ackWork();
          logForDebugging("[bridge:work] Healthcheck received");
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
            logForDebugging(
              `[bridge:work] Updated access token for existing sessionId=${sessionId} workId=${work.id}`
            );
            await ackWork();
            break;
          }
          if (activeSessions.size >= config.maxSessions) {
            logForDebugging(
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
                logForDebugging(
                  `[bridge:session] CCR v2: registered worker sessionId=${sessionId} epoch=${workerEpoch} attempt=${attempt}`
                );
                break;
              } catch (err) {
                const errMsg = errorMessage(err);
                if (attempt < 2) {
                  logForDebugging(
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
              logForDebugging(
                `[bridge:session] Created worktree for sessionId=${sessionId} at ${wt.worktreePath}`
              );
            } catch (err) {
              const errMsg = errorMessage(err);
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
          logForDebugging(
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
                logForDebugging(
                  `[bridge:title] derived title for ${compatSessionId}: ${title}`
                );
                void Promise.resolve().then(() => (init_createSession(), createSession_exports)).then(
                  ({ updateBridgeSessionTitle: updateBridgeSessionTitle2 }) => updateBridgeSessionTitle2(compatSessionId, title, {
                    baseUrl: config.apiBaseUrl
                  })
                ).catch(
                  (err) => logForDebugging(
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
                    `Failed to remove worktree ${wt.worktreePath}: ${errorMessage(err)}`
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
          logEvent("tengu_bridge_session_started", {
            active_sessions: activeSessions.size,
            spawn_mode: spawnModeAtDecision,
            in_worktree: sessionWorktrees.has(sessionId),
            spawn_duration_ms: spawnDurationMs,
            worktree_create_ms: worktreeCreateMs,
            inProtectedNamespace: isInProtectedNamespace()
          });
          logForDiagnosticsNoPII("info", "bridge_session_started", {
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
            sessionDebugFile = join4(
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
            getRemoteSessionUrl(compatSessionId, config.sessionIngressUrl)
          );
          startStatusUpdates();
          logger.setAttached(compatSessionId);
          void fetchSessionTitle(compatSessionId, config.apiBaseUrl).then((title) => {
            if (title && activeSessions.has(sessionId)) {
              titledSessions.add(compatSessionId);
              logger.setSessionTitle(compatSessionId, title);
              logForDebugging(
                `[bridge:title] server title for ${compatSessionId}: ${title}`
              );
            }
          }).catch(
            (err) => logForDebugging(
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
          logForDebugging(
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
          logForDebugging(`[bridge:work] Suppressed 403 error: ${err.message}`);
        } else {
          logger.logError(err.message);
          logError(err);
        }
        logEvent("tengu_bridge_fatal_error", {
          status: err.status,
          error_type: err.errorType
        });
        logForDiagnosticsNoPII(
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
          logForDebugging(
            `[bridge:work] Detected system sleep (${Math.round((now - lastPollErrorTime) / 1e3)}s gap), resetting error budget`
          );
          logForDiagnosticsNoPII("info", "bridge_poll_sleep_detected", {
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
          logEvent("tengu_bridge_poll_give_up", {
            error_type: "connection",
            elapsed_ms: elapsed
          });
          logForDiagnosticsNoPII("error", "bridge_poll_give_up", {
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
          logForDebugging(
            `[bridge:work] Detected system sleep (${Math.round((now - lastPollErrorTime) / 1e3)}s gap), resetting error budget`
          );
          logForDiagnosticsNoPII("info", "bridge_poll_sleep_detected", {
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
          logEvent("tengu_bridge_poll_give_up", {
            error_type: "general",
            elapsed_ms: elapsed
          });
          logForDiagnosticsNoPII("error", "bridge_poll_give_up", {
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
  logEvent("tengu_bridge_shutdown", {
    active_sessions: activeSessions.size,
    loop_duration_ms: loopDurationMs
  });
  logForDiagnosticsNoPII("info", "bridge_shutdown", {
    active_sessions: activeSessions.size,
    loop_duration_ms: loopDurationMs
  });
  const sessionsToArchive = new Set(activeSessions.keys());
  if (initialSessionId) {
    sessionsToArchive.add(initialSessionId);
  }
  const compatIdSnapshot = new Map(sessionCompatIds);
  if (activeSessions.size > 0) {
    logForDebugging(
      `[bridge:shutdown] Shutting down ${activeSessions.size} active session(s)`
    );
    logger.logStatus(
      `Shutting down ${activeSessions.size} active session(s)\u2026`
    );
    const shutdownWorkIds = new Map(sessionWorkIds);
    for (const [sessionId, handle] of activeSessions.entries()) {
      logForDebugging(
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
      logForDebugging(`[bridge:shutdown] Force-killing stuck sessionId=${sid}`);
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
      logForDebugging(
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
            `Failed to stop work ${workId} for session ${sessionId}: ${errorMessage(err)}`
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
    logForDebugging(
      `[bridge:shutdown] Skipping archive+deregister to allow resume of session ${initialSessionId}`
    );
    return;
  }
  if (sessionsToArchive.size > 0) {
    logForDebugging(
      `[bridge:shutdown] Archiving ${sessionsToArchive.size} session(s)`
    );
    await Promise.allSettled(
      [...sessionsToArchive].map(
        (sessionId) => api.archiveSession(
          compatIdSnapshot.get(sessionId) ?? toCompatSessionId(sessionId)
        ).catch(
          (err) => logger.logVerbose(
            `Failed to archive session ${sessionId}: ${errorMessage(err)}`
          )
        )
      )
    );
  }
  try {
    await api.deregisterEnvironment(environmentId);
    logForDebugging(
      `[bridge:shutdown] Environment deregistered, bridge offline`
    );
    logger.logVerbose("Environment deregistered.");
  } catch (err) {
    logger.logVerbose(`Failed to deregister environment: ${errorMessage(err)}`);
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
      logForDebugging(
        `[bridge:work] stopWork succeeded for workId=${workId} on attempt ${attempt}/${MAX_ATTEMPTS}`
      );
      return;
    } catch (err) {
      if (err instanceof BridgeFatalError) {
        if (isSuppressible403(err)) {
          logForDebugging(
            `[bridge:work] Suppressed stopWork 403 for ${workId}: ${err.message}`
          );
        } else {
          logger.logError(`Failed to stop work ${workId}: ${err.message}`);
        }
        logForDiagnosticsNoPII("error", "bridge_stop_work_failed", {
          attempts: attempt,
          fatal: true
        });
        return;
      }
      const errMsg = errorMessage(err);
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
        logForDiagnosticsNoPII("error", "bridge_stop_work_failed", {
          attempts: MAX_ATTEMPTS
        });
      }
    }
  }
}
function onSessionTimeout(sessionId, timeoutMs, logger, timedOutSessions, handle) {
  logForDebugging(
    `[bridge:session] sessionId=${sessionId} timed out after ${formatDuration(timeoutMs)}`
  );
  logEvent("tengu_bridge_session_timeout", {
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
  const { EXTERNAL_PERMISSION_MODES: EXTERNAL_PERMISSION_MODES2 } = await Promise.resolve().then(() => (init_permissions(), permissions_exports));
  const modes = EXTERNAL_PERMISSION_MODES2.join(", ");
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
  return truncateToWidth(flat, TITLE_MAX_LEN);
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
    const { PERMISSION_MODES: PERMISSION_MODES2 } = await Promise.resolve().then(() => (init_permissions(), permissions_exports));
    const valid = PERMISSION_MODES2;
    if (!valid.includes(permissionMode)) {
      console.error(
        `Error: Invalid permission mode '${permissionMode}'. Valid modes: ${valid.join(", ")}`
      );
      process.exit(1);
    }
  }
  const dir = resolve(".");
  const { enableConfigs: enableConfigs2, checkHasTrustDialogAccepted: checkHasTrustDialogAccepted2 } = await Promise.resolve().then(() => (init_config(), config_exports));
  enableConfigs2();
  const { initSinks: initSinks2 } = await Promise.resolve().then(() => (init_sinks(), sinks_exports));
  initSinks2();
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
  const { setOriginalCwd: setOriginalCwd2, setCwdState: setCwdState2 } = await Promise.resolve().then(() => (init_state(), state_exports));
  setOriginalCwd2(dir);
  setCwdState2(dir);
  if (!checkHasTrustDialogAccepted2()) {
    console.error(
      `Error: Workspace not trusted. Please run \`claude\` in ${dir} first to review and accept the workspace trust dialog.`
    );
    process.exit(1);
  }
  const { clearOAuthTokenCache: clearOAuthTokenCache2, checkAndRefreshOAuthTokenIfNeeded: checkAndRefreshOAuthTokenIfNeeded2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
  const { getBridgeAccessToken: getBridgeAccessToken2, getBridgeBaseUrl: getBridgeBaseUrl2 } = await Promise.resolve().then(() => (init_bridgeConfig(), bridgeConfig_exports));
  const bridgeToken = getBridgeAccessToken2();
  if (!bridgeToken) {
    console.error(BRIDGE_LOGIN_ERROR);
    process.exit(1);
  }
  const {
    getGlobalConfig: getGlobalConfig2,
    saveGlobalConfig: saveGlobalConfig2,
    getCurrentProjectConfig: getCurrentProjectConfig2,
    saveCurrentProjectConfig: saveCurrentProjectConfig2
  } = await Promise.resolve().then(() => (init_config(), config_exports));
  if (!getGlobalConfig2().remoteDialogSeen) {
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
    saveGlobalConfig2((current) => {
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
  const { getBranch: getBranch2, getRemoteUrl: getRemoteUrl2, findGitRoot: findGitRoot2 } = await Promise.resolve().then(() => (init_git(), git_exports));
  const { hasWorktreeCreateHook: hasWorktreeCreateHook2 } = await Promise.resolve().then(() => (init_hooks(), hooks_exports));
  const worktreeAvailable = hasWorktreeCreateHook2() || findGitRoot2(dir) !== null;
  let savedSpawnMode = multiSessionEnabled ? getCurrentProjectConfig2().remoteControlSpawnMode : void 0;
  if (savedSpawnMode === "worktree" && !worktreeAvailable) {
    console.error(
      "Warning: Saved spawn mode is worktree but this directory is not a git repository. Falling back to same-dir."
    );
    savedSpawnMode = void 0;
    saveCurrentProjectConfig2((current) => {
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
    logEvent("tengu_bridge_spawn_mode_chosen", {
      spawn_mode: chosen
    });
    saveCurrentProjectConfig2((current) => {
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
  const branch = await getBranch2();
  const gitRepoUrl = await getRemoteUrl2();
  const machineName = hostname2();
  const bridgeId = randomUUID2();
  const { handleOAuth401Error: handleOAuth401Error2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
  const api = createBridgeApiClient({
    baseUrl,
    getAccessToken: getBridgeAccessToken2,
    runnerVersion: MACRO.VERSION,
    onDebug: logForDebugging,
    onAuth401: handleOAuth401Error2,
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
    await checkAndRefreshOAuthTokenIfNeeded2();
    clearOAuthTokenCache2();
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
    logForDebugging(
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
    environmentId: randomUUID2(),
    reuseEnvironmentId,
    apiBaseUrl: baseUrl,
    sessionIngressUrl,
    debugFile,
    sessionTimeoutMs
  };
  logForDebugging(
    `[bridge:init] bridgeId=${bridgeId}${reuseEnvironmentId ? ` reuseEnvironmentId=${reuseEnvironmentId}` : ""} dir=${dir} branch=${branch} gitRepoUrl=${gitRepoUrl} machine=${machineName}`
  );
  logForDebugging(
    `[bridge:init] apiBaseUrl=${baseUrl} sessionIngressUrl=${sessionIngressUrl}`
  );
  logForDebugging(
    `[bridge:init] sandbox=${sandbox}${debugFile ? ` debugFile=${debugFile}` : ""}`
  );
  let environmentId;
  let environmentSecret;
  try {
    const reg = await api.registerBridgeEnvironment(config);
    environmentId = reg.environment_id;
    environmentSecret = reg.environment_secret;
  } catch (err) {
    logEvent("tengu_bridge_registration_failed", {
      status: err instanceof BridgeFatalError ? err.status : void 0
    });
    console.error(
      err instanceof BridgeFatalError && err.status === 404 ? "Remote Control environments are not available for your account." : `Error: ${errorMessage(err)}`
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
          logForDebugging(
            `[bridge:init] Session ${candidateId} re-queued via bridge/reconnect`
          );
          effectiveResumeSessionId = resumeSessionId;
          reconnected = true;
          break;
        } catch (err) {
          lastReconnectErr = err;
          logForDebugging(
            `[bridge:init] reconnectSession(${candidateId}) failed: ${errorMessage(err)}`
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
          isFatal ? `Error: ${errorMessage(err)}` : `Error: Failed to reconnect session ${resumeSessionId}: ${errorMessage(err)}
The session may still be resumable \u2014 try running the same command again.`
        );
        process.exit(1);
      }
    }
  }
  logForDebugging(
    `[bridge:init] Registered, server environmentId=${environmentId}`
  );
  const startupPollConfig = getPollIntervalConfig();
  logEvent("tengu_bridge_started", {
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
  logForDiagnosticsNoPII("info", "bridge_started", {
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
    onDebug: logForDebugging,
    onActivity: (sessionId, activity) => {
      logForDebugging(
        `[bridge:activity] sessionId=${sessionId} ${activity.type} ${activity.summary}`
      );
    },
    onPermissionRequest: (sessionId, request, _accessToken) => {
      logForDebugging(
        `[bridge:perm] sessionId=${sessionId} tool=${request.request.tool_name} request_id=${request.request_id} (not auto-approving)`
      );
    }
  });
  const logger = createBridgeLogger({ verbose });
  const { parseGitHubRepository: parseGitHubRepository2 } = await Promise.resolve().then(() => (init_detectRepository(), detectRepository_exports));
  const ownerRepo = gitRepoUrl ? parseGitHubRepository2(gitRepoUrl) : null;
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
      logEvent("tengu_bridge_spawn_mode_toggled", {
        spawn_mode: newMode
      });
      logger.logStatus(
        newMode === "worktree" ? "Spawn mode: worktree (new sessions get isolated git worktrees)" : "Spawn mode: same-dir (new sessions share the current directory)"
      );
      logger.setSpawnModeDisplay(newMode);
      logger.refreshDisplay();
      saveCurrentProjectConfig2((current) => {
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
    logForDebugging("[bridge:shutdown] SIGINT received, shutting down");
    controller.abort();
  };
  const onSigterm = () => {
    logForDebugging("[bridge:shutdown] SIGTERM received, shutting down");
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
        logForDebugging(
          `[bridge:init] Created initial session ${initialSessionId}`
        );
      }
    } catch (err) {
      logForDebugging(
        `[bridge:init] Session creation failed (non-fatal): ${errorMessage(err)}`
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
        clearOAuthTokenCache2();
        await checkAndRefreshOAuthTokenIfNeeded2();
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
  const { setOriginalCwd: setOriginalCwd2, setCwdState: setCwdState2 } = await Promise.resolve().then(() => (init_state(), state_exports));
  setOriginalCwd2(dir);
  setCwdState2(dir);
  const { enableConfigs: enableConfigs2, checkHasTrustDialogAccepted: checkHasTrustDialogAccepted2 } = await Promise.resolve().then(() => (init_config(), config_exports));
  enableConfigs2();
  const { initSinks: initSinks2 } = await Promise.resolve().then(() => (init_sinks(), sinks_exports));
  initSinks2();
  if (!checkHasTrustDialogAccepted2()) {
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
  const { getBranch: getBranch2, getRemoteUrl: getRemoteUrl2, findGitRoot: findGitRoot2 } = await Promise.resolve().then(() => (init_git(), git_exports));
  const { hasWorktreeCreateHook: hasWorktreeCreateHook2 } = await Promise.resolve().then(() => (init_hooks(), hooks_exports));
  if (opts.spawnMode === "worktree") {
    const worktreeAvailable = hasWorktreeCreateHook2() || findGitRoot2(dir) !== null;
    if (!worktreeAvailable) {
      throw new BridgeHeadlessPermanentError(
        `Worktree mode requires a git repository or WorktreeCreate hooks. Directory ${dir} has neither.`
      );
    }
  }
  const branch = await getBranch2();
  const gitRepoUrl = await getRemoteUrl2();
  const machineName = hostname2();
  const bridgeId = randomUUID2();
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
    environmentId: randomUUID2(),
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
    throw new Error(`Bridge registration failed: ${errorMessage(err)}`);
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
      log(`session pre-creation failed (non-fatal): ${errorMessage(err)}`);
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
  const noop2 = () => {
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
    updateIdleStatus: noop2,
    updateReconnectingStatus: noop2,
    updateSessionStatus: noop2,
    updateSessionActivity: noop2,
    updateSessionCount: noop2,
    updateFailedStatus: noop2,
    setSpawnModeDisplay: noop2,
    setRepoInfo: noop2,
    setDebugLogPath: noop2,
    setAttached: noop2,
    setSessionTitle: noop2,
    clearStatus: noop2,
    toggleQr: noop2,
    refreshDisplay: noop2
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
