export async function getBranch(): Promise<string> { return 'main' }
export async function getRemoteUrl(): Promise<string | null> { return null }
export function findGitRoot(_dir: string): string | null { return null }
export async function getDefaultBranch(): Promise<string | undefined> { return undefined }
