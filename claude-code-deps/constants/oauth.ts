export function getOauthConfig(): { BASE_API_URL: string } {
  return { BASE_API_URL: process.env.BRIDGE_BASE_URL || 'http://localhost:9090' }
}
