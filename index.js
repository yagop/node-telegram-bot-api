/**
 * If running on Nodejs 0.12, we load the transpiled code.
 * Otherwise, we use the ES6 code.
 * We are deprecating support for Node.js v0.x
 */
const majorVersion = process.versions.node.split('.')[0];
if (majorVersion === '0') {
  const deprecate = require('depd')('node-telegram-bot-api');
  deprecate('Node.js v0.12 and below will no longer be supported in the future');
  module.exports = require('./lib/telegram');
} else {
  module.exports = require('./src/telegram');
}
