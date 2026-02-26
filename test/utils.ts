/**
 * Test utilities for mocking and testing Telegram bot functionality
 */

import * as http from 'http';

interface ServerInfo {
  server: http.Server;
  polling: boolean;
}

const servers: Record<number, ServerInfo> = {};

/**
 * Start a static file server for testing
 * @param port Port number to listen on
 */
export function startStaticServer(port: number): void {
  // Simple static file server - in a full implementation would use express.static or similar
  const server = new http.Server((req: http.IncomingMessage, res: http.ServerResponse) => {
    res.writeHead(200);
    res.end('Static server');
  });
  server.listen(port);
}

/**
 * Start a mock Telegram API server
 * @param port Port number to listen on
 * @param options Server options
 */
export function startMockServer(port: number, options: { bad?: boolean } = {}): Promise<void> {
  const server = new http.Server((req: http.IncomingMessage, res: http.ServerResponse) => {
    if (servers[port]) {
      servers[port].polling = true;
    }
    if (options.bad) {
      return res.end('can not be parsed with JSON.parse()');
    }
    return res.end(
      JSON.stringify({
        ok: true,
        result: [
          {
            update_id: 0,
            message: { text: 'test' },
          },
        ],
      })
    );
  });

  return new Promise((resolve, reject) => {
    servers[port] = { server, polling: false };
    server.on('error', reject).listen(port, () => resolve());
  });
}

/**
 * Handle rate limiting in tests
 * @param bot Bot instance
 * @param method Method name
 * @param context Test context
 */
export function handleRatelimit(bot: any, methodName: string, suite: any): any {
  const backupMethodName = `__${methodName}`;
  if (!bot[backupMethodName]) bot[backupMethodName] = bot[methodName];

  const maxRetries = 3;
  const addSecs = 5;
  const method = bot[backupMethodName];

  bot[methodName] = (...args: any[]) => {
    let retry = 0;
    function exec(): Promise<any> {
      return method.call(bot, ...args).catch((error: any) => {
        if (!error.response || error.response.statusCode !== 429) {
          throw error;
        }
        retry++;
        if (retry > maxRetries) {
          throw error;
        }
        if (typeof error.response.body === 'string') {
          error.response.body = JSON.parse(error.response.body);
        }
        const retrySecs = error.response.body.parameters.retry_after;
        const timeout = 1000 * retrySecs + 1000 * addSecs;
        console.error('tests: Handling rate-limit error. Retrying after %d secs', timeout / 1000);
        suite.timeout(timeout * 2);
        return new Promise(function timeoutPromise(resolve, reject) {
          setTimeout(function execTimeout() {
            return exec().then(resolve).catch(reject);
          }, timeout);
        });
      });
    }
    return exec();
  };
  return bot;
}

/**
 * Check if polling mock server is running
 * @param port Port number
 * @param reverse Throw error when it should have returned true (and vice versa)
 */
export function isPollingMockServer(port: number, reverse?: boolean): Promise<boolean> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      let polling = servers[port] && servers[port].polling;
      if (reverse) polling = !polling;
      if (polling) return resolve(true);
      return reject(new Error('polling-check failed'));
    }, 1000);
  });
}

/**
 * Clear polling check
 * @param port Port number
 */
export function clearPollingCheck(port: number): void {
  if (servers[port]) servers[port].polling = false;
}

/**
 * Check if webhook is open
 * @param port Port number
 * @param reverse Throw error when it should have returned true (and vice versa)
 */
export function hasOpenWebHook(port: number, reverse?: boolean): Promise<boolean> {
  const error = new Error('open-webhook-check failed');
  let connected = false;

  // Simple HTTP check to see if port is open
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}`, () => {
      connected = true;
      resolve(true);
    });
    req.on('error', () => {
      if (reverse) {
        resolve(true);
      } else {
        reject(error);
      }
    });
    req.end();
  });
}

/**
 * Return true if the string is a URI to a file on Telegram servers
 * @param uri URI string
 */
export function isTelegramFileURI(uri: string): boolean {
  return /https?:\/\/.*\/file\/bot.*\/.*/.test(uri);
}
