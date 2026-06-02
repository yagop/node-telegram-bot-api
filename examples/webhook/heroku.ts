/**
 * This example demonstrates setting up a webhook on the Heroku platform.
 *
 * Run with: npx tsx examples/webhook/heroku.ts
 */

import TelegramBot, { type Message } from 'node-telegram-bot-api';

const TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';

const bot = new TelegramBot(TOKEN, {
  webHook: {
    // Bind to the port assigned by Heroku ($PORT).
    // See: https://devcenter.heroku.com/articles/dynos#local-environment-variables
    // No certificates needed — Heroku terminates SSL for you
    // (https://<app-name>.herokuapp.com). Bind to 0.0.0.0 (the default).
    port: Number(process.env.PORT),
  },
});

// Heroku routes from :443 to $PORT. Add your app URL to an env var, or enable
// Dyno Metadata to get it automatically.
// See: https://devcenter.heroku.com/articles/dyno-metadata
const url = process.env.APP_URL || 'https://<app-name>.herokuapp.com:443';

// This informs the Telegram servers of the new webhook.
bot.setWebHook(`${url}/bot${TOKEN}`);

// Just to ping!
bot.on('message', (msg: Message) => {
  bot.sendMessage(msg.chat.id, 'I am alive on Heroku!');
});
