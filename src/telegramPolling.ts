/// <reference types="node" />

import * as debug from 'debug';
import { TelegramBot } from './telegram';
import { errors } from './errors';
import { deprecateFunction } from './utils';
import { GetUpdatesOptions } from './types/bot-types';
import * as TelegramTypes from './types/telegram-types';

interface CancellablePromise<T> extends Promise<T> {
  cancel?: (reason?: string) => void;
}

export interface TelegramBotPollingConfig {
  interval: number;
  params: GetUpdatesOptions;
}

const debugLog = debug.default('node-telegram-bot-api');
const ANOTHER_WEB_HOOK_USED = 409;

export class TelegramBotPolling {
  private bot: TelegramBot;
  private options: TelegramBotPollingConfig;
  private _lastUpdate = 0;
  private _lastRequest: CancellablePromise<void | null> | null = null;
  private _abort = false;
  private _pollingTimeout: NodeJS.Timeout | null = null;

  /**
   * Handles polling against the Telegram servers.
   * @param bot
   */
  constructor(bot: TelegramBot) {
    this.bot = bot;
    this.options = {
      interval: 300,
      params: {
        offset: 0,
        timeout: 10,
      },
    };

    if (typeof bot.options.polling === 'object') {
      const pollingOptions = bot.options.polling;
      this.options.interval = pollingOptions.interval || 300;
      this.options.params = {
        offset: (pollingOptions.params?.offset as number) || 0,
        timeout: (pollingOptions.params?.timeout as number) || 10,
        ...pollingOptions.params,
      };

      if (typeof pollingOptions.timeout === 'number') {
        deprecateFunction(
          '`options.polling.timeout` is deprecated. Use `options.polling.params` instead.'
        );
        this.options.params.timeout = pollingOptions.timeout;
      }
    }
  }

  /**
   * Start polling
   * @param options
   * @return Promise
   */
  start(options: { restart?: boolean } = {}): Promise<void> {
    if (this._lastRequest) {
      if (!options.restart) {
        return Promise.resolve();
      }
      return this.stop({
        cancel: true,
        reason: 'Polling restart',
      }).then(() => {
        return this._polling();
      });
    }
    return this._polling();
  }

  /**
   * Stop polling
   * @param options Options
   * @return Promise
   */
  stop(options: { cancel?: boolean; reason?: string } = {}): Promise<void> {
    if (!this._lastRequest) {
      return Promise.resolve();
    }
    const lastRequest = this._lastRequest;
    this._lastRequest = null;
    if (this._pollingTimeout) {
      clearTimeout(this._pollingTimeout);
      this._pollingTimeout = null;
    }
    if (options.cancel) {
      const reason = options.reason || 'Polling stop';
      // Note: This assumes the request has a cancel method
      (lastRequest as CancellablePromise<void | null>).cancel?.(reason);
      return Promise.resolve();
    }
    this._abort = true;
    return lastRequest.finally(() => {
      this._abort = false;
    }) as Promise<void>;
  }

  /**
   * Return `true` if is polling. Otherwise, `false`.
   */
  isPolling(): boolean {
    return !!this._lastRequest;
  }

  /**
   * Handle error thrown during polling.
   * @private
   * @param error
   */
  private _error(error: Error): void {
    if (!this.bot.listeners('polling_error').length) {
      console.error('error: [polling_error] %j', error); // eslint-disable-line no-console
      return;
    }
    this.bot.emit('polling_error', error);
  }

  /**
   * Invokes polling (with recursion!)
   * @return promise of the current request
   * @private
   */
  private async _polling(): Promise<void> {
    this._lastRequest = this._getUpdates()
      .then((updates) => {
        this._lastUpdate = Date.now();
        debugLog('polling data %j', updates);
        (updates as TelegramTypes.Update[]).forEach((update: TelegramTypes.Update) => {
          this.options.params.offset = update.update_id + 1;
          debugLog('updated offset: %s', this.options.params.offset);
          try {
            this.bot.processUpdate(update);
          } catch (err: unknown) {
            (err as Error & { _processing?: boolean })._processing = true;
            throw err;
          }
        });
        return null;
      })
      .catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        debugLog('polling error: %s', error.message);
        if (!(error as Error & { _processing?: boolean })._processing) {
          return this._error(error);
        }
        delete (error as Error & { _processing?: boolean })._processing;
        /*
         * An error occured while processing the items,
         * i.e. in `this.bot.processUpdate()` above.
         * We need to mark the already-processed items
         * to avoid fetching them again once the application
         * is restarted, or moves to next polling interval
         * (in cases where unhandled rejections do not terminate
         * the process).
         * See https://github.com/yagop/node-telegram-bot-api/issues/36#issuecomment-268532067
         */
        if (!this.bot.options.badRejection) {
          return this._error(error);
        }
        const opts = {
          offset: this.options.params.offset,
          limit: 1,
          timeout: 0,
        };
        return this.bot
          .getUpdates(opts)
          .then(() => {
            return this._error(error);
          })
          .catch((requestErr: Error) => {
            /*
             * We have been unable to handle this error.
             * We have to log this to stderr to ensure devops
             * understands that they may receive already-processed items
             * on app restart.
             * We simply can not rescue this situation, emit "error"
             * event, with the hope that the application exits.
             */
            /* eslint-disable no-console */
            const bugUrl =
              'https://github.com/yagop/node-telegram-bot-api/issues/36#issuecomment-268532067';
            console.error('error: Internal handling of The Offset Infinite Loop failed');
            console.error(`error: Due to error '${requestErr}'`);
            console.error('error: You may receive already-processed updates on app restart');
            console.error(`error: Please see ${bugUrl} for more information`);
            /* eslint-enable no-console */
            this.bot.emit('error', new errors.FatalError(error));
          });
      })
      .finally(() => {
        if (this._abort) {
          debugLog('Polling is aborted!');
        } else {
          debugLog('setTimeout for %s miliseconds', this.options.interval);
          this._pollingTimeout = setTimeout(() => this._polling(), this.options.interval);
        }
      });
  }

  /**
   * Unset current webhook. Used when we detect that a webhook has been set
   * and we are trying to poll. Polling and WebHook are mutually exclusive.
   * @private
   */
  private _unsetWebHook(): Promise<unknown> {
    debugLog('unsetting webhook');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.bot as any)._request('setWebHook');
  }

  /**
   * Retrieve updates
   */
  private _getUpdates(): Promise<unknown> {
    debugLog('polling with options: %j', this.options.params);
    return this.bot.getUpdates(this.options.params as GetUpdatesOptions).catch((err: unknown) => {
      const error = err as { response?: { statusCode?: number } };
      if (error.response && error.response.statusCode === ANOTHER_WEB_HOOK_USED) {
        return this._unsetWebHook().then(() => {
          return this.bot.getUpdates(this.options.params as GetUpdatesOptions);
        });
      }
      throw err;
    });
  }
}
