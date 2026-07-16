export function getProjectsDir(): string { return require('path').join(require('os').homedir(), '.claude') }
export function sanitizePath(p: string): string { return p.replace(/[\/\:]/g, '_') }
