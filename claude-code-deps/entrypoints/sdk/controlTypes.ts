export type StdoutMessage = { type: string; [key: string]: any }
export type SDKControlRequest = { type: 'control_request'; request_id: string; request: { subtype: string; [key: string]: any } }
export type SDKControlResponse = { type: 'control_response'; response: { subtype: string; request_id: string; [key: string]: any } }
