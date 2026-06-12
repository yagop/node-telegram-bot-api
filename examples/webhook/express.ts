/**
 * This example demonstrates setting up a webhook and receiving
 * updates in your Express app.
 *
 * Run with: npx tsx examples/webhook/express.ts
 */

import express from 'express';
import TelegramBot, { type Message, type Update } from 'node-telegram-bot-api';

const TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const url = process.env.URL || 'https://<PUBLIC-URL>';
const port = Number(process.env.PORT) || 3000;

// No need to pass any parameters as we will handle the updates with Express.
const bot = new TelegramBot(TOKEN);

// This informs the Telegram servers of the new webhook.
bot.setWebHook(`${url}/bot${TOKEN}`);

const app = express();

// Parse the updates to JSON.
app.use(express.json());

// We are receiving updates at the route below!
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body as Update);
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`Express server is listening on ${port}`);
});

// Just to ping!
bot.on('message', (msg: Message) => {
  bot.sendMessage(msg.chat.id, 'I am alive!');
});
