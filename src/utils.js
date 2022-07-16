const util = require('util');
// Native deprecation warning
exports.deprecate = (msg) => util.deprecate(() => { }, msg, 'node-telegram-bot-api')();
