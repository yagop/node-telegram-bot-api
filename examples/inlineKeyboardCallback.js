var TelegramBot = require('../src/telegram');

var options = {
  polling: true
};

var token = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';

var bot = new TelegramBot(token, options);

bot.on('message', function onMessage(msg) {
  var options = {
    reply_markup: {
      inline_keyboard: [[{
        text: 'Do something',
        callback_data: 'my_action_fancy_action'
      }]]
    }
  };

  bot.sendMessage(msg.from.id, 'Message', options);
});

bot.on('callback_query', function onCallbackQuery(callbackQuery) {
  console.log('<< Callback: %j', callbackQuery);

  let action = callbackQuery.data;

  var options = {
    chat_id: callbackQuery.message.chat.id,
    message_id: callbackQuery.message.message_id
  };

  bot.editMessageText('Edited message!', options);
});