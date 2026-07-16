/**
 * Simplified bridge config for standalone mode.
 * No real OAuth — returns null tokens and configurable base URL.
 */

import { hostname } from 'os'

/** Stub: returns null in standalone mode */
export function getBridgeAccessToken(): string | undefined {
  return undefined
}

/** Return configured base URL or default */
export function getBridgeBaseUrl(): string {
  return process.env.BRIDGE_BASE_URL ?? 'http://localhost:9090'
}

/** Stub: returns undefined */
export function getBridgeTokenOverride(): string | undefined {
  return undefined
}

/** Stub: returns undefined */
export function getBridgeBaseUrlOverride(): string | undefined {
  return undefined
}
