var TelegramPolling = require('../src/telegramPolling');
var Telegram = require('../index');
var request = require('request');
var should = require('should');
var fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var TOKEN = process.env.TEST_TELEGRAM_TOKEN;
if (!TOKEN) {
  throw new Error('Bot token not provided');
}
// Telegram service if not User Id
var USERID = process.env.TEST_USER_ID || 777000;

describe('Telegram', function () {

  describe('#setWebHook', function () {
    it('should set a webHook', function (done) {
      var bot = new Telegram(TOKEN);
      bot.setWebHook('216.58.210.174').then(function (resp) {
        resp.should.be.exactly(true);
        done();
      });
    });

    it('should delete the webHook', function (done) {
      var bot = new Telegram(TOKEN);
      bot.setWebHook('').then(function (resp) {
        resp.should.be.exactly(true);
        done();
      });
    });
  });

  describe('#WebHook', function () {
    it('should reject request if same token not provided', function (done) {
      var bot = new Telegram(TOKEN, {webHook: true});
      request({
        url: 'http://localhost:8443/NOT_REAL_TOKEN',
        method: 'POST'
      }, function (error, response, body) {
        response.statusCode.should.not.be.equal(200);
        bot._WebHook._webServer.close();
        done();
      });
    });

    it('should reject request if authorized but not a POST', function (done) {
      var bot = new Telegram(TOKEN, {webHook: true});
      request({
        url: 'http://localhost:8443/bot'+TOKEN,
        method: 'GET'
      }, function (error, response, body) {
        response.statusCode.should.not.be.equal(200);
        bot._WebHook._webServer.close();
        done();
      });
    });

    it('should emit a `message` on HTTP WebHook', function (done) {
      var bot = new Telegram(TOKEN, {webHook: true});
      bot.on('message', function (msg) {
        bot._WebHook._webServer.close();
        done();
      });
      var url = 'http://localhost:8443/bot'+TOKEN;
      request({
        url: url,
        method: 'POST',
        json: true,
        headers: {
          "content-type": "application/json",
        },
        body: {update_id: 0, message: {text: 'test'}}
      });
    });

    it('should emit a `message` on HTTPS WebHook', function (done) {
      var opts = {
        webHook: {
          port: 8443,
          key: __dirname+'/../examples/key.pem',
          cert: __dirname+'/../examples/crt.pem'
        }
      };
      var bot = new Telegram(TOKEN, opts);
      bot.on('message', function (msg) {
        bot._WebHook._webServer.close();
        done();
      });
      var url = 'https://localhost:8443/bot'+TOKEN;
      request({
        url: url,
        method: 'POST',
        json: true,
        headers: {
          "content-type": "application/json",
        },
        rejectUnhauthorized: false,
        body: {update_id: 0, message: {text: 'test'}}
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

  describe('#sendChatAction', function () {
    it('should send a chat action', function (done) {
      var bot = new Telegram(TOKEN);
      var action = "typing";
      bot.sendChatAction(USERID, action).then(function (resp) {
        resp.should.be.exactly(true);
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

  describe('#sendDocument', function () {
    var documentId;
    it('should send a document from file', function (done) {
      var bot = new Telegram(TOKEN);
      var document = __dirname+'/bot.gif';
      bot.sendDocument(USERID, document).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        documentId = resp.document.file_id;
        done();
      });
    });

    it('should send a document from id', function (done) {
      var bot = new Telegram(TOKEN);
      // Send the same photo as before
      var document = documentId;
      bot.sendDocument(USERID, document).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        done();
      });
    });

    it('should send a document from fs.readStream', function (done) {
      var bot = new Telegram(TOKEN);
      var document = fs.createReadStream(__dirname+'/bot.gif');
      bot.sendDocument(USERID, document).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        done();
      });
    });

    it('should send a document from request Stream', function (done) {
      var bot = new Telegram(TOKEN);
      var document = request('https://telegram.org/img/t_logo.png');
      bot.sendDocument(USERID, document).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        done();
      });
    });
  });

  describe('#sendSticker', function () {
    var stickerId;
    it('should send a sticker from file', function (done) {
      var bot = new Telegram(TOKEN);
      var sticker = __dirname+'/sticker.webp';
      bot.sendSticker(USERID, sticker).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        stickerId = resp.sticker.file_id;
        done();
      });
    });

    it('should send a sticker from id', function (done) {
      var bot = new Telegram(TOKEN);
      // Send the same photo as before
      bot.sendSticker(USERID, stickerId).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        done();
      });
    });

    it('should send a sticker from fs.readStream', function (done) {
      var bot = new Telegram(TOKEN);
      var sticker = fs.createReadStream(__dirname+'/sticker.webp');
      bot.sendSticker(USERID, sticker).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        done();
      });
    });

    it('should send a sticker from request Stream', function (done) {
      var bot = new Telegram(TOKEN);
      var sticker = request('https://www.gstatic.com/webp/gallery3/1_webp_ll.webp');
      bot.sendSticker(USERID, sticker).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        done();
      });
    });
  });

  describe('#sendVideo', function () {
    var videoId;
    it('should send a video from file', function (done) {
      var bot = new Telegram(TOKEN);
      var video = __dirname+'/video.mp4';
      bot.sendVideo(USERID, video).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        videoId = resp.video.file_id;
        done();
      });
    });

    it('should send a video from id', function (done) {
      var bot = new Telegram(TOKEN);
      // Send the same photo as before
      bot.sendVideo(USERID, videoId).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        done();
      });
    });

    it('should send a video from fs.readStream', function (done) {
      var bot = new Telegram(TOKEN);
      var video = fs.createReadStream(__dirname+'/video.mp4');
      bot.sendVideo(USERID, video).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        done();
      });
    });

    it('should send a video from request Stream', function (done) {
      var bot = new Telegram(TOKEN);
      var sticker = request('http://techslides.com/demos/sample-videos/small.mp4');
      bot.sendVideo(USERID, sticker).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        done();
      });
    });
  });

  describe('#getUserProfilePhotos', function () {
    it('should get user profile photos', function (done) {
      var bot = new Telegram(TOKEN);
      bot.getUserProfilePhotos(USERID).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        resp.total_count.should.be.an.instanceOf(Number);
        resp.photos.should.be.an.instanceOf(Array);
        done();
      });
    });
  });

  describe('#sendLocation', function () {
    it('should send a location', function (done) {
      var bot = new Telegram(TOKEN);
      var lat = 47.5351072;
      var long = -52.7508537;
      bot.sendLocation(USERID, lat, long).then(function (resp) {
        resp.should.be.an.instanceOf(Object);
        resp.location.should.be.an.instanceOf(Object);
        resp.location.latitude.should.be.an.instanceOf(Number);
        resp.location.longitude.should.be.an.instanceOf(Number);
        done();
      });
    });
  });

}); // End Telegram


describe('#TelegramBotPolling', function () {
  it('should call the callback on polling', function (done) {
    function onUpdate (update) {
      update.should.be.an.instanceOf(Object);
      done();
    }
    var polling = new TelegramPolling(null, {interval: 500}, onUpdate);
    // Not the best way to mock, but it works
    polling._getUpdates = function() {
      return {
        then: function (cb) {
          cb([{update_id: 10, message: {}}]);
          return this;
        },
        catch: function () {
          return this;
        },
        finally: function () {}
      };
    };
  });
});
