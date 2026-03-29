/* eslint-disable no-global-assign */
exports = module.exports = {
  /**
   * Clear polling check, so that 'isPollingMockServer()' returns false
   * if the bot stopped polling the mock server.
   * @param  {Number} port
   */
  clearPollingCheck,
  /**
   * Redefine a bot method to allow us to ignore 429 (rate-limit) errors
   * @param  {TelegramBot} bot
   * @param  {String} methodName
   * @param  {Suite} suite From mocha
   * @return {TelegramBot}
   */
  handleRatelimit,
  /**
   * Return true if a webhook has been opened at the specified port.
   * Otherwise throw an error.
   * @param  {Number} port
   * @param  {Boolean} [reverse] Throw error when it should have returned true (and vice versa)
   * @return {Promise}
   */
  hasOpenWebHook,
  /**
   * Return true if the mock server is being polled by a bot.
   * Otherwise throw an error.
   * @param  {Number} port
   * @param  {Boolean} [reverse] Throw error when it should have returned true (and vice versa)
   * @return {Promise}
   */
  isPollingMockServer,
  /**
   * Return true if the string is a URI to a file
   * on Telegram servers.
   * @param  {String} uri
   * @return {Boolean}
   */
  isTelegramFileURI,
  /**
   * Send a message to the webhook at the specified port and path.
   * @param  {Number} port
   * @param  {String} path
   * @param  {Object} [options]
   * @param  {String} [options.method=POST] Method to use
   * @param  {Object} [options.update] Update object to send.
   * @param  {Object} [options.message] Message to send. Default to a generic text message
   * @param  {Boolean} [options.https=false] Use https
   * @return {Promise}
   */
  sendWebHookRequest,
  /**
   * Send a message to the webhook at the specified port.
   * @param  {Number} port
   * @param  {String} token
   * @param  {Object} [options]
   * @param  {String} [options.method=POST] Method to use
   * @param  {Object} [options.update] Update object to send.
   * @param  {Object} [options.message] Message to send. Default to a generic text message
   * @param  {Boolean} [options.https=false] Use https
   * @return {Promise}
   */
  sendWebHookMessage,
  /**
   * Start a mock server at the specified port.
   * @param  {Number} port
   * @param  {Object} [options]
   * @param  {Boolean} [options.bad=false] Bad Mock Server; responding with
   *  unparseable messages
   * @return {Promise}
   */
  startMockServer,
  /**
   * Start the static server, serving files in './data'
   * @param  {Number} port
   */
  startStaticServer,
};
 


const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const URL = require('url').URL;
const fetch = require('node-fetch');

const servers = {};


function startMockServer(port, options = {}) {
  assert.ok(port);
  const server = http.Server((req, res) => {
    servers[port].polling = true;
    if (options.bad) {
      return res.end('can not be parsed with JSON.parse()');
    }
    return res.end(JSON.stringify({
      ok: true,
      result: [{
        update_id: 0,
        message: { text: 'test' },
      }],
    }));
  });
  return new Promise((resolve, reject) => {
    servers[port] = { server, polling: false };
    server.on('error', reject).listen(port, resolve);
  });
}


function startStaticServer(port) {
  const staticPath = path.join(__dirname, 'data');
  return new Promise((resolve, reject) => {
    const server = http.Server((req, res) => {
      req.addListener('end', () => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const filePath = path.join(staticPath, url.pathname);
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404);
            return res.end('Not found');
          }
          // Simple mime type detection based on extension
          const ext = path.extname(filePath).toLowerCase();
          const mimeTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
          };
          const contentType = mimeTypes[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        });
      }).resume();
    });
    server.on('error', reject);
    server.listen(port, resolve);
  });
}


function isPollingMockServer(port, reverse) {
  assert.ok(port);
  return new Promise((resolve, reject) => {
    // process.nextTick() does not wait until a poll request
    // is complete!
    setTimeout(() => {
      let polling = servers[port] && servers[port].polling;
      if (reverse) polling = !polling;
      if (polling) return resolve(true);
      return reject(new Error('polling-check failed'));
    }, 1000);
  });
}


function clearPollingCheck(port) {
  assert.ok(port);
  if (servers[port]) servers[port].polling = false;
}


function hasOpenWebHook(port, reverse) {
  assert.ok(port);
  const error = new Error('open-webhook-check failed');
  let connected = false;
  return fetch(`http://127.0.0.1:${port}`)
    .then(() => {
      connected = true;
    }).catch(e => {
      if (e.response && e.response.status < 500) connected = true;
    }).finally(() => {
      if (reverse) {
        if (connected) throw error;
        return;
      }
      if (!connected) throw error;
    });
}


function sendWebHookRequest(port, path, options = {}) {
  assert.ok(port);
  assert.ok(path);
  const protocol = options.https ? 'https' : 'http';
  const url = `${protocol}://127.0.0.1:${port}${path}`;
  const body = options.update || {
    update_id: 1,
    message: options.message || { text: 'test' }
  };
  const json = (typeof options.json === 'undefined') ? true : options.json;
  const method = options.method || 'POST';

  let bodyData;
  if (json) {
    bodyData = JSON.stringify(body);
  } else {
    // Fallback for URLSearchParams (Node 0.12+ compatible)
    bodyData = Object.keys(body)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(body[key]))
      .join('&');
  }

  return fetch(url, {
    method,
    headers: {
      'Content-Type': json ? 'application/json' : 'application/x-www-form-urlencoded',
    },
    body: bodyData,
  }).then(resp => {
    // Check if response has content, otherwise return just the response
    const contentType = resp.headers.get('content-type') || '';
    if (!resp.ok) {
      // For error responses, create an error object with statusCode
      const error = new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      error.statusCode = resp.status;
      error.response = resp;
      throw error;
    }
    // For successful responses, try to parse as JSON if content-type indicates it
    if (contentType.includes('application/json')) {
      return resp.json();
    }
    // Otherwise return as text
    return resp.text();
  });
}


function sendWebHookMessage(port, token, options = {}) {
  assert.ok(port);
  assert.ok(token);
  const path = `/bot${token}`;
  return sendWebHookRequest(port, path, options);
}


function handleRatelimit(bot, methodName, suite) {
  const backupMethodName = `__${methodName}`;
  if (!bot[backupMethodName]) bot[backupMethodName] = bot[methodName];

  const maxRetries = 3;
  const addSecs = 5;
  const method = bot[backupMethodName];
  assert.equal(typeof method, 'function');

  bot[methodName] = (...args) => {
    let retry = 0;
    function exec() {
      return method.call(bot, ...args)
        .catch(error => {
          if (!error.response || error.response.statusCode !== 429) {
            throw error;
          }
          retry++;
          if (retry > maxRetries) {
            throw error;
          }
          if (typeof error.response.body === 'string') {
            error.response.body = JSON.parse(error.response.body);
          }
          const retrySecs = error.response.body.parameters.retry_after;
          const timeout = (1000 * retrySecs) + (1000 * addSecs);
          console.error('tests: Handling rate-limit error. Retrying after %d secs', timeout / 1000);  
          suite.timeout(timeout * 2);
          return new Promise(function timeoutPromise(resolve, reject) {
            setTimeout(function execTimeout() {
              return exec().then(resolve).catch(reject);
            }, timeout);
          });
        });
    }
    return exec();
  };
  return bot;
}


function isTelegramFileURI(uri) {
  return /https?:\/\/.*\/file\/bot.*\/.*/.test(uri);
}
