/**
 * Minimal ambient stub so the webhook/game examples typecheck in this repo
 * without pulling Express into the library's dependency tree. Real users
 * install Express and its types themselves — `npm i express @types/express` —
 * and get the full, accurate typings.
 */
declare module 'express' {
  import type { Server } from 'node:http';

  interface Request {
    body: unknown;
  }
  interface Response {
    sendStatus(code: number): void;
    sendFile(filePath: string): void;
  }
  interface Application {
    use(...handlers: unknown[]): void;
    get(path: string, handler: (req: Request, res: Response) => void): void;
    post(path: string, handler: (req: Request, res: Response) => void): void;
    listen(port: number, callback?: () => void): Server;
  }
  interface ExpressFactory {
    (): Application;
    json(): unknown;
  }

  const express: ExpressFactory;
  export default express;
}
