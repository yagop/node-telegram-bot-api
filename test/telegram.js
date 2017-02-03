const TelegramBot = require('..');
const Promise = require('bluebird');
const request = require('request-promise');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const is = require('is');
const utils = require('./utils');

// Allows self-signed certificates to be used in our tests
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const TOKEN = process.env.TEST_TELEGRAM_TOKEN;
if (!TOKEN) {
  throw new Error('Bot token not provided');
}

// Telegram service if not User Id
const USERID = process.env.TEST_USER_ID || 777000;
const GROUPID = process.env.TEST_GROUP_ID || -1001075450562;
const GAME_SHORT_NAME = process.env.TEST_GAME_SHORT_NAME || 'medusalab_test';
const timeout = 60 * 1000;
let portindex = 8091;
const staticPort = portindex++;
const pollingPort = portindex++;
const webHookPort = portindex++;
const pollingPort2 = portindex++;
const webHookPort2 = portindex++;
const staticUrl = `http://127.0.0.1:${staticPort}`;
const key = `${__dirname}/../examples/key.pem`;
const cert = `${__dirname}/../examples/crt.pem`;
let FILE_ID;
let GAME_CHAT_ID;
let GAME_MSG_ID;

before(function beforeAll() {
  utils.startStaticServer(staticPort);
  return utils.startMockServer(pollingPort)
    .then(() => {
      return utils.startMockServer(pollingPort2);
    });
});


describe('module.exports', function moduleExportsSuite() {
  it('is loaded from src/ if NOT on Node.js 0.12', function test() {
    if (process.versions.node.split('.')[0] === '0') this.skip(); // skip on Node.js v0.12
    assert.equal(TelegramBot, require('../src/telegram'));
  });
  it('is loaded from lib/ if on Node.js 0.12', function test() {
    if (process.versions.node.split('.')[0] !== '0') this.skip(); // skip on newer versions
    assert.equal(TelegramBot, require('../lib/telegram'));
  });
});


describe('TelegramBot', function telegramSuite() {
  let bot;
  let testbot;
  let botPolling;
  let botWebHook;

  before(function beforeAll() {
    this.timeout(timeout);
    bot = new TelegramBot(TOKEN);
    testbot = new TelegramBot(TOKEN, {
      baseApiUrl: `http://127.0.0.1:${pollingPort}`,
      polling: {
        autoStart: false,
      },
      webHook: {
        autoOpen: false,
        port: webHookPort,
      },
    });
    botPolling = new TelegramBot(TOKEN, {
      baseApiUrl: `http://127.0.0.1:${pollingPort2}`,
      polling: true,
    });
    botWebHook = new TelegramBot(TOKEN, {
      webHook: {
        port: webHookPort2,
      },
    });

    utils.handleRatelimit(bot, 'sendPhoto', this);
    utils.handleRatelimit(bot, 'sendMessage', this);
    utils.handleRatelimit(bot, 'sendGame', this);
    return bot.sendPhoto(USERID, `${__dirname}/data/photo.gif`).then(resp => {
      FILE_ID = resp.photo[0].file_id;
      return bot.sendMessage(USERID, 'chat');
    }).then(resp => {
      GAME_CHAT_ID = resp.chat.id;
      return bot.sendGame(USERID, GAME_SHORT_NAME);
    }).then(resp => {
      GAME_MSG_ID = resp.message_id;
    });
  });

  it('automatically starts polling', function test() {
    assert.equal(botPolling.isPolling(), true);
    return utils.isPollingMockServer(pollingPort2);
  });

  it('automatically opens webhook', function test() {
    assert.equal(botWebHook.hasOpenWebHook(), true);
    return utils.hasOpenWebHook(webHookPort2);
  });

  it('does not automatically poll if "autoStart" is false', function test() {
    assert.equal(testbot.isPolling(), false);
    return utils.isPollingMockServer(pollingPort, true);
  });

  it('does not automatically open webhook if "autoOpen" is false', function test() {
    assert.equal(testbot.hasOpenWebHook(), false);
    return utils.hasOpenWebHook(webHookPort, true);
  });

  describe('Events', function eventsSuite() {
    it('(polling) emits "message" on receiving message', function test(done) {
      botPolling.once('message', () => {
        return done();
      });
    });
    it('(webhook) emits "message" on receiving message', function test(done) {
      botWebHook.once('message', () => {
        return done();
      });
      utils.sendWebHookMessage(webHookPort2, TOKEN);
    });
  });

  describe('WebHook', function webHookSuite() {
    it('returns 200 OK for health endpoint', function test(done) {
      utils.sendWebHookRequest(webHookPort2, '/healthz', { json: false }).then(resp => {
        assert.equal(resp, 'OK');
        return done();
      });
    });
    it('returns 401 error if token is wrong', function test(done) {
      utils.sendWebHookMessage(webHookPort2, 'wrong-token').catch(resp => {
        assert.equal(resp.statusCode, 401);
        return done();
      });
    });
    it('only accepts POST method', function test() {
      const methods = ['GET', 'PUT', 'DELETE', 'OPTIONS'];
      return Promise.each(methods, (method) => {
        return utils.sendWebHookMessage(webHookPort2, TOKEN, {
          method,
        }).then(() => {
          throw new Error(`expected error with webhook ${method} request`);
        }).catch(resp => {
          if (!resp.statusCode) throw resp;
          if (resp.statusCode !== 418) throw new Error(`unexpected error: ${resp.body}`);
        });
      }); // Promise.each
    });
  });

  describe('WebHook HTTPS', function webHookHTTPSSuite() {
    const port = portindex++;
    let httpsbot;
    afterEach(function afterEach() {
      return httpsbot.closeWebHook();
    });
    it('is enabled, through options.key and options.cert', function test() {
      httpsbot = new TelegramBot(TOKEN, { webHook: { port, key, cert } });
      return utils.sendWebHookMessage(port, TOKEN, { https: true });
    });
    it('is enabled, through options.pfx');
    it('is enabled, through options.https', function test() {
      httpsbot = new TelegramBot(TOKEN, {
        webHook: {
          port,
          https: {
            key: fs.readFileSync(key),
            cert: fs.readFileSync(cert),
          },
        },
      });
      return utils.sendWebHookMessage(port, TOKEN, { https: true });
    });
  });

  describe('#startPolling', function initPollingSuite() {
    it('initiates polling', function test() {
      return testbot.startPolling().then(() => {
        return utils.isPollingMockServer(pollingPort);
      });
    });
    it('returns error if using webhook', function test() {
      return botWebHook.startPolling().catch((err) => {
        // TODO: check for error in a better way
        assert.ok(err.message.indexOf('mutually exclusive') !== -1);
      });
    });
  });

  describe('#isPolling', function isPollingSuite() {
    it('returns true if bot is polling', function test() {
      assert.equal(testbot.isPolling(), true);
      return utils.isPollingMockServer(pollingPort);
    });
    it('returns false if bot is not polling', function test() {
      return testbot.stopPolling().then(() => {
        assert.equal(testbot.isPolling(), false);
        utils.clearPollingCheck(pollingPort);
        return utils.isPollingMockServer(pollingPort, true);
      });
    });
    after(function after() {
      return testbot.initPolling();
    });
  });

  describe('#stopPolling', function stopPollingSuite() {
    it('stops polling by bot', function test() {
      return testbot.stopPolling().then(() => {
        utils.clearPollingCheck(pollingPort);
        return utils.isPollingMockServer(pollingPort, true);
      });
    });
  });

  describe('#openWebHook', function openWebHookSuite() {
    it('opens webhook', function test() {
      return testbot.openWebHook().then(() => {
        return utils.hasOpenWebHook(webHookPort);
      });
    });
    it('returns error if using polling', function test() {
      return botPolling.openWebHook().catch((err) => {
        // TODO: check for error in a better way
        assert.ok(err.message.indexOf('mutually exclusive') !== -1);
      });
    });
  });

  describe('#hasOpenWebHook', function hasOpenWebHookSuite() {
    it('returns true if webhook is opened', function test() {
      assert.equal(testbot.hasOpenWebHook(), true);
      return utils.hasOpenWebHook(webHookPort);
    });
    it('returns false if webhook is closed', function test() {
      testbot.closeWebHook().then(() => {
        assert.equal(testbot.hasOpenWebHook(), false);
        return utils.hasOpenWebHook(webHookPort, true);
      });
    });
    after(function after() {
      return testbot.openWebHook();
    });
  });

  describe('#closeWebHook', function closeWebHookSuite() {
    it('closes webhook', function test() {
      testbot.closeWebHook().then(() => {
        return utils.hasOpenWebHook(webHookPort, true);
      });
    });
  });

  describe('#getMe', function getMeSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'getMe', this);
    });
    it('should return an User object', function test() {
      return bot.getMe().then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.number(resp.id));
        assert.ok(is.string(resp.first_name));
      });
    });
  });

  describe('#setWebHook', function setWebHookSuite() {
    const ip = '216.58.210.174';
    before(function before() {
      utils.handleRatelimit(bot, 'setWebHook', this);
    });
    it('should set a webHook', function test() {
      // Google IP ¯\_(ツ)_/¯
      return bot
        .setWebHook(ip)
        .then(resp => {
          assert.equal(resp, true);
        });
    });
    it('should set a webHook with certificate', function test() {
      return bot
        .setWebHook(ip, { certificate: cert })
        .then(resp => {
          assert.equal(resp, true);
        });
    });
    it('(v0.25.0 and lower) should set a webHook with certificate', function test() {
      return bot
        .setWebHook(ip, cert)
        .then(resp => {
          assert.equal(resp, true);
        });
    });
    it('should delete the webHook', function test() {
      return bot
        .setWebHook('')
        .then(resp => {
          assert.equal(resp, true);
        });
    });
  });

  describe('#deleteWebHook', function deleteWebHookSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'deleteWebHook', this);
    });
    it('should delete webhook', function test() {
      return bot.deleteWebHook().then(resp => {
        assert.equal(resp, true);
      });
    });
  });

  describe('#getWebHookInfo', function getWebHookInfoSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'getWebHookInfo', this);
    });
    it('should return WebhookInfo', function test() {
      return bot.getWebHookInfo().then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.boolean(resp.has_custom_certificate));
        assert.ok(is.number(resp.pending_update_count));
      });
    });
  });

  describe('#getUpdates', function getUpdatesSuite() {
    const opts = {
      timeout: 0,
      limit: 10,
    };
    before(function before() {
      utils.handleRatelimit(bot, 'setWebHook', this);
      utils.handleRatelimit(bot, 'getUpdates', this);
      return bot.deleteWebHook();
    });
    it('should return an Array', function test() {
      return bot.getUpdates(opts).then(resp => {
        assert.equal(Array.isArray(resp), true);
      });
    });
    it('(v0.25.0 and lower) should return an Array', function test() {
      return bot.getUpdates(opts.timeout, opts.limit).then(resp => {
        assert.equal(Array.isArray(resp), true);
      });
    });
  });

  describe('#sendMessage', function sendMessageSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'sendMessage', this);
    });
    it('should send a message', function test() {
      return bot.sendMessage(USERID, 'test').then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.number(resp.message_id));
      });
    });
  });

  describe.skip('#answerInlineQuery', function answerInlineQuerySuite() {});

  describe('#forwardMessage', function forwardMessageSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'sendMessage', this);
      utils.handleRatelimit(bot, 'forwardMessage', this);
    });
    it('should forward a message', function test() {
      return bot.sendMessage(USERID, 'test').then(resp => {
        const messageId = resp.message_id;
        return bot.forwardMessage(USERID, USERID, messageId)
          .then(forwarded => {
            assert.ok(is.object(forwarded));
            assert.ok(is.number(forwarded.message_id));
          });
      });
    });
  });

  describe('#sendPhoto', function sendPhotoSuite() {
    let photoId;
    this.timeout(timeout);
    before(function before() {
      utils.handleRatelimit(bot, 'sendPhoto', this);
    });
    it('should send a photo from file', function test() {
      const photo = `${__dirname}/data/photo.gif`;
      return bot.sendPhoto(USERID, photo).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.array(resp.photo));
        photoId = resp.photo[0].file_id;
      });
    });
    it('should send a photo from id', function test() {
      // Send the same photo as before
      const photo = photoId;
      return bot.sendPhoto(USERID, photo).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.array(resp.photo));
      });
    });
    it('should send a photo from fs.readStream', function test() {
      const photo = fs.createReadStream(`${__dirname}/data/photo.gif`);
      return bot.sendPhoto(USERID, photo).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.array(resp.photo));
      });
    });
    it('should send a photo from request Stream', function test() {
      const photo = request(`${staticUrl}/photo.gif`);
      return bot.sendPhoto(USERID, photo).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.array(resp.photo));
      });
    });
    it('should send a photo from a Buffer', function test() {
      const photo = fs.readFileSync(`${__dirname}/data/photo.gif`);
      return bot.sendPhoto(USERID, photo).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.array(resp.photo));
      });
    });
  });

  describe('#sendAudio', function sendAudioSuite() {
    let audioId;
    this.timeout(timeout);
    before(function before() {
      utils.handleRatelimit(bot, 'sendAudio', this);
    });
    it('should send an MP3 audio', function test() {
      const audio = `${__dirname}/data/audio.mp3`;
      return bot.sendAudio(USERID, audio).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.audio));
        audioId = resp.audio.file_id;
      });
    });
    it('should send an audio from id', function test() {
      // Send the same audio as before
      const audio = audioId;
      return bot.sendAudio(USERID, audio).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.audio));
      });
    });
    it('should send an audio from fs.readStream', function test() {
      const audio = fs.createReadStream(`${__dirname}/data/audio.mp3`);
      return bot.sendAudio(USERID, audio).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.audio));
      });
    });
    it('should send an audio from request Stream', function test() {
      const audio = request(`${staticUrl}/audio.mp3`);
      return bot.sendAudio(USERID, audio).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.audio));
      });
    });
    it('should send an audio from a Buffer', function test() {
      const audio = fs.readFileSync(`${__dirname}/data/audio.mp3`);
      return bot.sendAudio(USERID, audio).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.audio));
      });
    });
  });

  describe('#sendDocument', function sendDocumentSuite() {
    let documentId;
    this.timeout(timeout);
    before(function before() {
      utils.handleRatelimit(bot, 'sendDocument', this);
    });
    it('should send a document from file', function test() {
      const document = `${__dirname}/data/photo.gif`;
      return bot.sendDocument(USERID, document).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.document));
        documentId = resp.document.file_id;
      });
    });
    it('should send a document from id', function test() {
      // Send the same document as before
      const document = documentId;
      return bot.sendDocument(USERID, document).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.document));
      });
    });
    it('should send a document from fs.readStream', function test() {
      const document = fs.createReadStream(`${__dirname}/data/photo.gif`);
      return bot.sendDocument(USERID, document).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.document));
      });
    });
    it('should send a document from request Stream', function test() {
      const document = request(`${staticUrl}/photo.gif`);
      return bot.sendDocument(USERID, document).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.document));
      });
    });
    it('should send a document from a Buffer', function test() {
      const document = fs.readFileSync(`${__dirname}/data/photo.gif`);
      return bot.sendDocument(USERID, document).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.document));
      });
    });
    it('should send a document with custom file options', function test() {
      const document = fs.createReadStream(`${__dirname}/data/photo.gif`);
      const fileOpts = { filename: 'customfilename.gif' };
      return bot.sendDocument(USERID, document, {}, fileOpts).then(resp => {
        assert.equal(resp.document.file_name, fileOpts.filename);
      });
    });
  });

  describe('#sendSticker', function sendStickerSuite() {
    let stickerId;
    this.timeout(timeout);
    before(function before() {
      utils.handleRatelimit(bot, 'sendSticker', this);
    });
    it('should send a sticker from file', function test() {
      const sticker = `${__dirname}/data/sticker.webp`;
      return bot.sendSticker(USERID, sticker).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.sticker));
        stickerId = resp.sticker.file_id;
      });
    });
    it('should send a sticker from id', function test() {
      // Send the same photo as before
      return bot.sendSticker(USERID, stickerId).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.sticker));
      });
    });
    it('should send a sticker from fs.readStream', function test() {
      const sticker = fs.createReadStream(`${__dirname}/data/sticker.webp`);
      return bot.sendSticker(USERID, sticker).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.sticker));
      });
    });
    it('should send a sticker from request Stream', function test() {
      const sticker = request(`${staticUrl}/sticker.webp`);
      return bot.sendSticker(USERID, sticker).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.sticker));
      });
    });
    it('should send a sticker from a Buffer', function test() {
      const sticker = fs.readFileSync(`${__dirname}/data/sticker.webp`);
      return bot.sendSticker(USERID, sticker).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.sticker));
      });
    });
  });

  describe('#sendVideo', function sendVideoSuite() {
    let videoId;
    this.timeout(timeout);
    before(function before() {
      utils.handleRatelimit(bot, 'sendVideo', this);
    });
    it('should send a video from file', function test() {
      const video = `${__dirname}/data/video.mp4`;
      return bot.sendVideo(USERID, video).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.video));
        videoId = resp.video.file_id;
      });
    });
    it('should send a video from id', function test() {
      // Send the same video as before
      return bot.sendVideo(USERID, videoId).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.video));
      });
    });
    it('should send a video from fs.readStream', function test() {
      const video = fs.createReadStream(`${__dirname}/data/video.mp4`);
      return bot.sendVideo(USERID, video).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.video));
      });
    });
    it('should send a video from request Stream', function test() {
      const video = request(`${staticUrl}/video.mp4`);
      return bot.sendVideo(USERID, video).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.video));
      });
    });
    it('should send a video from a Buffer', function test() {
      const video = fs.readFileSync(`${__dirname}/data/video.mp4`);
      return bot.sendVideo(USERID, video).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.video));
      });
    });
  });

  describe('#sendVoice', function sendVoiceSuite() {
    let voiceId;
    this.timeout(timeout);
    before(function before() {
      utils.handleRatelimit(bot, 'sendVoice', this);
    });
    it('should send a voice from file', function test() {
      const voice = `${__dirname}/data/voice.ogg`;
      return bot.sendVoice(USERID, voice).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.voice));
        voiceId = resp.voice.file_id;
      });
    });
    it('should send a voice from id', function test() {
      // Send the same voice as before
      return bot.sendVoice(USERID, voiceId).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.voice));
      });
    });
    it('should send a voice from fs.readStream', function test() {
      const voice = fs.createReadStream(`${__dirname}/data/voice.ogg`);
      return bot.sendVoice(USERID, voice).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.voice));
      });
    });
    it('should send a voice from request Stream', function test() {
      const voice = request(`${staticUrl}/voice.ogg`);
      return bot.sendVoice(USERID, voice).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.voice));
      });
    });
    it('should send a voice from a Buffer', function test() {
      const voice = fs.readFileSync(`${__dirname}/data/voice.ogg`);
      return bot.sendVoice(USERID, voice).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.voice));
      });
    });
  });

  describe('#sendChatAction', function sendChatActionSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'sendChatAction', this);
    });
    it('should send a chat action', function test() {
      const action = 'typing';
      return bot.sendChatAction(USERID, action).then(resp => {
        assert.equal(resp, true);
      });
    });
  });

  describe.skip('#kickChatMember', function kickChatMemberSuite() {});

  describe.skip('#unbanChatMember', function unbanChatMemberSuite() {});

  describe.skip('#answerCallbackQuery', function answerCallbackQuerySuite() {});

  describe('#editMessageText', function editMessageTextSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'sendMessage', this);
      utils.handleRatelimit(bot, 'editMessageText', this);
    });
    it('should edit a message sent by the bot', function test() {
      return bot.sendMessage(USERID, 'test').then(resp => {
        assert.equal(resp.text, 'test');
        const opts = {
          chat_id: USERID,
          message_id: resp.message_id
        };
        return bot.editMessageText('edit test', opts).then(msg => {
          assert.equal(msg.text, 'edit test');
        });
      });
    });
  });

  describe('#editMessageCaption', function editMessageCaptionSuite() {
    this.timeout(timeout);
    before(function before() {
      utils.handleRatelimit(bot, 'sendPhoto', this);
      utils.handleRatelimit(bot, 'editMessageCaption', this);
    });
    it('should edit a caption sent by the bot', function test() {
      const photo = `${__dirname}/data/photo.gif`;
      const options = { caption: 'test caption' };
      return bot.sendPhoto(USERID, photo, options).then(resp => {
        assert.equal(resp.caption, 'test caption');
        const opts = {
          chat_id: USERID,
          message_id: resp.message_id
        };
        return bot.editMessageCaption('new test caption', opts).then(msg => {
          assert.equal(msg.caption, 'new test caption');
        });
      });
    });
  });

  describe('#editMessageReplyMarkup', function editMessageReplyMarkupSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'sendMessage', this);
      utils.handleRatelimit(bot, 'editMessageReplyMarkup', this);
    });
    it('should edit previously-set reply markup', function test() {
      return bot.sendMessage(USERID, 'test').then(resp => {
        const replyMarkup = JSON.stringify({
          inline_keyboard: [[{
            text: 'Test button',
            callback_data: 'test'
          }]]
        });
        const opts = {
          chat_id: USERID,
          message_id: resp.message_id
        };
        return bot.editMessageReplyMarkup(replyMarkup, opts).then(msg => {
          // Keyboard markup is not returned, do a simple object check
          assert.ok(is.object(msg));
        });
      });
    });
  });

  describe('#getUserProfilePhotos', function getUserProfilePhotosSuite() {
    const opts = {
      offset: 0,
      limit: 1,
    };
    before(function before() {
      utils.handleRatelimit(bot, 'getUserProfilePhotos', this);
    });
    it('should get user profile photos', function test() {
      return bot.getUserProfilePhotos(USERID, opts).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.number(resp.total_count));
        assert.ok(is.array(resp.photos));
      });
    });
    it('(v0.25.0 and lower) should get user profile photos', function test() {
      return bot.getUserProfilePhotos(USERID, opts.offset, opts.limit).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.number(resp.total_count));
        assert.ok(is.array(resp.photos));
      });
    });
  });

  describe('#sendLocation', function sendLocationSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'sendLocation', this);
    });
    it('should send a location', function test() {
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

  describe('#sendVenue', function sendVenueSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'sendVenue', this);
    });
    it('should send a venue', function test() {
      const lat = 47.5351072;
      const long = -52.7508537;
      const title = 'The Village Shopping Centre';
      const address = '430 Topsail Rd,St. John\'s, NL A1E 4N1, Canada';
      return bot.sendVenue(USERID, lat, long, title, address).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.venue));
        assert.ok(is.object(resp.venue.location));
        assert.ok(is.number(resp.venue.location.latitude));
        assert.ok(is.number(resp.venue.location.longitude));
        assert.ok(is.string(resp.venue.title));
        assert.ok(is.string(resp.venue.address));
      });
    });
  });

  // NOTE: We are skipping TelegramBot#sendContact() as the
  // corresponding rate-limits enforced by the Telegram servers
  // are too strict! During our initial tests, we were required
  // to retry after ~72000 secs (1200 mins / 20 hrs).
  // We surely can NOT wait for that much time during testing
  // (or in most practical cases for that matter!)
  describe.skip('#sendContact', function sendContactSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'sendContact', this);
    });
    it('should send a contact', function test() {
      const phoneNumber = '+1(000)000-000';
      const firstName = 'John Doe';
      return bot.sendContact(USERID, phoneNumber, firstName).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.contact));
        assert.ok(is.string(resp.contact.phone_number));
        assert.ok(is.string(resp.contact.first_name));
      });
    });
  });

  describe('#getFile', function getFileSuite() {
    this.timeout(timeout);
    before(function before() {
      utils.handleRatelimit(bot, 'getFile', this);
    });
    it('should get a file', function test() {
      return bot.getFile(FILE_ID)
        .then(resp => {
          assert.ok(is.object(resp));
          assert.ok(is.string(resp.file_path));
        });
    });
  });

  describe('#getFileLink', function getFileLinkSuite() {
    this.timeout(timeout);
    before(function before() {
      utils.handleRatelimit(bot, 'getFileLink', this);
    });
    it('should get a file link', function test() {
      return bot.getFileLink(FILE_ID)
        .then(fileURI => {
          assert.ok(is.string(fileURI));
          assert.ok(/https?:\/\/.*\/file\/bot.*\/.*/.test(fileURI));
        });
    });
  });

  describe('#downloadFile', function downloadFileSuite() {
    const downloadPath = os.tmpdir();
    this.timeout(timeout);
    before(function before() {
      utils.handleRatelimit(bot, 'downloadFile', this);
    });
    it('should download a file', function test() {
      return bot.downloadFile(FILE_ID, downloadPath)
        .then(filePath => {
          assert.ok(is.string(filePath));
          assert.equal(path.dirname(filePath), downloadPath);
          assert.ok(fs.existsSync(filePath));
          fs.unlinkSync(filePath); // Delete file after test
        });
    });
  });

  describe('#onText', function onTextSuite() {
    it('should call `onText` callback on match', function test(done) {
      botWebHook.onText(/\/onText (.+)/, (msg, match) => {
        assert.equal(match[1], 'ECHO ALOHA');
        return done();
      });
      utils.sendWebHookMessage(webHookPort2, TOKEN, {
        message: { text: '/onText ECHO ALOHA' },
      });
    });
  });

  describe.skip('#onReplyToMessage', function onReplyToMessageSuite() {});

  describe('#getChat', function getChatSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'getChat', this);
    });
    it('should return a Chat object', function test() {
      return bot.getChat(USERID).then(resp => {
        assert.ok(is.object(resp));
      });
    });
  });

  describe('#getChatAdministrators', function getChatAdministratorsSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'getChatAdministrators', this);
    });
    it('should return an Array', function test() {
      return bot.getChatAdministrators(GROUPID).then(resp => {
        assert.ok(Array.isArray(resp));
      });
    });
  });

  describe('#getChatMembersCount', function getChatMembersCountSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'getChatMembersCount', this);
    });
    it('should return an Integer', function test() {
      return bot.getChatMembersCount(GROUPID).then(resp => {
        assert.ok(Number.isInteger(resp));
      });
    });
  });

  describe('#getChatMember', function getChatMemberSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'getChatMember', this);
    });
    it('should return a ChatMember', function test() {
      return bot.getChatMember(GROUPID, USERID).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.user));
        assert.ok(is.string(resp.status));
      });
    });
  });

  describe.skip('#leaveChat', function leaveChatSuite() {});

  describe('#sendGame', function sendGameSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'sendGame', this);
    });
    it('should send a Game', function test() {
      return bot.sendGame(USERID, GAME_SHORT_NAME).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.object(resp.game));
      });
    });
  });

  describe('#setGameScore', function setGameScoreSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'setGameScore', this);
    });
    it('should set GameScore', function test() {
      const score = Math.floor(Math.random() * 1000);
      const opts = {
        chat_id: GAME_CHAT_ID,
        message_id: GAME_MSG_ID,
        force: true
      };
      return bot.setGameScore(USERID, score, opts).then(resp => {
        assert.ok(is.object(resp) || is.boolean(resp));
      });
    });
  });

  describe('#getGameHighScores', function getGameHighScoresSuite() {
    before(function before() {
      utils.handleRatelimit(bot, 'getGameHighScores', this);
    });
    it('should get GameHighScores', function test() {
      const opts = {
        chat_id: GAME_CHAT_ID,
        message_id: GAME_MSG_ID,
      };
      return bot.getGameHighScores(USERID, opts).then(resp => {
        assert.ok(is.array(resp));
      });
    });
  });

  describe('#_formatSendData', function _formatSendDataSuite() {
    it('should handle buffer path from fs.readStream', function test() {
      let photo;
      try {
        photo = fs.createReadStream(Buffer.from(`${__dirname}/data/photo.gif`));
      } catch (ex) {
        // Older Node.js versions do not support passing a Buffer
        // representation of the path to fs.createReadStream()
        if (ex instanceof TypeError) return Promise.resolve();
      }
      return bot.sendPhoto(USERID, photo).then(resp => {
        assert.ok(is.object(resp));
        assert.ok(is.array(resp.photo));
      });
    });
    it('should not accept file-paths if disallowed with constructor option', function test() {
      const tgbot = new TelegramBot(TOKEN, { filepath: false });
      const photo = `${__dirname}/data/photo.gif`;
      return tgbot.sendPhoto(USERID, photo).catch(err => {
        // TODO: check for error in a better way
        assert.ok(err.response.body.indexOf('Bad Request') !== -1);
      });
    });
    it('should allow stream.path that can not be parsed', function test() {
      const stream = fs.createReadStream(`${__dirname}/data/photo.gif`);
      stream.path = '/?id=123'; // for example, 'http://example.com/?id=666'
      return bot.sendPhoto(USERID, stream);
    });
  });
}); // End Telegram
