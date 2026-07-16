export async function createAgentWorktree(_name: string): Promise<{ worktreePath: string; worktreeBranch?: string; gitRoot?: string; hookBased?: boolean }> {
  throw new Error('Worktree not available in standalone mode')
}
export async function removeAgentWorktree(_path: string, _branch?: string, _gitRoot?: string, _hookBased?: boolean): Promise<void> {}
