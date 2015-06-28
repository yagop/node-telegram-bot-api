var TelegramBot = require('../src/telegram');

var options = {
  webHook: {
    port: 443,
    key: __dirname+'/key.pem',
    cert: __dirname+'/crt.pem'
  }
};

var bot = new TelegramBot('BOTTOKEN', options);
bot.setWebHook('IP:PORT');
