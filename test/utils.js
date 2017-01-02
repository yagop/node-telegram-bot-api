/* eslint-disable no-use-before-define */
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
   * Send a message to the webhook at the specified port.
   * @param  {Number} port
   * @param  {String} token
   * @param  {Object} [options]
   * @param  {String} [options.method=POST] Method to use
   * @param  {Object} [options.message] Message to send. Default to a generic text message
   * @return {Promise}
   */
  sendWebHookMessage,
  /**
   * Start a mock server at the specified port.
   * @param  {Number} port
   * @return {Promise}
   */
  startMockServer,
  /**
   * Start the static server, serving files in './data'
   * @param  {Number} port
   */
  startStaticServer,
};
/* eslint-enable no-use-before-define */


const assert = require('assert');
const http = require('http');
const Promise = require('bluebird');
const request = require('request-promise');
const statics = require('node-static');

const servers = {};


function startMockServer(port) {
  assert.ok(port);
  const server = http.Server((req, res) => {
    servers[port].polling = true;
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
  const fileServer = new statics.Server(`${__dirname}/data`);
  http.Server((req, res) => {
    req.addListener('end', () => {
      fileServer.serve(req, res);
    }).resume();
  }).listen(port);
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
  return request.get(`http://127.0.0.1:${port}`)
    .then(() => {
      connected = true;
    }).catch(e => {
      if (e.statusCode < 500) connected = true;
    }).finally(() => {
      if (reverse) {
        if (connected) throw error;
        return;
      }
      if (!connected) throw error;
    });
}


function sendWebHookMessage(port, token, options = {}) {
  assert.ok(port);
  assert.ok(token);
  const url = `http://127.0.0.1:${port}/bot${token}`;
  return request({
    url,
    method: options.method || 'POST',
    body: {
      update_id: 1,
      message: options.message || { text: 'test' }
    },
    json: true,
  });
}


function handleRatelimit(bot, methodName, suite) {
  const backupMethodName = `__${methodName}`;
  if (!bot[backupMethodName]) bot[backupMethodName] = bot[methodName];

  const method = bot[backupMethodName];
  assert.equal(typeof method, 'function');

  bot[methodName] = (...args) => {
    const minute = 60 * 1000;
    let retry = 0;
    function exec() {
      return method.call(bot, ...args)
        .catch(error => {
          if (!error.response || error.response.statusCode !== 429) {
            throw error;
          }
          retry++;
          if (retry > 3) {
            throw error;
          }
          console.error('tests: Handling rate-limit error'); // eslint-disable-line no-console
          const timeout = minute * retry;
          suite.timeout(timeout);
          return new Promise(function timeoutPromise(resolve, reject) {
            setTimeout(function execTimeout() {
              return exec().then(resolve).catch(reject);
            }, timeout / 2);
          });
        });
    }
    return exec();
  };
  return bot;
}
