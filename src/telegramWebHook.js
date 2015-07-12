var debug = require('debug')('node-telegram-bot-api');
var https = require('https');
var http = require('http');
var util = require('util');
var fs = require('fs');

var TelegramBotWebHook = function (token, options, callback) {
  this.token = token;
  this.callback = callback;
  if (typeof options === 'boolean') {
    options = {};
  }
  options.port = options.port || 8443;
  var binded = this._requestListener.bind(this);

  if (options.key && options.cert) { // HTTPS Server
    debug('HTTPS WebHook enabled');
    var opts = {
      key: fs.readFileSync(options.key),
      cert: fs.readFileSync(options.cert)
    };
    this._webServer = https.createServer(opts, binded);
  } else {
    debug('HTTP WebHook enabled');
    this._webServer = http.createServer(binded);
  }

  this._webServer.listen(options.port, options.host, function () {
    debug("WebHook listening on port %s", options.port);
  });
};

TelegramBotWebHook.prototype._requestListener = function (req, res) {
  var self = this;
  var regex = new RegExp(this.token);

  debug('WebHook request URL:', req.url);
  debug('WebHook request headers: %j', req.headers);
  // If there isn't token on URL
  if (!regex.test(req.url)) {
    debug('WebHook request unauthorized');
    res.statusCode = 401;
    res.end();
  } else if (req.method === 'POST') {
    var fullBody = '';
    req.on('data', function (chunk) {
      fullBody += chunk.toString();
    });
    req.on('end', function () {
      try {
        debug('WebHook request fullBody', fullBody);
        var data = JSON.parse(fullBody);
        self.callback(data);
      } catch (error) {
        debug(error);
      }
      res.end('OK');
    });
  } else { // Authorized but not a POST
    debug('WebHook request isn\'t a POST');
    res.statusCode = 418; // I'm a teabot!
    res.end();
  }
};

module.exports = TelegramBotWebHook;
