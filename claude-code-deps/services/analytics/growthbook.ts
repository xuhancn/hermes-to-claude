export async function checkGate_CACHED_OR_BLOCKING(_gate: string): Promise<boolean> { return false }
export function getFeatureValue_CACHED_MAY_BE_STALE<T>(_key: string, defaultValue: T): T { return defaultValue }
export function getDynamicConfig_CACHED_MAY_BE_STALE<T>(_key: string, defaultValue: T): T { return defaultValue }
export function getFeatureValue_CACHED_WITH_REFRESH<T>(_key: string, defaultValue: T): T { return defaultValue }
