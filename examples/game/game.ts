/**
 * This example demonstrates using HTML5 games with Telegram.
 *
 * Run with: npx tsx examples/game/game.ts
 */

import { fileURLToPath } from 'node:url';
import express from 'express';
import TelegramBot, { type CallbackQuery } from 'node-telegram-bot-api';

const TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const gameName = process.env.TELEGRAM_GAMENAME || 'YOUR_TELEGRAM_GAMENAME';
const url = process.env.URL || 'https://<PUBLIC-URL>';
const port = Number(process.env.PORT) || 8080;

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();

// Matches /start
bot.onText(/^\/start/, (msg) => {
  bot.sendGame(msg.chat.id, gameName);
});

// Handle callback queries
bot.on('callback_query', (query: CallbackQuery) => {
  bot.answerCallbackQuery(query.id, { url });
});

// Render the HTML game.
app.get('/', (_req, res) => {
  res.sendFile(fileURLToPath(new URL('game.html', import.meta.url)));
});

app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
