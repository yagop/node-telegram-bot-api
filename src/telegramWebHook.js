const debug = require('debug')('node-telegram-bot-api');
const https = require('https');
const http = require('http');
const fs = require('fs');
const bl = require('bl');


class TelegramBotWebHook {
  /**
   * Sets up a webhook to receive updates
   *
   * @param  {String} token Telegram API token
   * @param  {Boolean|Object} options WebHook options
   * @param  {Number} [options.port=8443] Port to bind to
   * @param  {Function} callback Function for process a new update
   */
  constructor(token, options, callback) {
    // define opts
    if (typeof options === 'boolean') {
      options = {}; // eslint-disable-line no-param-reassign
    }

    this.token = token;
    this.options = options;
    this.options.port = options.port || 8443;
    this.callback = callback;
    this._regex = new RegExp(this.token);
    this._webServer = null;

    if (options.key && options.cert) { // HTTPS Server
      debug('HTTPS WebHook enabled');
      const opts = {
        key: fs.readFileSync(options.key),
        cert: fs.readFileSync(options.cert)
      };
      this._webServer = https.createServer(opts, this._requestListener);
    } else {
      debug('HTTP WebHook enabled');
      this._webServer = http.createServer(this._requestListener);
    }

    this._webServer.listen(options.port, options.host, () => {
      debug('WebHook listening on port %s', options.port);
    });
  }

  // used so that other funcs are not non-optimizable
  _safeParse(json) {
    try {
      return JSON.parse(json);
    } catch (err) {
      debug(err);
      return null;
    }
  }

  /**
   * Handle request body by passing it to 'callback'
   * @private
   */
  _parseBody = (err, body) => {
    if (err) {
      return debug(err);
    }

    const data = this._safeParse(body);
    if (data) {
      return this.callback(data);
    }

    return null;
  }

  /**
   * Listener for 'request' event on server
   * @private
   * @see https://nodejs.org/docs/latest/api/http.html#http_http_createserver_requestlistener
   * @see https://nodejs.org/docs/latest/api/https.html#https_https_createserver_options_requestlistener
   */
  _requestListener = (req, res) => {
    debug('WebHook request URL: %s', req.url);
    debug('WebHook request headers: %j', req.headers);

    // If there isn't token on URL
    if (!this._regex.test(req.url)) {
      debug('WebHook request unauthorized');
      res.statusCode = 401;
      res.end();
    } else if (req.method === 'POST') {
      req
        .pipe(bl(this._parseBody))
        .on('finish', () => res.end('OK'));
    } else {
      // Authorized but not a POST
      debug('WebHook request isn\'t a POST');
      res.statusCode = 418; // I'm a teabot!
      res.end();
    }
  }

}

module.exports = TelegramBotWebHook;
