/**
 * This example demonstrates setting up webhook
 * on the AWS Lambda.
 */

const AWS = require('aws-sdk');
const TelegramBot = require('node-telegram-bot-api');

// For this to work you must include your API key as a environmental variable
// associated with this Lambda.
var botAPIKey = process.env.BOTAPIKEY;

const bot = new TelegramBot(botAPIKey);

exports.handler = (event, context, callback) => {
    // Get text send by user
    var userText = event.message.text.toLowerCase();
    // Get user data
    var userData = {telegramUsername: event.message.from.username,
                    telegramFirstname: event.message.from.first_name,
                    telegramLastname: event.message.from.last_name};
    // Send message
    bot.sendMessage(event.message.chat.id, `Hello ${userData.telegramUsername}. We got you message: ${userText}`);
   };
