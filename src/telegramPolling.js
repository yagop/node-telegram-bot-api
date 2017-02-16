const debug = require('debug')('node-telegram-bot-api');
const deprecate = require('depd')('node-telegram-bot-api');
const ANOTHER_WEB_HOOK_USED = 409;


class TelegramBotPolling {
  /**
   * Handles polling against the Telegram servers.
   * @param  {TelegramBot} bot
   * @see https://core.telegram.org/bots/api#getting-updates
   */
  constructor(bot) {
    this.bot = bot;
    this.options = (typeof bot.options.polling === 'boolean') ? {} : bot.options.polling;
    this.options.interval = (typeof this.options.interval === 'number') ? this.options.interval : 300;
    this.options.params = (typeof this.options.params === 'object') ? this.options.params : {};
    this.options.params.offset = (typeof this.options.params.offset === 'number') ? this.options.params.offset : 0;
    this.options.params.timeout = (typeof this.options.params.timeout === 'number') ? this.options.params.timeout : 10;
    if (typeof this.options.timeout === 'number') {
      deprecate('`options.polling.timeout` is deprecated. Use `options.polling.params` instead.');
      this.options.params.timeout = this.options.timeout;
    }
    this._lastUpdate = 0;
    this._lastRequest = null;
    this._abort = false;
    this._pollingTimeout = null;
  }

  /**
   * Start polling
   * @param  {Object} [options]
   * @param  {Object} [options.restart]
   * @return {Promise}
   */
  start(options = {}) {
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
   * @param  {Object} [options]
   * @param  {Boolean} [options.cancel] Cancel current request
   * @param  {String} [options.reason] Reason for stopping polling
   * @return {Promise}
   */
  stop(options = {}) {
    if (!this._lastRequest) {
      return Promise.resolve();
    }
    const lastRequest = this._lastRequest;
    this._lastRequest = null;
    clearTimeout(this._pollingTimeout);
    if (options.cancel) {
      const reason = options.reason || 'Polling stop';
      lastRequest.cancel(reason);
      return Promise.resolve();
    }
    this._abort = true;
    return lastRequest.finally(() => {
      this._abort = false;
    });
  }

  /**
   * Return `true` if is polling. Otherwise, `false`.
   */
  isPolling() {
    return !!this._lastRequest;
  }

  /**
   * Invokes polling (with recursion!)
   * @return {Promise} promise of the current request
   * @private
   */
  _polling() {
    this._lastRequest = this
      ._getUpdates()
      .then(updates => {
        this._lastUpdate = Date.now();
        debug('polling data %j', updates);
        updates.forEach(update => {
          this.options.params.offset = update.update_id + 1;
          debug('updated offset: %s', this.options.params.offset);
          this.bot.processUpdate(update);
        });
        return null;
      })
      .catch(err => {
        debug('polling error: %s', err.message);
        if (this.bot.listeners('polling_error').length) {
          this.bot.emit('polling_error', err);
        } else {
          console.error(err); // eslint-disable-line no-console
        }
        return null;
      })
      .finally(() => {
        if (this._abort) {
          debug('Polling is aborted!');
        } else {
          debug('setTimeout for %s miliseconds', this.options.interval);
          this._pollingTimeout = setTimeout(() => this._polling(), this.options.interval);
        }
      });
    return this._lastRequest;
  }

  /**
   * Unset current webhook. Used when we detect that a webhook has been set
   * and we are trying to poll. Polling and WebHook are mutually exclusive.
   * @see https://core.telegram.org/bots/api#getting-updates
   * @private
   */
  _unsetWebHook() {
    debug('unsetting webhook');
    return this.bot._request('setWebHook');
  }

  /**
   * Retrieve updates
   */
  _getUpdates() {
    debug('polling with options: %j', this.options.params);
    return this.bot.getUpdates(this.options.params)
      .catch(err => {
        if (err.response && err.response.statusCode === ANOTHER_WEB_HOOK_USED) {
          return this._unsetWebHook().then(() => {
            return this.bot.getUpdates(this.options.params);
          });
        }
        throw err;
      });
  }
}

module.exports = TelegramBotPolling;
