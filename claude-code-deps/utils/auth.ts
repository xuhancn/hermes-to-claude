export function getClaudeAIOAuthTokens(): { accessToken?: string; expiresAt?: number | null } | null { return null }
export function isClaudeAISubscriber(): boolean { return false }
export function hasProfileScope(): boolean { return false }
export function getOauthAccountInfo(): { organizationUuid?: string } | null { return null }
export async function checkAndRefreshOAuthTokenIfNeeded(): Promise<void> {}
export async function handleOAuth401Error(_token: string): Promise<boolean> { return true }
export function clearOAuthTokenCache(): void {}
