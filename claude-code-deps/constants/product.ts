export function getRemoteSessionUrl(_sessionId: string, _ingressUrl?: string): string {
  return `http://localhost:9090/session/${_sessionId}`
}
export function getClaudeAiBaseUrl(_arg?: any, _ingressUrl?: string): string {
  return process.env.BRIDGE_BASE_URL || 'http://localhost:9090'
}
