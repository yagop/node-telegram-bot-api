/*
 This example is created by`dshaw0004`
 If you face any problem with this code (except same set of image fetching from unsplash <- still working on it), let me know.
 I will try to fix that problem ASAP
*/

// requiered packages for this bot
const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");

// I am using unsplash api to fetch images you can use different api
const unsplashKey = process.env["UNSPLASH_KEY"];

const token = process.env["TOKEN"]; // telegram bot token which you will get from botFather

const bot = new TelegramBot(token, { polling: true });

async function fetchImage(text) {
  let response = "sorry can not get any image for this 😔";
  let responseType = "sorry text";
  let apiRes = await fetch(
    `https://api.unsplash.com/search/photos?query=${text}`,
    {
      method: "get",
      headers: {
        Authorization: `Client-ID ${unsplashKey}`,
      },
    }
  );
  let resJson = await apiRes.json();
  if (apiRes.status === 200) {
    response = resJson.results[Math.floor(Math.random() * 10)].urls.regular;
    responseType = "url";
  }
  return [response, responseType];
}

bot.on("message", async (msg) => {
  const chatId = msg.chat.id; // chat id of the user who request for an image
  let resp = await fetchImage(msg.text); // fetching the image from unsplash
  if (resp[1] === "url") {
    bot.sendPhoto(chatId, resp[0]); // sending the image to the user
  } else {
    bot.sendMessage(chatId, resp[0]); // if the api does respond a 200 status code then send the sorry message
  }
  /* 
  you can use bot.sendMessage instead of bot.sendPhoto.
  Then user will get the url of the image which the user can open in any browser,
  still user can preview the image without opening it in any brower since telegram gives you a preview of any link inside the chat.
  */
});

/*
here is a list of few free and open api for your test
const urls = {
	"cat": "https://api.thecatapi.com/v1/images/search",
	"quokka": "https://quokka.pics/api/",
	"dog": "https://dog.ceo/api/breeds/image/random",
	"duck": "https://random-d.uk/api/v2/random",
	"fox": "https://randomfox.ca/floof/"
}
*/
