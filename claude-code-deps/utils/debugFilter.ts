export type DebugFilter = { include: string[]; exclude: string[]; isExclusive: boolean }

export const parseDebugFilter = (_filterString?: string): DebugFilter | null => null

export function shouldShowDebugMessage(_filter: DebugFilter | null, _message: string, _categories?: string[]): boolean {
  return true
}

export function extractDebugCategories(_message: string): string[] {
  return []
}

export function shouldShowDebugCategories(_filter: DebugFilter, _categories: string[]): boolean {
  return true
}
