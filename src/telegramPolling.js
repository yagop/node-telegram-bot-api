const Promise = require('bluebird');
const debug = require('debug')('node-telegram-bot-api');
const request = require('request-promise');
const URL = require('url');

class TelegramBotPolling {

  constructor(token, options = {}, callback) {
    // enable cancellation
    Promise.config({
      cancellation: true,
    });

    if (typeof options === 'function') {
      callback = options; // eslint-disable-line no-param-reassign
      options = {}; // eslint-disable-line no-param-reassign
    }

    this.offset = 0;
    this.token = token;
    this.callback = callback;
    this.timeout = options.timeout || 10;
    this.interval = (typeof options.interval === 'number') ? options.interval : 300;
    this.lastUpdate = 0;
    this.lastRequest = null;
    this.abort = false;
    this._polling();
  }

  _polling() {
    this.lastRequest = this
      ._getUpdates()
      .then(updates => {
        this.lastUpdate = Date.now();
        debug('polling data %j', updates);
        updates.forEach(update => {
          this.offset = update.update_id;
          debug('updated offset: %s', this.offset);
          this.callback(update);
        });
      })
      .catch(err => {
        debug('polling error: %s', err.message);
        throw err;
      })
      .finally(() => {
        if (this.abort) {
          debug('Polling is aborted!');
        } else {
          debug('setTimeout for %s miliseconds', this.interval);
          setTimeout(() => this._polling(), this.interval);
        }
      });
  }

  // used so that other funcs are not non-optimizable
  _safeParse(json) {
    try {
      return JSON.parse(json);
    } catch (err) {
      throw new Error(`Error parsing Telegram response: ${String(json)}`);
    }
  }

  _getUpdates() {
    const opts = {
      qs: {
        offset: this.offset + 1,
        limit: this.limit,
        timeout: this.timeout
      },
      url: URL.format({
        protocol: 'https',
        host: 'api.telegram.org',
        pathname: `/bot${this.token}/getUpdates`
      }),
      simple: false,
      resolveWithFullResponse: true,
      forever: true,
    };
    debug('polling with options: %j', opts);

    return request(opts)
      .promise()
      .timeout((10 + this.timeout) * 1000)
      .then(resp => {
        if (resp.statusCode !== 200) {
          throw new Error(`${resp.statusCode} ${resp.body}`);
        }

        const data = this._safeParse(resp.body);

        if (data.ok) {
          return data.result;
        }

        throw new Error(`${data.error_code} ${data.description}`);
      });
  }

}

module.exports = TelegramBotPolling;
