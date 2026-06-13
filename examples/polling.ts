/**
 * This example demonstrates using polling.
 * It also demonstrates how you would process and send messages.
 *
 * Run with: npx tsx examples/polling.ts
 */

import { fileURLToPath } from 'node:url';
import TelegramBot, { type CallbackQuery, type Message } from 'node-telegram-bot-api';

const TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const bot = new TelegramBot(TOKEN, { polling: true });

// Matches /photo - the leading ^ anchors the command to the start of the message,
// so it won't match "/photo" embedded in a URL or mid-sentence.
bot.onText(/^\/photo/, (msg) => {
  // From a file path (resolved relative to this module — ESM has no __dirname).
  const photo = fileURLToPath(new URL('../test/data/photo.gif', import.meta.url));
  bot.sendPhoto(msg.chat.id, photo, { caption: "I'm a bot!" });
});

// Matches /audio
bot.onText(/^\/audio/, (msg) => {
  // From an HTTP URL — Telegram downloads it for us, no local upload needed.
  const url = 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg';
  bot.sendAudio(msg.chat.id, url);
});

// Matches /love
bot.onText(/^\/love/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Do you love me?', {
    reply_parameters: { message_id: msg.message_id },
    reply_markup: {
      keyboard: [
        [{ text: 'Yes, you are the bot of my life ❤' }],
        [{ text: 'No, sorry there is another one...' }],
      ],
    },
  });
});

// Matches /echo [whatever]
bot.onText(/^\/echo (.+)/, (msg, match) => {
  const resp = match?.[1] ?? '';
  bot.sendMessage(msg.chat.id, resp);
});

// Matches /editable
bot.onText(/^\/editable/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Original Text', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Edit Text',
            // we check for this value when we listen for "callback_query"
            callback_data: 'edit',
          },
        ],
      ],
    },
  });
});

// Handle callback queries
bot.on('callback_query', (query: CallbackQuery) => {
  const msg = query.message;
  if (query.data !== 'edit' || !msg) return;

  bot.editMessageText('Edited Text', {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
  });
});

// Listen for any kind of message.
bot.on('message', (msg: Message) => {
  console.log('Received message:', msg.text);
});
