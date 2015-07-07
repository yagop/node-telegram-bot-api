var TelegramBot = require('../src/telegram');
var request = require('request');

var options = {
  polling: true
};

var token = 'YOUR_TELEGRAM_BOT_TOKEN';

var bot = new TelegramBot(token, options);
bot.getMe().then(function (me) {
  console.log('Hi my name is %s!', me.username);
});
bot.on('message', function (msg) {
  var chatId = msg.chat.id;
  if (msg.text == '/photo') {
    // From file
    var photo = __dirname+'/../test/bot.gif';
    bot.sendPhoto(chatId, photo, {caption: "I'm a bot!"});
  }
  if (msg.text == '/audio') {
    var url = 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg';
    // From HTTP request!
    var audio = request(url);
    bot.sendAudio(chatId, audio)
      .then(function (resp) {
        // Forward the msg
        var messageId = resp.message_id;
        bot.forwardMessage(chatId, chatId, messageId);
      });
  }
  if (msg.text == '/love') {
    var opts = {
      reply_to_message_id: msg.message_id,
      reply_markup: JSON.stringify({
        keyboard: [
          ['Yes, you are the bot of my life ❤'],
          ['No, sorry there is another one...']]
      })
    };
    bot.sendMessage(chatId, 'Do you love me?', opts);
  }
});
