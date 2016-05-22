'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Promise = require('bluebird');
var debug = require('debug')('node-telegram-bot-api');
var request = require('request-promise');
var URL = require('url');
var ANOTHER_WEB_HOOK_USED = 409;

var TelegramBotPolling = function () {
  function TelegramBotPolling(token) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
    var callback = arguments[2];

    _classCallCheck(this, TelegramBotPolling);

    // enable cancellation
    Promise.config({
      cancellation: true
    });

    if (typeof options === 'function') {
      callback = options; // eslint-disable-line no-param-reassign
      options = {}; // eslint-disable-line no-param-reassign
    }

    this.offset = 0;
    this.token = token;
    this.callback = callback;
    this.timeout = options.timeout || 10;
    this.interval = typeof options.interval === 'number' ? options.interval : 300;
    this.lastUpdate = 0;
    this.lastRequest = null;
    this.abort = false;
    this._polling();
  }

  _createClass(TelegramBotPolling, [{
    key: '_polling',
    value: function _polling() {
      var _this = this;

      this.lastRequest = this._getUpdates().then(function (updates) {
        _this.lastUpdate = Date.now();
        debug('polling data %j', updates);
        updates.forEach(function (update) {
          _this.offset = update.update_id;
          debug('updated offset: %s', _this.offset);
          _this.callback(update);
        });
      }).catch(function (err) {
        debug('polling error: %s', err.message);
        throw err;
      }).finally(function () {
        if (_this.abort) {
          debug('Polling is aborted!');
        } else {
          debug('setTimeout for %s miliseconds', _this.interval);
          setTimeout(function () {
            return _this._polling();
          }, _this.interval);
        }
      });
    }

    // used so that other funcs are not non-optimizable

  }, {
    key: '_safeParse',
    value: function _safeParse(json) {
      try {
        return JSON.parse(json);
      } catch (err) {
        throw new Error('Error parsing Telegram response: ' + String(json));
      }
    }
  }, {
    key: '_unsetWebHook',
    value: function _unsetWebHook() {
      return request({
        url: URL.format({
          protocol: 'https',
          host: 'api.telegram.org',
          pathname: '/bot' + this.token + '/setWebHook'
        }),
        simple: false,
        resolveWithFullResponse: true
      }).promise().then(function (resp) {
        if (!resp) {
          throw new Error(resp);
        }
        return [];
      });
    }
  }, {
    key: '_getUpdates',
    value: function _getUpdates() {
      var _this2 = this;

      var opts = {
        qs: {
          offset: this.offset + 1,
          limit: this.limit,
          timeout: this.timeout
        },
        url: URL.format({
          protocol: 'https',
          host: 'api.telegram.org',
          pathname: '/bot' + this.token + '/getUpdates'
        }),
        simple: false,
        resolveWithFullResponse: true,
        forever: true
      };
      debug('polling with options: %j', opts);

      return request(opts).promise().timeout((10 + this.timeout) * 1000).then(function (resp) {
        if (resp.statusCode === ANOTHER_WEB_HOOK_USED) {
          return _this2._unsetWebHook();
        }

        if (resp.statusCode !== 200) {
          throw new Error(resp.statusCode + ' ' + resp.body);
        }

        var data = _this2._safeParse(resp.body);

        if (data.ok) {
          return data.result;
        }

        throw new Error(data.error_code + ' ' + data.description);
      });
    }
  }]);

  return TelegramBotPolling;
}();

module.exports = TelegramBotPolling;