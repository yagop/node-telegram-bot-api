/**
 * This example demonstrates using HTML5 games with Telegram.
 */

const TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const gameName = process.env.TELEGRAM_GAMENAME || 'YOUR_TELEGRAM_GAMENAME';
// Specify '0' to use ngrok i.e. localhost tunneling
let url = process.env.URL || 'https://<PUBLIC-URL>';
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

import { TelegramBot } from '../..';
import express from 'express';
import path from 'path';

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();

// Basic configurations
app.set('view engine', 'ejs');

// Tunnel to localhost.
// This is just for demo purposes.
// In your application, you will be using a static URL, probably that
// you paid for. :)
if (url === '0') {
  const ngrok = require('ngrok');
  ngrok.connect(port, (error: Error | null, u: string) => {
    if (error) throw error;
    url = u;
    console.log(`Game tunneled at ${url}`);
  });
}

// Matches /start
bot.onText(/\/start/, (msg: any) => {
  bot.sendGame(msg.chat.id, gameName);
});

// Handle callback queries
bot.on('callback_query', (callbackQuery: any) => {
  bot.answerCallbackQuery(callbackQuery.id, { url });
});

// Render the HTML game
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'game.html'));
});

// Bind server to port
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
