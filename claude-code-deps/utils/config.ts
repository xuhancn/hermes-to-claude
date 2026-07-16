export function enableConfigs(): void {}
export function checkHasTrustDialogAccepted(): boolean { return true }
export function getGlobalConfig(): Record<string, any> { return {} }
export function saveGlobalConfig(_fn: (c: any) => any): void {}
export function getCurrentProjectConfig(): Record<string, any> { return {} }
export function saveCurrentProjectConfig(_fn: (c: any) => any): void {}
