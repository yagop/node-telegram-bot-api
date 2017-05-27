/**
 * This example demonstrates using polling.
 * It also demonstrates how you would process and send messages.
 */


const TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const TelegramBot = require('../..');
const request = require('request');
const options = {
  polling: true
};
const bot = new TelegramBot(TOKEN, options);
const express = require('express')
const app = express()
const url = "http://example.com";
const gameLink = url + '/';
const gameName = "game";
const port = process.env.PORT || 8080;
app.set('view engine', 'ejs')

// Matches /start
bot.onText(/\/start/, function onPhotoText(msg) {
    bot.sendGame(msg.chat.id, gameName);
});

// Handle callback queries
bot.on('callback_query', function onCallbackQuery(callbackQuery) {
  const msg = callbackQuery.message;
    bot.answerCallbackQuery(msg.id, gameLink, true, {url: gameLink});
});

app.get('/', function(req, res){
    res.render('game.html');
});

app.listen(port, function(){
    console.log("Listening on port " + port);
});
