/* eslint-disable */

/**
 * This example demonstrates setting up a webook, and receiving
 * updates in your express app
 */

const TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const url = 'https://<PUBLIC-URL>';
// const port = process.env.PORT;

import { TelegramBot } from '../..';
import express from 'express';

// No need to pass any parameters as we will handle the updates with Express
const bot = new TelegramBot(TOKEN);

// This informs the Telegram servers of the new webhook.
(bot as any).setWebHook(`${url}/bot${TOKEN}`);

const app = express();

// parse the updates to JSON
app.use(express.json());

// We are receiving updates at the route below!
app.post(`/bot${TOKEN}`, (req: any, res: any) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Start Express Server
