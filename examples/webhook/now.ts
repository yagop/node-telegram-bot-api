/**
 * This example demonstrates setting up webhook on Zeit Now platform.
 * Attention: You have to use webhook with Zeit Now only, polling doesn't
 * work.
 */

const TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
import { TelegramBot } from '../..';

const options = {
  webHook: {
    // Just use 443 directly
    port: 443,
  },
};
// You can use 'now alias <your deployment url> <custom url>' to assign fixed
// domain.
// See: https://zeit.co/blog/now-alias
// Or just use NOW_URL to get deployment url from env.
const url = process.env.NOW_URL || 'YOUR_DOMAIN_ALIAS';
const bot = new TelegramBot(TOKEN, options);

// This informs the Telegram servers of the new webhook.
// Note: we do not need to pass in the cert, as it already provided
bot.setWebHook(`${url}/bot${TOKEN}`);

// Just to ping!
bot.on('message', (msg: any) => {
  bot.sendMessage(msg.chat.id, 'I am alive on Zeit Now!');
});
