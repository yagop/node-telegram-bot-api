/// <reference types="node" />

import * as debug from 'debug';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as bl from 'bl';
import { IncomingMessage, ServerResponse } from 'http';

import { TelegramBot } from './telegram';
import { errors } from './errors';
import { WebHookOptions } from './types/bot-types';

const debugLog = debug.default('node-telegram-bot-api');

export class TelegramBotWebHook {
  private bot: TelegramBot;
  private options: WebHookOptions;
  private _healthRegex: RegExp;
  private _webServer: http.Server | https.Server;
  private _open = false;

  /**
   * Sets up a webhook to receive updates
   * @param bot
   */
  constructor(bot: TelegramBot) {
    this.bot = bot;
    this.options = {
      host: '0.0.0.0',
      port: 8443,
      https: {},
      healthEndpoint: '/healthz',
      autoOpen: true,
      ...(typeof bot.options.webHook === 'object' ? bot.options.webHook : {}),
    };

    this._healthRegex = new RegExp(this.options.healthEndpoint || '/healthz');

    if (
      this.options.key &&
      this.options.cert &&
      this.options.https &&
      typeof this.options.https === 'object'
    ) {
      debugLog('HTTPS WebHook enabled (by key/cert)');
      this.options.https.key = fs.readFileSync(this.options.key);
      this.options.https.cert = fs.readFileSync(this.options.cert);
      this._webServer = https.createServer(this.options.https, this._requestListener.bind(this));
    } else if (this.options.pfx && this.options.https && typeof this.options.https === 'object') {
      debugLog('HTTPS WebHook enabled (by pfx)');
      this.options.https.pfx = fs.readFileSync(this.options.pfx);
      this._webServer = https.createServer(this.options.https, this._requestListener.bind(this));
    } else if (
      this.options.https &&
      typeof this.options.https === 'object' &&
      Object.keys(this.options.https).length
    ) {
      debugLog('HTTPS WebHook enabled by (https)');
      this._webServer = https.createServer(this.options.https, this._requestListener.bind(this));
    } else {
      debugLog('HTTP WebHook enabled');
      this._webServer = http.createServer(this._requestListener.bind(this));
    }
  }

  /**
   * Open WebHook by listening on the port
   * @return Promise
   */
  open(): Promise<void> {
    if (this.isOpen()) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this._webServer.listen(this.options.port, this.options.host, () => {
        debugLog('WebHook listening on port %s', this.options.port);
        this._open = true;
        return resolve();
      });

      this._webServer.once('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Close the webHook
   * @return Promise
   */
  close(): Promise<void> {
    if (!this.isOpen()) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this._webServer.close((error?: Error) => {
        if (error) return reject(error);
        this._open = false;
        return resolve();
      });
    });
  }

  /**
   * Return `true` if server is listening. Otherwise, `false`.
   */
  isOpen(): boolean {
    return this._open;
  }

  /**
   * Return `true` if server is listening. Otherwise, `false`.
   * Alias for `isOpen()`.
   */
  hasOpenWebHook(): boolean {
    return this.isOpen();
  }

  /**
   * Handle error thrown during processing of webhook request.
   * @private
   * @param error
   */
  private _error(error: Error): void {
    if (!this.bot.listeners('webhook_error').length) {
      console.error('error: [webhook_error] %j', error); // eslint-disable-line no-console
      return;
    }
    this.bot.emit('webhook_error', error);
  }

  /**
   * Handle request body by passing it to 'callback'
   * @private
   */
  private _parseBody(error: Error | null, body: Buffer): void {
    if (error) {
      return this._error(new errors.FatalError(error));
    }

    let data;
    try {
      data = JSON.parse(body.toString());
    } catch (parseError: unknown) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      return this._error(new errors.FatalError(errorMessage));
    }

    return this.bot.processUpdate(data);
  }

  /**
   * Listener for 'request' event on server
   * @private
   */
  private _requestListener(req: IncomingMessage, res: ServerResponse): void {
    debugLog('WebHook request URL: %s', req.url);
    debugLog('WebHook request headers: %j', req.headers);

    if (req.url && req.url.indexOf(this.bot.token) !== -1) {
      if (req.method !== 'POST') {
        debugLog("WebHook request isn't a POST");
        res.statusCode = 418; // I'm a teabot!
        res.end();
      } else {
        req.pipe(bl(this._parseBody)).on('finish', () => res.end('OK'));
      }
    } else if (req.url && this._healthRegex.test(req.url)) {
      debugLog('WebHook health check passed');
      res.statusCode = 200;
      res.end('OK');
    } else {
      debugLog('WebHook request unauthorized');
      res.statusCode = 401;
      res.end();
    }
  }
}
