export type Message = { type: string; [key: string]: any }
export type SDKMessage = { type: string; message?: { content?: any }; uuid?: string; [key: string]: any }
