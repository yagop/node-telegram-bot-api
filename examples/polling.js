var TelegramBot = require('../src/telegram');
var request = require('request');

var options = {
  polling: true
};

var token = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';

var bot = new TelegramBot(token, options);
bot.getMe().then(function (me) {
  console.log('Hi my name is %s!', me.username);
});

bot.onText(/\/photo.*/, function (msg) {
  var fromId = msg.from.id;
  // From file
  var photo = __dirname+'/../test/bot.gif';
  bot.sendPhoto(fromId, photo, {caption: "I'm a bot!"});
});

bot.onText(/\/audio.*/, function (msg) {
  var fromId = msg.from.id;
  var url = 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg';
    // From HTTP request!
    var audio = request(url);
    bot.sendAudio(fromId, audio)
      .then(function (resp) {
        // Forward the msg
        var messageId = resp.message_id;
        bot.forwardMessage(fromId, fromId, messageId);
      });
});

bot.onText(/\/love.*/, function (msg) {
  var fromId = msg.from.id;
  var opts = {
      reply_to_message_id: msg.message_id,
      reply_markup: JSON.stringify({
        keyboard: [
          ['Yes, you are the bot of my life ❤'],
          ['No, sorry there is another one...']]
      })
    };
    bot.sendMessage(fromId, 'Do you love me?', opts);
});

bot.onText(/\/echo (.+)/, function (msg, match) {
  var fromId = msg.from.id;
  var resp = match[1];
  bot.sendMessage(fromId, resp);
});
