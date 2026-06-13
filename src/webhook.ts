import createDebug from "./internal/debug.js";
import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import type { Server as HttpServer, IncomingMessage, ServerResponse } from "node:http";
import type { Server as HttpsServer } from "node:https";
import { Buffer } from "node:buffer";

import { BaseError, FatalError, ParseError } from "./errors.js";
import type { TelegramBot } from "./telegram.js";
import type { Update } from "./types/schemas.js";

const debug = createDebug("node-telegram-bot-api:webhook");

export interface WebHookOptions {
  host?: string;
  port?: number;
  /** Path to a PEM private key. Read synchronously at construction time. */
  key?: string;
  /** Path to a PEM certificate. Read synchronously at construction time. */
  cert?: string;
  /** Path to a PFX archive. Read synchronously at construction time. */
  pfx?: string;
  /** Raw `https.createServer` options that are merged with key/cert/pfx above. */
  https?: https.ServerOptions;
  /** Endpoint that always returns 200 OK — useful for healthchecks. */
  healthEndpoint?: string;
  /** Open the webhook automatically when the bot is constructed. */
  autoOpen?: boolean;
  /** When set, requests must include this token in `X-Telegram-Bot-Api-Secret-Token`. */
  secretToken?: string;
}

const MAX_PAYLOAD_BYTES = 50 * 1024 * 1024; // 50MB

async function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_PAYLOAD_BYTES) {
        reject(new Error("Webhook payload exceeds 50MB safety cap"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export class TelegramBotWebHook {
  private readonly bot: TelegramBot;
  public readonly host: string;
  public readonly port: number;
  public readonly healthEndpoint: string;
  private readonly _secretToken?: string;
  private readonly _server: HttpServer | HttpsServer;
  private _open = false;

  constructor(bot: TelegramBot, options: WebHookOptions = {}) {
    this.bot = bot;
    this.host = options.host ?? "0.0.0.0";
    this.port = options.port ?? 8443;
    this.healthEndpoint = options.healthEndpoint ?? "/healthz";
    this._secretToken = options.secretToken;

    const httpsOptions: https.ServerOptions = { ...(options.https ?? {}) };

    if (options.key && options.cert) {
      debug("HTTPS WebHook enabled (by key/cert)");
      httpsOptions.key = readFileSync(options.key);
      httpsOptions.cert = readFileSync(options.cert);
      this._server = https.createServer(httpsOptions, this._handleRequest);
    } else if (options.pfx) {
      debug("HTTPS WebHook enabled (by pfx)");
      httpsOptions.pfx = readFileSync(options.pfx);
      this._server = https.createServer(httpsOptions, this._handleRequest);
    } else if (Object.keys(httpsOptions).length) {
      debug("HTTPS WebHook enabled (by https options)");
      this._server = https.createServer(httpsOptions, this._handleRequest);
    } else {
      debug("HTTP WebHook enabled");
      this._server = http.createServer(this._handleRequest);
    }
  }

  /** Begin listening for incoming Telegram webhook requests. */
  async open(): Promise<void> {
    if (this.isOpen()) return;
    await new Promise<void>((resolve, reject) => {
      const onError = (err: Error) => reject(err);
      this._server.once("error", onError);
      this._server.listen(this.port, this.host, () => {
        this._server.off("error", onError);
        debug("WebHook listening on %s:%s", this.host, this.port);
        this._open = true;
        resolve();
      });
    });
  }

  /** Stop accepting requests. Resolves once existing connections drain. */
  async close(): Promise<void> {
    if (!this.isOpen()) return;
    await new Promise<void>((resolve, reject) => {
      this._server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        this._open = false;
        resolve();
      });
    });
  }

  isOpen(): boolean {
    return this._open;
  }

  private _emitError(err: unknown): void {
    if (!this.bot.listeners("webhook_error").length) {
      // eslint-disable-next-line no-console
      console.error(`${new Date().toISOString()} error: [webhook_error] %j`, err);
      return;
    }
    this.bot.emit("webhook_error", err);
  }

  /**
   * Authorize a webhook request by its path. The bot token must appear as a
   * complete `/`-delimited path segment - either the documented `/bot<token>`
   * segment or a bare `/<token>` segment (optionally nested under a custom
   * prefix). Matching whole segments rather than a raw substring means a crafted
   * path that merely embeds the token (e.g. `/bot<token>extra`) no longer
   * authorizes. For stronger authentication, set the `secretToken` option to
   * have Telegram's `X-Telegram-Bot-Api-Secret-Token` header validated as well.
   */
  private _isAuthorizedPath(pathname: string): boolean {
    const token = this.bot.token;
    return pathname.split("/").some((segment) => segment === token || segment === `bot${token}`);
  }

  private readonly _handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    debug("WebHook request URL: %s", req.url ?? "");

    const url = req.url ?? "";
    const pathname = url.split("?")[0]!;

    if (pathname === this.healthEndpoint) {
      debug("WebHook health check passed");
      res.statusCode = 200;
      res.end("OK");
      return;
    }

    if (!this._isAuthorizedPath(pathname)) {
      debug("WebHook request unauthorized");
      res.statusCode = 401;
      res.end();
      return;
    }

    if (req.method !== "POST") {
      debug("WebHook request isn't a POST");
      res.statusCode = 418; // I'm a teabot!
      res.end();
      return;
    }

    if (this._secretToken) {
      const provided = req.headers["x-telegram-bot-api-secret-token"];
      if (provided !== this._secretToken) {
        debug("WebHook secret-token mismatch");
        res.statusCode = 401;
        res.end();
        return;
      }
    }

    try {
      const buffer = await readBody(req);
      let update: Update;
      try {
        update = JSON.parse(buffer.toString("utf8")) as Update;
      } catch (parseError) {
        this._emitError(new ParseError((parseError as Error).message));
        res.statusCode = 400;
        res.end("Bad Request");
        return;
      }
      this.bot.processUpdate(update);
      res.end("OK");
    } catch (err) {
      this._emitError(err instanceof BaseError ? err : new FatalError(err as Error));
      res.statusCode = 500;
      res.end("Server Error");
    }
  };
}
