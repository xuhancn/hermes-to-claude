/**
 * Simplified bridge enabled checks for standalone mode.
 * All features assumed enabled (no GrowthBook dependency).
 */

export function isBridgeEnabled(): boolean {
  return true
}

export async function isBridgeEnabledBlocking(): Promise<boolean> {
  return true
}

export async function getBridgeDisabledReason(): Promise<string | null> {
  return null
}

export function isEnvLessBridgeEnabled(): boolean {
  return false
}

export function isCseShimEnabled(): boolean {
  return true
}

export function checkBridgeMinVersion(): string | null {
  return null
}

export function getCcrAutoConnectDefault(): boolean {
  return false
}

export function isCcrMirrorEnabled(): boolean {
  return false
}
