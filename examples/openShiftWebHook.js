var TelegramBot = require('node-telegram-bot-api');

var token = 'YOUR_TELEGRAM_BOT_TOKEN';
var port = process.env.OPENSHIFT_NODEJS_PORT;
var host = process.env.OPENSHIFT_NODEJS_IP;

var bot = new TelegramBot(token, {webHook: {port: port, host: host}});
bot.setWebHook('myapp-yagop.rhcloud.com:443/bot'+token);
bot.on('message', function (msg) {
  var chatId = msg.chat.id;
  bot.sendMessage(chatId, "I'm alive!");
});
