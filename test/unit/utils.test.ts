import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";

import { prepareFile, prepareFiles, stringify, streamToBuffer } from "../../src/utils.js";

describe("utils", () => {
  describe("stringify()", () => {
    it("returns strings unchanged", () => {
      assert.equal(stringify("hello"), "hello");
    });

    it("JSON-encodes non-strings", () => {
      assert.equal(stringify(42), "42");
      assert.equal(stringify(true), "true");
      assert.equal(stringify({ a: 1 }), '{"a":1}');
      assert.equal(stringify([1, 2, 3]), "[1,2,3]");
    });
  });

  describe("prepareFile()", () => {
    it("returns null/null for nullish data", async () => {
      assert.deepEqual(await prepareFile(null), { file: null, fileId: null });
      assert.deepEqual(await prepareFile(undefined), { file: null, fileId: null });
    });

    it("treats unknown strings as fileId or URL when filepath lookup is off", async () => {
      const result = await prepareFile("AgACABCD", {}, false);
      assert.equal(result.file, null);
      assert.equal(result.fileId, "AgACABCD");
    });

    it("detects PNG via magic bytes from a buffer", async () => {
      // 8-byte PNG signature
      const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      const { file } = await prepareFile(buf);
      assert.ok(file, "expected file");
      assert.equal(file!.contentType, "image/png");
      assert.match(file!.filename, /\.png$/);
    });

    it("detects JPEG via magic bytes from a buffer", async () => {
      const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
      const { file } = await prepareFile(buf);
      assert.equal(file?.contentType, "image/jpeg");
    });

    it("falls back to octet-stream + given filename for unknown buffers", async () => {
      const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const { file } = await prepareFile(buf, { filename: "blob.bin" });
      assert.equal(file?.contentType, "application/octet-stream");
      assert.equal(file?.filename, "blob.bin");
    });

    it("preserves user-provided contentType", async () => {
      const { file } = await prepareFile(Buffer.from([0x00]), { contentType: "application/x-custom" });
      assert.equal(file?.contentType, "application/x-custom");
    });

    it("accepts Readable streams", async () => {
      const stream = Readable.from(["hello"]);
      const { file } = await prepareFile(stream, { filename: "greeting.txt" });
      assert.ok(file);
      assert.equal(file!.filename, "greeting.txt");
      assert.equal(file!.contentType, "text/plain");
    });
  });

  describe("prepareFiles()", () => {
    it("groups buffers under the attach key with index suffix", async () => {
      const inputs = [
        { media: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
        { media: "BAACABCD" },
      ];
      const { formData, fileIds } = await prepareFiles("media", inputs, {}, false);
      assert.deepEqual(Object.keys(formData), ["media_0"]);
      assert.equal(fileIds[1], "BAACABCD");
    });
  });

  describe("streamToBuffer()", () => {
    it("collects an async iterable into a buffer", async () => {
      const stream = Readable.from([Buffer.from("foo"), Buffer.from("bar")]);
      const buf = await streamToBuffer(stream);
      assert.equal(buf.toString("utf8"), "foobar");
    });
  });
});
