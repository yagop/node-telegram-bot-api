export function startStaticServer(port: number): void;
export function startMockServer(port: number, options?: { bad?: boolean }): Promise<void>;
export function handleRatelimit(bot: any, methodName: string, suite: any): void;
export function isPollingMockServer(port: number, reverse?: boolean): Promise<boolean>;
export function hasOpenWebHook(port: number, reverse?: boolean): Promise<boolean>;
export function sendWebHookRequest(port: number, path: string, options?: any): Promise<any>;
export function clearPollingCheck(port: number): void;
export function isTelegramFileURI(uri: string): boolean;
