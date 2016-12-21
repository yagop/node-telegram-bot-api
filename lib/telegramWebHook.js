'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = require('debug')('node-telegram-bot-api');
var https = require('https');
var http = require('http');
var fs = require('fs');
var bl = require('bl');

var TelegramBotWebHook = function () {
  function TelegramBotWebHook(token, options, callback) {
    var _this = this;

    _classCallCheck(this, TelegramBotWebHook);

    this._parseBody = function (err, body) {
      if (err) {
        return debug(err);
      }

      var data = _this._safeParse(body);
      if (data) {
        return _this.callback(data);
      }

      return null;
    };

    this._requestListener = function (req, res) {
      debug('WebHook request URL: %s', req.url);
      debug('WebHook request headers: %j', req.headers);

      // If there isn't token on URL
      if (!_this.regex.test(req.url)) {
        debug('WebHook request unauthorized');
        res.statusCode = 401;
        res.end();
      } else if (req.method === 'POST') {
        req.pipe(bl(_this._parseBody)).on('finish', function () {
          return res.end('OK');
        });
      } else {
        // Authorized but not a POST
        debug('WebHook request isn\'t a POST');
        res.statusCode = 418; // I'm a teabot!
        res.end();
      }
    };

    this.token = token;
    this.callback = callback;
    this.regex = new RegExp(this.token);

    // define opts
    if (typeof options === 'boolean') {
      options = {}; // eslint-disable-line no-param-reassign
    }
    options.port = options.port || 8443;

    if (options.key && options.cert) {
      // HTTPS Server
      debug('HTTPS WebHook enabled');
      var opts = {
        key: fs.readFileSync(options.key),
        cert: fs.readFileSync(options.cert)
      };
      this._webServer = https.createServer(opts, this._requestListener);
    } else {
      debug('HTTP WebHook enabled');
      this._webServer = http.createServer(this._requestListener);
    }

    this._webServer.listen(options.port, options.host, function () {
      debug('WebHook listening on port %s', options.port);
    });
  }

  // used so that other funcs are not non-optimizable


  _createClass(TelegramBotWebHook, [{
    key: '_safeParse',
    value: function _safeParse(json) {
      try {
        return JSON.parse(json);
      } catch (err) {
        debug(err);
        return null;
      }
    }

    // pipe+parse body


    // bound req listener

  }]);

  return TelegramBotWebHook;
}();

module.exports = TelegramBotWebHook;