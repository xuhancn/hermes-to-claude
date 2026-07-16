/**
 * Standalone stub — creates a local session placeholder.
 */

export async function createCodeSession(): Promise<string> {
  return 'local_session'
}

export type RemoteCredentials = {
  workerJwt: string
  workerEpoch: number
  apiBaseUrl: string
}

export async function fetchRemoteCredentials(): Promise<RemoteCredentials | null> {
  return null
}
