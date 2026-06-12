import createDebug from "./internal/debug.js";

import { FatalError } from "./errors.js";
import type { TelegramBot } from "./telegram.js";
import type { GetUpdatesParams, Update } from "./types/schemas.js";

const debug = createDebug("node-telegram-bot-api:polling");

const ANOTHER_WEB_HOOK_USED = 409;

export interface PollingOptions {
  /** Polling interval in milliseconds between successive `getUpdates` calls. */
  interval?: number;
  /** Whether to start polling automatically when the bot is constructed. */
  autoStart?: boolean;
  /** Parameters forwarded to `getUpdates`. */
  params?: GetUpdatesParams;
  /** @deprecated Use `params.timeout` instead. */
  timeout?: number;
}

export interface PollingStartOptions {
  restart?: boolean;
}

export interface PollingStopOptions {
  cancel?: boolean;
  reason?: string;
}

interface InternalParams extends GetUpdatesParams {
  offset: number;
  timeout: number;
}

export class TelegramBotPolling {
  private readonly bot: TelegramBot;
  public readonly interval: number;
  public readonly params: InternalParams;
  private _abort = false;
  private _abortController?: AbortController;
  private _activeRequest: Promise<unknown> | null = null;
  private _pollingTimeout: NodeJS.Timeout | null = null;
  private _running = false;

  constructor(bot: TelegramBot, options: PollingOptions = {}) {
    this.bot = bot;
    this.interval = typeof options.interval === "number" ? options.interval : 300;
    const params: GetUpdatesParams = options.params ?? {};
    this.params = {
      ...params,
      offset: typeof params.offset === "number" ? params.offset : 0,
      timeout: typeof params.timeout === "number" ? params.timeout : 10,
    };
    if (typeof options.timeout === "number") {
      this.params.timeout = options.timeout;
    }
  }

  /**
   * Start polling. If polling is already running, the call resolves immediately
   * unless `restart: true` is passed (in which case the previous loop is cancelled
   * before a fresh one is started).
   */
  async start(options: PollingStartOptions = {}): Promise<void> {
    if (this._running) {
      if (!options.restart) return;
      await this.stop({ cancel: true, reason: "Polling restart" });
    }
    this._running = true;
    this._abort = false;
    void this._loop();
  }

  /**
   * Stop polling. Resolves once the current `getUpdates` call has completed.
   */
  async stop(options: PollingStopOptions = {}): Promise<void> {
    if (!this._running) return;
    this._running = false;
    if (this._pollingTimeout) {
      clearTimeout(this._pollingTimeout);
      this._pollingTimeout = null;
    }
    if (options.cancel && this._abortController) {
      this._abortController.abort(options.reason ?? "Polling stop");
    }
    this._abort = true;
    if (this._activeRequest) {
      try {
        await this._activeRequest;
      } catch {
        /* swallow — caller has already been notified */
      }
    }
  }

  isPolling(): boolean {
    return this._running;
  }

  private _emitError(err: unknown): void {
    if (!this.bot.listeners("polling_error").length) {
      // Fallback: log to stderr.
      // eslint-disable-next-line no-console
      console.error(`${new Date().toISOString()} error: [polling_error] %j`, err);
      return;
    }
    this.bot.emit("polling_error", err);
  }

  private _scheduleNext(): void {
    if (!this._running || this._abort) {
      debug("Polling aborted");
      return;
    }
    debug("setTimeout for %s milliseconds", this.interval);
    this._pollingTimeout = setTimeout(() => void this._loop(), this.interval);
  }

  private async _loop(): Promise<void> {
    const request = this._poll();
    this._activeRequest = request;
    try {
      await request;
    } finally {
      this._activeRequest = null;
      this._scheduleNext();
    }
  }

  private async _poll(): Promise<void> {
    try {
      const updates = await this._getUpdates();
      debug("polling data %j", updates);
      for (const update of updates) {
        this.params.offset = update.update_id + 1;
        debug("updated offset: %s", this.params.offset);
        try {
          this.bot.processUpdate(update);
        } catch (err) {
          (err as { _processing?: boolean })._processing = true;
          throw err;
        }
      }
    } catch (err) {
      const flagged = err as { _processing?: boolean; response?: { status?: number } };
      debug("polling error: %s", (err as Error).message);
      if (!flagged._processing) {
        this._emitError(err);
        return;
      }
      delete flagged._processing;
      // Update-processing failure handling — see the original library's discussion at
      // https://github.com/yagop/node-telegram-bot-api/issues/36#issuecomment-268532067
      try {
        await this.bot.getUpdates({
          offset: this.params.offset,
          limit: 1,
          timeout: 0,
        });
        this._emitError(err);
      } catch (requestErr) {
        // eslint-disable-next-line no-console
        console.error(
          `${new Date().toISOString()} error: Internal handling of The Offset Infinite Loop failed`,
          requestErr,
        );
        this.bot.emit("error", new FatalError(err as Error));
      }
    }
  }

  private async _getUpdates(): Promise<Update[]> {
    debug("polling with options: %j", this.params);
    try {
      return await this.bot.getUpdates(this.params);
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === ANOTHER_WEB_HOOK_USED) {
        debug("unsetting webhook because polling is in use");
        await this.bot.deleteWebHook();
        return this.bot.getUpdates(this.params);
      }
      throw err;
    }
  }
}
