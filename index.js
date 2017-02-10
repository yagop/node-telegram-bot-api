/**
 * If running on Nodejs 4.x and below, we load the transpiled code.
 * Otherwise, we use the ES6 code.
 * We are deprecating support for Node.js v4.x and below.
 */
const majorVersion = parseInt(process.versions.node.split('.')[0], 10);
if (majorVersion <= 4) {
  const deprecate = require('depd')('node-telegram-bot-api');
  deprecate('Node.js v4.x and below will no longer be supported in the future');
  module.exports = require('./lib/telegram');
} else {
  module.exports = require('./src/telegram');
}
