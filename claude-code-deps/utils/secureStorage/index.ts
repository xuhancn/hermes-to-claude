export function getSecureStorage(): { read(): any; update(data: any): { success: boolean; warning?: string } } {
  return { read: () => ({}), update: () => ({ success: true }) }
}
