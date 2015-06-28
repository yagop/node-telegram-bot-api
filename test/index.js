var Telegram = require('../src/telegram');
var request = require('request');
var should = require('should');
var fs = require('fs');

var TOKEN = process.env.TEST_TELEGRAM_TOKEN;
if (!TOKEN) {
  throw new Error('Bot token not provided');
}
// Telegram service if not User Id
var USERID = process.env.TEST_USER_ID || 777000;

describe('Telegram', function () {

  describe('#emit', function () {
    it('should emit a `message` on polling', function (done) {
      var bot = new Telegram(TOKEN);
      bot.on('message', function (msg) {
        msg.should.be.an.instanceOf(Object);
        bot._polling = function () {};
        done();
      });
      bot.getUpdates = function() {
        return {
          then: function (cb) {
            cb([{update_id: 0, message: {}}]);
          }
        };
      };
      bot._polling();
    });

    it('should emit a `message` on WebHook', function (done) {
      var bot = new Telegram(TOKEN, {webHook: true});
      bot.on('message', function (msg) {
        msg.should.be.an.instanceOf(Object);
        done();
      });
      var url = 'http://localhost:8443/bot';
      request({
        url: url,
        method: 'POST',
        json: true,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({update_id: 0, message: {text: 'test'}})
      });
    });
  });

  describe('#getMe', function () {
    it('should return an User object', function (done) {
      var bot = new Telegram(TOKEN);
      bot.getMe().then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        done();
      });
    });
  });

  describe('#getUpdates', function () {
    it('should return an Array', function (done) {
      var bot = new Telegram(TOKEN);
      bot.getUpdates().then(function (resp) {
        resp.should.be.an.instanceOf(Array);
        done();
      });
    });
  });

  describe('#sendMessage', function () {
    it('should send a message', function (done) {
      var bot = new Telegram(TOKEN);
      bot.sendMessage(USERID, 'test').then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        done();
      });
    });
  });

  describe('#forwardMessage', function () {
    it('should forward a message', function (done) {
      var bot = new Telegram(TOKEN);
      bot.sendMessage(USERID, 'test').then(function (resp) {
        var messageId = resp.message_id;
        bot.forwardMessage(USERID, USERID, messageId)
          .then(function (resp) {
            resp.should.be.an.instanceOf(Object);
            done();
          });
      });
    });
  });

  describe('#sendPhoto', function () {
    var photoId;
    it('should send a photo from file', function (done) {
      var bot = new Telegram(TOKEN);
      var photo = __dirname+'/bot.gif';
      bot.sendPhoto(USERID, photo).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        photoId = resp.photo[0].file_id;
        done();
      });
    });

    it('should send a photo from id', function (done) {
      var bot = new Telegram(TOKEN);
      // Send the same photo as before
      var photo = photoId;
      bot.sendPhoto(USERID, photo).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        done();
      });
    });

    it('should send a photo from fs.readStream', function (done) {
      var bot = new Telegram(TOKEN);
      var photo = fs.createReadStream(__dirname+'/bot.gif');
      bot.sendPhoto(USERID, photo).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        done();
      });
    });

    it('should send a photo from request Stream', function (done) {
      var bot = new Telegram(TOKEN);
      var photo = request('https://telegram.org/img/t_logo.png');
      bot.sendPhoto(USERID, photo).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        done();
      });
    });
  });

  describe('#sendAudio', function () {
    it('should send an OGG audio', function (done) {
      var bot = new Telegram(TOKEN);
      var audio = request('https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg');
      bot.sendAudio(USERID, audio).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        done();
      });
    });
  });

});
