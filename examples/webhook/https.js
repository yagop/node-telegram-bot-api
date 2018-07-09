/**
 * This example demonstrates setting up a webook, using a
 * self-signed certificate.
 */


const TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const TelegramBot = require('../..');
const options = {
  webHook: {
    port: 443,                           // Defaults to 8443
    key: `${__dirname}/../ssl/key.pem`,  // Path to file with PEM private key
    cert: `${__dirname}/../ssl/crt.pem`, // Path to file with PEM certificate
    endpoint: '/webHookEndpoint'         // Secret path to the webhook endpoint. Optional
  }
};
// This URL must route to the port set above (i.e. 443)
const url = 'https://<PUBLIC-URL>';
const bot = new TelegramBot(TOKEN, options);


// This informs the Telegram servers of the new webhook.
bot.setWebHook(`${url}/bot${TOKEN}`, {
  certificate: options.webHook.cert,
});


// Just to ping!
bot.on('message', function onMessage(msg) {
  bot.sendMessage(msg.chat.id, 'I am alive!');
});
