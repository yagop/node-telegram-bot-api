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

// Matches /photo
bot.onText(/\/photo/, function (msg) {
  var chatId = msg.chat.id;
  // From file
  var photo = __dirname+'/../test/bot.gif';
  bot.sendPhoto(chatId, photo, {caption: "I'm a bot!"});
});

// Matches /audio
bot.onText(/\/audio/, function (msg) {
  var chatId = msg.chat.id;
  var url = 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg';
    // From HTTP request!
    var audio = request(url);
    bot.sendAudio(chatId, audio)
      .then(function (resp) {
        // Forward the msg
        var messageId = resp.message_id;
        bot.forwardMessage(chatId, chatId, messageId);
      });
});

// Matches /love
bot.onText(/\/love/, function (msg) {
  var chatId = msg.chat.id;
  var opts = {
      reply_to_message_id: msg.message_id,
      reply_markup: JSON.stringify({
        keyboard: [
          ['Yes, you are the bot of my life ❤'],
          ['No, sorry there is another one...']]
      })
    };
    bot.sendMessage(chatId, 'Do you love me?', opts);
});

bot.onText(/\/echo (.+)/, function (msg, match) {
  var chatId = msg.chat.id;
  var resp = match[1];
  bot.sendMessage(chatId, resp);
});
