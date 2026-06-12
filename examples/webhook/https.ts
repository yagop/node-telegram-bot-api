/**
 * This example demonstrates setting up a webhook using a
 * self-signed certificate.
 *
 * Run with: npx tsx examples/webhook/https.ts
 */

import { fileURLToPath } from 'node:url';
import TelegramBot, { type Message } from 'node-telegram-bot-api';

const TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const key = fileURLToPath(new URL('../ssl/key.pem', import.meta.url));
const cert = fileURLToPath(new URL('../ssl/crt.pem', import.meta.url));

const bot = new TelegramBot(TOKEN, {
  webHook: {
    port: 443,
    key, // Path to file with PEM private key
    cert, // Path to file with PEM certificate
  },
});

// This URL must route to the port set above (i.e. 443).
const url = 'https://<PUBLIC-URL>';

// This informs the Telegram servers of the new webhook.
bot.setWebHook(`${url}/bot${TOKEN}`, { certificate: cert });

// Just to ping!
bot.on('message', (msg: Message) => {
  bot.sendMessage(msg.chat.id, 'I am alive!');
});
