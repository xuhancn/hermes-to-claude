/**
 * Simplified bridge API client for standalone mode.
 * Real HTTP calls to CCR backend are stubbed — returns null/empty data.
 */

import { BRIDGE_LOGIN_INSTRUCTION, type BridgeApiClient, type BridgeConfig, type WorkResponse } from './types.js'

export class BridgeFatalError extends Error {
  readonly status: number
  readonly errorType: string | undefined
  constructor(message: string, status: number, errorType?: string) {
    super(message)
    this.name = 'BridgeFatalError'
    this.status = status
    this.errorType = errorType
  }
}

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

export function validateBridgeId(id: string, label: string): string {
  if (!id || !SAFE_ID_PATTERN.test(id)) {
    throw new Error(`Invalid ${label}: contains unsafe characters`)
  }
  return id
}

export function isExpiredErrorType(_errorType: string | undefined): boolean {
  return false
}

export function isSuppressible403(_err: BridgeFatalError): boolean {
  return false
}

export function createBridgeApiClient(_deps: {
  baseUrl: string
  getAccessToken: () => string | undefined
  runnerVersion: string
  onDebug?: (msg: string) => void
  onAuth401?: (staleAccessToken: string) => Promise<boolean>
  getTrustedDeviceToken?: () => string | undefined
}): BridgeApiClient {
  const debug = _deps.onDebug ?? (() => {})

  return {
    async registerBridgeEnvironment(_config: BridgeConfig) {
      debug('[bridge:api] HERMES MODE — registerBridgeEnvironment stub')
      return { environment_id: 'local-env', environment_secret: 'local-secret' }
    },

    async pollForWork(_environmentId: string, _environmentSecret: string, _signal?: AbortSignal) {
      debug('[bridge:api] HERMES MODE — pollForWork stub (returns null)')
      return null as unknown as WorkResponse
    },

    async acknowledgeWork(_environmentId: string, _workId: string, _sessionToken: string) {
      debug('[bridge:api] HERMES MODE — acknowledgeWork stub')
    },

    async stopWork(_environmentId: string, _workId: string, _force: boolean) {
      debug('[bridge:api] HERMES MODE — stopWork stub')
    },

    async deregisterEnvironment(_environmentId: string) {
      debug('[bridge:api] HERMES MODE — deregisterEnvironment stub')
    },

    async archiveSession(_sessionId: string) {
      debug('[bridge:api] HERMES MODE — archiveSession stub')
    },

    async reconnectSession(_environmentId: string, _sessionId: string) {
      debug('[bridge:api] HERMES MODE — reconnectSession stub')
    },

    async heartbeatWork(_environmentId: string, _workId: string, _sessionToken: string) {
      debug('[bridge:api] HERMES MODE — heartbeatWork stub')
      return { lease_extended: false, state: 'unknown' }
    },

    async sendPermissionResponseEvent(_sessionId: string, _event: any, _sessionToken: string) {
      debug('[bridge:api] HERMES MODE — sendPermissionResponseEvent stub')
    },
  }
}
