const assert = require('assert');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('..');

const paths = {
  audio: path.join(__dirname, 'data/audio.mp3'),
};


// TODO:Enable all other tests
describe.only('sending files', function sendfileSuite() {
  const bot = new TelegramBot('token ');

  before(function beforeSuite() {
    process.env.NTBA_FIX_350 = 1;
  });
  after(function afterSuite() {
    delete process.env.NTBA_FIX_350;
  });

  describe('using fileOptions', function sendfileOptionsSuite() {
    const type = 'file';
    const stream = fs.createReadStream(paths.audio);
    const nonPathStream = fs.createReadStream(paths.audio);
    const buffer = fs.readFileSync(paths.audio);
    const nonDetectableBuffer = fs.readFileSync(__filename);
    const filepath = paths.audio;
    const files = [stream, nonPathStream, buffer, nonDetectableBuffer, filepath];

    delete nonPathStream.path;

    describe('filename', function filenameSuite() {
      it('(1) fileOptions.filename', function test() {
        const filename = 'custom-filename';
        files.forEach((file) => {
          const [{ [type]: data }] = bot._formatSendData(type, file, { filename });
          assert.equal(data.options.filename, filename);
        });
      });

      it('(2) Stream#path', function test() {
        if (!stream.path) {
          this.skip('Stream#path unsupported');
          return;
        }
        const [{ [type]: data }] = bot._formatSendData(type, stream);
        assert.equal(data.options.filename, path.basename(paths.audio));
      });

      it('(3) filepath', function test() {
        const [{ [type]: data }] = bot._formatSendData(type, filepath);
        assert.equal(data.options.filename, path.basename(paths.audio));
      });

      it('(4) final default', function test() {
        [nonPathStream, buffer, nonDetectableBuffer].forEach((file) => {
          const [{ [type]: data }] = bot._formatSendData(type, file);
          assert.equal(data.options.filename, 'filename');
        });
      });
    });

    describe('contentType', function contentTypeSuite() {
      it('(1) fileOpts.contentType', function test() {
        const contentType = 'application/custom-type';
        files.forEach((file) => {
          const [{ [type]: data }] = bot._formatSendData(type, file, { contentType });
          assert.equal(data.options.contentType, contentType);
        });
      });

      it('(2) Stream#path', function test() {
        if (!stream.path) {
          this.skip('Stream#path unsupported');
          return;
        }
        const [{ [type]: data }] = bot._formatSendData(type, stream);
        assert.equal(data.options.contentType, 'audio/mpeg');
      });

      it('(3) Buffer file-type', function test() {
        const [{ [type]: data }] = bot._formatSendData(type, buffer);
        assert.equal(data.options.contentType, 'audio/mpeg');
      });

      it('(4) filepath', function test() {
        const [{ [type]: data }] = bot._formatSendData(type, filepath);
        assert.equal(data.options.contentType, 'audio/mpeg');
      });

      it('(5) fileOptions.filename', function test() {
        [nonPathStream, nonDetectableBuffer].forEach((file) => {
          const [{ [type]: data }] = bot._formatSendData(type, file, {
            filename: 'image.gif',
          });
          assert.equal(data.options.contentType, 'image/gif');
        });
      });

      it('(6) Final default', function test() {
        [nonPathStream, nonDetectableBuffer].forEach((file) => {
          const [{ [type]: data }] = bot._formatSendData(type, file);
          assert.equal(data.options.contentType, 'application/octet-stream');
        });
      });
    });
  });
});
