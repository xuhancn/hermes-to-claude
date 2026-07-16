/**
 * Standalone stub — no env-less bridge config needed.
 * The initReplBridge path that uses this is skipped.
 */

export function checkEnvLessBridgeMinVersion(): string | null {
  return null
}

export type EnvLessBridgeConfig = {
  baseUrl: string
  orgUUID: string
  title: string
}

export function getEnvLessBridgeConfig(): EnvLessBridgeConfig | null {
  return null
}
