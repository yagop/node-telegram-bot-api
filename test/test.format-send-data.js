const assert = require('assert');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('..');

const paths = {
  audio: path.join(__dirname, 'data/audio.mp3'),
};


describe('#_formatSendData', function sendfileSuite() {
  const bot = new TelegramBot('token');
  const type = 'file';

  before(function beforeSuite() {
    process.env.NTBA_FIX_350 = 1;
  });
  after(function afterSuite() {
    delete process.env.NTBA_FIX_350;
  });

  describe('using fileOptions', function sendfileOptionsSuite() {
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

  it('should handle buffer path from fs.readStream', function test() {
    let file;
    try {
      file = fs.createReadStream(Buffer.from(paths.audio));
    } catch (ex) {
      // Older Node.js versions do not support passing a Buffer
      // representation of the path to fs.createReadStream()
      if (ex instanceof TypeError) {
        Promise.resolve();
        return;
      }
    }
    const [{ [type]: data }] = bot._formatSendData('file', file);
    assert.equal(data.options.filename, path.basename(paths.audio));
  });

  it('should not accept file-paths if disallowed with constructor option', function test() {
    const tgbot = new TelegramBot('token', { filepath: false });
    const [formData, fileId] = tgbot._formatSendData('file', paths.audio);
    assert.ok(fileId);
    assert.ok(!formData);
  });

  it('should allow stream.path that can not be parsed', function test() {
    const stream = fs.createReadStream(paths.audio);
    stream.path = '/?id=123'; // for example, 'http://example.com/?id=666'
    assert.doesNotThrow(function assertDoesNotThrow() {
      bot._formatSendData('file', stream);
    });
  });
});
