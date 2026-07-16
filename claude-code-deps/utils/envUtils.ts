export function isEnvTruthy(val: string | undefined): boolean { return val === '1' || val === 'true' }
export function isInProtectedNamespace(): boolean { return false }
export function getClaudeConfigHomeDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  return require('path').join(home, '.claude')
}
