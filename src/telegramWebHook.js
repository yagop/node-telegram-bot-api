const debug = require('debug')('node-telegram-bot-api');
const https = require('https');
const http = require('http');
const fs = require('fs');
const bl = require('bl');

class TelegramBotWebHook {

  constructor(token, options, callback) {
    this.token = token;
    this.callback = callback;
    this.regex = new RegExp(this.token);

    // define opts
    if (typeof options === 'boolean') {
      options = {}; // eslint-disable-line no-param-reassign
    }
    options.port = options.port || 8443;

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

  // pipe+parse body
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

  // bound req listener
  _requestListener = (req, res) => {
    debug('WebHook request URL:', req.url);
    debug('WebHook request headers: %j', req.headers);

    // If there isn't token on URL
    if (!this.regex.test(req.url)) {
      debug('WebHook request unauthorized');
      res.statusCode = 401;
      res.end();
    } else if (req.method === 'POST') {
      req
        .pipe(bl(this._parseBody))
        .on('end', () => res.end('OK'));
    } else {
      // Authorized but not a POST
      debug('WebHook request isn\'t a POST');
      res.statusCode = 418; // I'm a teabot!
      res.end();
    }
  }

}

module.exports = TelegramBotWebHook;
