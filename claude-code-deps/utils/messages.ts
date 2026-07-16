export function getContentText(content: any): string | undefined { return typeof content === 'string' ? content : undefined }
export function getMessagesAfterCompactBoundary(msgs: any[]): any[] { return msgs }
export function isSyntheticMessage(_msg: any): boolean { return false }
