const TelegramPolling = require('../lib/telegramPolling');
const Telegram = require('../lib/telegram');
const Promise = require('bluebird');
const request = require('request-promise');
const assert = require('assert');
const fs = require('fs');
const is = require('is');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const TOKEN = process.env.TEST_TELEGRAM_TOKEN;
if (!TOKEN) {
  throw new Error('Bot token not provided');
}

// Telegram service if not User Id
const USERID = process.env.TEST_USER_ID || 777000;

describe('Telegram', function telegramSuite() {
  describe('#setWebHook', function setWebHookSuite() {
    it('should set a webHook', function test() {
      const bot = new Telegram(TOKEN);
      // Google IP ¯\_(ツ)_/¯
      return bot
        .setWebHook('216.58.210.174')
        .then(resp => {
          assert.equal(resp, true);
        });
    });

    it('should set a webHook with certificate', function test() {
      const bot = new Telegram(TOKEN);
      const cert = `${__dirname}/../examples/crt.pem`;
      return bot
        .setWebHook('216.58.210.174', cert)
        .then(resp => {
          assert.equal(resp, true);
        });
    });

    it('should delete the webHook', function test() {
      const bot = new Telegram(TOKEN);
      return bot
        .setWebHook('')
        .then(resp => {
          assert.equal(resp, true);
        });
    });
  });

  describe('#WebHook', function WebHookSuite() {
    it('should reject request if same token not provided', function test() {
      const bot = new Telegram(TOKEN, { webHook: true });

      return request({
        url: 'http://localhost:8443/NOT_REAL_TOKEN',
        method: 'POST',
        simple: false,
        resolveWithFullResponse: true
      }).then(response => {
        assert.notEqual(response.statusCode, 200);
        bot._WebHook._webServer.close();
      });
    });

    it('should reject request if authorized but not a POST', function test() {
      const bot = new Telegram(TOKEN, { webHook: true });
      return request({
        url: `http://localhost:8443/bot${TOKEN}`,
        method: 'GET',
        simple: false,
        resolveWithFullResponse: true
      })
      .then(response => {
        assert.notEqual(response.statusCode, 200);
        bot._WebHook._webServer.close();
      });
    });

    it('should emit a `message` on HTTP WebHook', function test(done) {
      const bot = new Telegram(TOKEN, { webHook: true });
      bot.on('message', () => {
        bot._WebHook._webServer.close();
        done();
      });

      const url = `http://localhost:8443/bot${TOKEN}`;
      request({
        url,
        method: 'POST',
        json: true,
        headers: {
          'content-type': 'application/json',
        },
        body: { update_id: 0, message: { text: 'test' } }
      });
    });

    it('should emit a `message` on HTTPS WebHook', function test(done) {
      const opts = {
        webHook: {
          port: 8443,
          key: `${__dirname}/../examples/key.pem`,
          cert: `${__dirname}/../examples/crt.pem`
        }
      };
      const bot = new Telegram(TOKEN, opts);
      bot.on('message', () => {
        bot._WebHook._webServer.close();
        done();
      });
      const url = `https://localhost:8443/bot${TOKEN}`;
      request({
        url,
        method: 'POST',
        json: true,
        headers: {
          'content-type': 'application/json',
        },
        rejectUnhauthorized: false,
        body: { update_id: 0, message: { text: 'test' } }
      });
    });
  });

  describe('#getMe', function getMeSuite() {
    it('should return an User object', function test() {
      const bot = new Telegram(TOKEN);
      return bot.getMe().then(resp => {
        assert.ok(is.object(resp));
      });
    });
  });

  describe('#getUpdates', function getUpdatesSuite() {
    it('should return an Array', function test() {
      const bot = new Telegram(TOKEN);
      return bot.getUpdates().then(resp => {
        assert.equal(Array.isArray(resp), true);
      });
    });
  });

  describe('#sendMessage', function sendMessageSuite() {
    it('should send a message', function test() {
      const bot = new Telegram(TOKEN);
      return bot.sendMessage(USERID, 'test').then(resp => {
        assert.ok(is.object(resp));
      });
    });
  });

  describe('#forwardMessage', function forwardMessageSuite() {
    it('should forward a message', function test() {
      const bot = new Telegram(TOKEN);
      return bot.sendMessage(USERID, 'test').then(resp => {
        const messageId = resp.message_id;
        return bot.forwardMessage(USERID, USERID, messageId)
          .then(forwarded => {
            assert.ok(is.object(forwarded));
          });
      });
    });
  });

  describe('#sendPhoto', function sendPhotoSuite() {
    let photoId;
    it('should send a photo from file', function test() {
      const bot = new Telegram(TOKEN);
      const photo = `${__dirname}/bot.gif`;
      return bot.sendPhoto(USERID, photo).then(resp => {
        assert.ok(is.object(resp));
        photoId = resp.photo[0].file_id;
      });
    });

    it('should send a photo from id', function test() {
      const bot = new Telegram(TOKEN);
      // Send the same photo as before
      const photo = photoId;
      return bot.sendPhoto(USERID, photo).then(resp => {
        assert.ok(is.object(resp));
      });
    });

    it('should send a photo from fs.readStream', function test() {
      const bot = new Telegram(TOKEN);
      const photo = fs.createReadStream(`${__dirname}/bot.gif`);
      return bot.sendPhoto(USERID, photo).then(resp => {
        assert.ok(is.object(resp));
      });
    });

    it('should send a photo from request Stream', function test() {
      const bot = new Telegram(TOKEN);
      const photo = request('https://telegram.org/img/t_logo.png');
      return bot.sendPhoto(USERID, photo).then(resp => {
        assert.ok(is.object(resp));
      });
    });

    it('should send a photo from a Buffer', function test() {
      const bot = new Telegram(TOKEN);
      const photo = fs.readFileSync(`${__dirname}/bot.gif`);
      return bot.sendPhoto(USERID, photo).then(resp => {
        assert.ok(is.object(resp));
      });
    });
  });

  describe('#sendChatAction', function sendChatActionSuite() {
    it('should send a chat action', function test() {
      const bot = new Telegram(TOKEN);
      const action = 'typing';
      return bot.sendChatAction(USERID, action).then(resp => {
        assert.equal(resp, true);
      });
    });
  });

  describe('#sendAudio', function sendAudioSuite() {
    it('should send an OGG audio', function test() {
      const bot = new Telegram(TOKEN);
      const audio = request('https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg');
      return bot.sendAudio(USERID, audio).then(resp => {
        assert.ok(is.object(resp));
      });
    });
  });

  describe('#sendDocument', function sendDocumentSuite() {
    let documentId;
    it('should send a document from file', function test() {
      const bot = new Telegram(TOKEN);
      const document = `${__dirname}/bot.gif`;
      return bot.sendDocument(USERID, document).then(resp => {
        assert.ok(is.object(resp));
        documentId = resp.document.file_id;
      });
    });

    it('should send a document from id', function test() {
      const bot = new Telegram(TOKEN);
      // Send the same photo as before
      const document = documentId;
      return bot.sendDocument(USERID, document).then(resp => {
        assert.ok(is.object(resp));
      });
    });

    it('should send a document from fs.readStream', function test() {
      const bot = new Telegram(TOKEN);
      const document = fs.createReadStream(`${__dirname}/bot.gif`);
      return bot.sendDocument(USERID, document).then(resp => {
        assert.ok(is.object(resp));
      });
    });

    it('should send a document from request Stream', function test() {
      const bot = new Telegram(TOKEN);
      const document = request('https://telegram.org/img/t_logo.png');
      return bot.sendDocument(USERID, document).then(resp => {
        assert.ok(is.object(resp));
      });
    });

    it('should send a document from a Buffer', function test() {
      const bot = new Telegram(TOKEN);
      const document = fs.readFileSync(`${__dirname}/bot.gif`);
      return bot.sendDocument(USERID, document).then(resp => {
        assert.ok(is.object(resp));
      });
    });
  });

  describe('#sendSticker', function sendStickerSuite() {
    let stickerId;
    it('should send a sticker from file', function test() {
      const bot = new Telegram(TOKEN);
      const sticker = `${__dirname}/sticker.webp`;
      return bot.sendSticker(USERID, sticker).then(resp => {
        assert.ok(is.object(resp));
        stickerId = resp.sticker.file_id;
      });
    });

    it('should send a sticker from id', function test() {
      const bot = new Telegram(TOKEN);
      // Send the same photo as before
      return bot.sendSticker(USERID, stickerId).then(resp => {
        assert.ok(is.object(resp));
      });
    });

    it('should send a sticker from fs.readStream', function test() {
      const bot = new Telegram(TOKEN);
      const sticker = fs.createReadStream(`${__dirname}/sticker.webp`);
      return bot.sendSticker(USERID, sticker).then(resp => {
        assert.ok(is.object(resp));
      });
    });

    it('should send a sticker from request Stream', function test() {
      const bot = new Telegram(TOKEN);
      const sticker = request('https://www.gstatic.com/webp/gallery3/1_webp_ll.webp');
      return bot.sendSticker(USERID, sticker).then(resp => {
        assert.ok(is.object(resp));
      });
    });

    it('should send a sticker from a Buffer', function test() {
      const bot = new Telegram(TOKEN);
      const sticker = fs.readFileSync(`${__dirname}/sticker.webp`);
      return bot.sendDocument(USERID, sticker).then(resp => {
        assert.ok(is.object(resp));
      });
    });
  });

  describe('#sendVideo', function sendVideoSuite() {
    let videoId;
    it('should send a video from file', function test() {
      const bot = new Telegram(TOKEN);
      const video = `${__dirname}/video.mp4`;
      return bot.sendVideo(USERID, video).then(resp => {
        assert.ok(is.object(resp));
        videoId = resp.video.file_id;
      });
    });

    it('should send a video from id', function test() {
      const bot = new Telegram(TOKEN);
      // Send the same photo as before
      return bot.sendVideo(USERID, videoId).then(resp => {
        assert.ok(is.object(resp));
      });
    });

    it('should send a video from fs.readStream', function test() {
      const bot = new Telegram(TOKEN);
      const video = fs.createReadStream(`${__dirname}/video.mp4`);
      return bot.sendVideo(USERID, video).then(resp => {
        assert.ok(is.object(resp));
      });
    });

    it('should send a video from request Stream', function test() {
      const bot = new Telegram(TOKEN);
      const sticker = request('http://techslides.com/demos/sample-videos/small.mp4');
      return bot.sendVideo(USERID, sticker).then(resp => {
        assert.ok(is.object(resp));
      });
    });

    it('should send a video from a Buffer', function test() {
      const bot = new Telegram(TOKEN);
      const video = fs.readFileSync(`${__dirname}/video.mp4`);
      return bot.sendVideo(USERID, video).then(resp => {
        assert.ok(is.object(resp));
      });
    });
  });

  describe('#sendVoice', function sendVoiceSuite() {
    it('should send an OGG audio as voice', function test() {
      const bot = new Telegram(TOKEN);
      const voice = request('https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg');
      return bot.sendVoice(USERID, voice).then(resp => {
        assert.ok(is.object(resp));
      });
    });
  });

  describe('#getUserProfilePhotos', function getUserProfilePhotosSuite() {
    it('should get user profile photos', function test() {
      const bot = new Telegram(TOKEN);
      return bot.getUserProfilePhotos(USERID).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.number(resp.total_count));
        assert.ok(is.array(resp.photos));
      });
    });
  });

  describe('#sendLocation', function sendLocationSuite() {
    it('should send a location', function test() {
      const bot = new Telegram(TOKEN);
      const lat = 47.5351072;
      const long = -52.7508537;
      return bot.sendLocation(USERID, lat, long).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.location));
        assert.ok(is.number(resp.location.latitude));
        assert.ok(is.number(resp.location.longitude));
      });
    });
  });

  describe('#getFile', function getFileSuite() {
    let fileId;

		// To get a file we have to send any file first
    it('should send a photo from file', function test() {
      const bot = new Telegram(TOKEN);
      const photo = `${__dirname}/bot.gif`;
      return bot.sendPhoto(USERID, photo).then(resp => {
        assert.ok(is.object(resp));
        fileId = resp.photo[0].file_id;
      });
    });

    it('should get a file', function test() {
      const bot = new Telegram(TOKEN);

      return bot
        .getFile(fileId)
        .then(resp => {
          assert.ok(is.object(resp));
          assert.ok(is.string(resp.file_path));
        });
    });
  });

  describe('#getFileLink', function getFileLinkSuite() {
    let fileId;

		// To get a file we have to send any file first
    it('should send a photo from file', function test() {
      const bot = new Telegram(TOKEN);
      const photo = `${__dirname}/bot.gif`;
      return bot.sendPhoto(USERID, photo).then(resp => {
        assert.ok(is.object(resp));
        fileId = resp.photo[0].file_id;
      });
    });

    it('should get a file link', function test() {
      const bot = new Telegram(TOKEN);

      return bot
        .getFileLink(fileId)
        .then(fileURI => {
          assert.ok(is.string(fileURI));
          assert.equal(fileURI.indexOf('https'), 0);
          // TODO: validate URL with some library or regexp
        });
    });
  });

  describe('#downloadFile', function downloadFileSuite() {
    const downloadPath = __dirname;

    it('should download a file', function test() {
      const bot = new Telegram(TOKEN);
      const photo = `${__dirname}/bot.gif`;

      // Send a file to get the ID
      return bot.sendPhoto(USERID, photo).then(resp => {
        assert.ok(is.object(resp));
        const fileId = resp.photo[0].file_id;

        return bot
          .downloadFile(fileId, downloadPath)
          .then(filePath => {
            assert.ok(is.string(filePath));
            assert.ok(fs.existsSync(filePath));
            fs.unlinkSync(filePath); // Delete file after test
          });
      });
    });
  });

  it('should call `onText` callback on match', function test(done) {
    const bot = new Telegram(TOKEN, { webHook: true });
    bot.onText(/\/echo (.+)/, (msg, match) => {
      bot._WebHook._webServer.close();
      assert.equal(match[1], 'ECHO ALOHA');
      done();
    });
    const url = `http://localhost:8443/bot${TOKEN}`;
    request({
      url,
      method: 'POST',
      json: true,
      headers: {
        'content-type': 'application/json',
      },
      body: { update_id: 0, message: { text: '/echo ECHO ALOHA' } }
    });
  });
}); // End Telegram

describe('#TelegramBotPolling', function TelegramBotPollingSuite() {
  it('should call the callback on polling', function test(done) {
    const opts = { interval: 100, timeout: 1 };
    const polling = new TelegramPolling(TOKEN, opts, (msg) => {
      if (msg.update_id === 10) {
        done();
      }
    });
    // The second time _getUpdates is called it will return a message
    // Really dirty but it works
    polling._getUpdates = () => {
      return new Promise.resolve([{ update_id: 10, message: {} }]);
    };
  });
});
