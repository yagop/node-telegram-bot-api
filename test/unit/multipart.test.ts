import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { InputFile } from "../../src/core/files.js";
import { bufferBody, multipartBody, streamBody, supportsRequestStreams } from "../../src/core/multipart.js";

// The streaming multipart encoder: wire layout, header escaping, replayability
// and the request-stream capability probe. encodeForm's use of it (field
// splitting, headers, the fallback wiring) is covered by encode.test.ts.

async function drain(pieces: Parameters<typeof streamBody>[0]): Promise<string> {
  return new Response(streamBody(pieces)).text();
}

describe("multipart", () => {
  test("request-stream support: true everywhere except proxied Bun < 1.4 (stream bodies stall there)", () => {
    // Bun < 1.4.0 streams fine on a direct connection but stalls through an
    // HTTP(S) CONNECT proxy, which it picks up from the env automatically
    // (oven-sh/bun#33918, fixed by oven-sh/bun#32635 in 1.4.0) - so the
    // expectation depends on this run's runtime version and env.
    const bun = (globalThis as { Bun?: { version?: string; env?: Record<string, string | undefined> } }).Bun;
    let expected = true;
    if (bun !== undefined) {
      const [major = 0, minor = 0] = (bun.version ?? "0.0.0").split(".").map(Number);
      const fixed = major > 1 || (major === 1 && minor >= 4);
      const env = bun.env ?? {};
      const proxied = Boolean(
        env.HTTPS_PROXY ?? env.https_proxy ?? env.HTTP_PROXY ?? env.http_proxy ?? env.ALL_PROXY ?? env.all_proxy,
      );
      expected = fixed || !proxied;
    }
    assert.strictEqual(supportsRequestStreams(), expected);
  });

  test("layout: text fields, then file parts, then the closing boundary", async () => {
    const { boundary, pieces, replayable } = multipartBody(
      [["chat_id", "7"]],
      [["photo", new InputFile(new Uint8Array([88, 89]), { filename: "a.png", contentType: "image/png" })]],
    );
    assert.ok(boundary.length <= 70, "RFC 2046 caps the boundary at 70 chars");
    assert.ok(/^[0-9A-Za-z-]+$/.test(boundary));
    assert.strictEqual(replayable, true);
    assert.strictEqual(
      await drain(pieces),
      `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n7\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="a.png"\r\n` +
        `Content-Type: image/png\r\n\r\nXY\r\n` +
        `--${boundary}--\r\n`,
    );
  });

  test("boundary is unique per body and does not rely on a global crypto", () => {
    // The boundary is built from Math.random + timestamp + a counter (no CSPRNG,
    // so core needs no global `crypto`, which Node exposes unflagged only from
    // v19). Distinctness across builds is what keeps parts from colliding.
    const make = () => multipartBody([["a", "1"]], []).boundary;
    const boundaries = new Set(Array.from({ length: 100 }, make));
    assert.strictEqual(boundaries.size, 100, "every boundary must be distinct");
    for (const b of boundaries) {
      assert.ok(b.length <= 70, "RFC 2046 caps the boundary at 70 chars");
      assert.ok(/^[0-9A-Za-z-]+$/.test(b));
    }
  });

  test("a Blob part streams its bytes and contributes its own content type", async () => {
    const blob = new Blob(["hello"], { type: "text/plain" });
    const { pieces } = multipartBody([], [["document", new InputFile(blob, { filename: "h.txt" })]]);
    const text = await drain(pieces);
    // Bun normalizes the Blob type to "text/plain;charset=utf-8"; both are fine.
    assert.match(text, /filename="h\.txt"\r\nContent-Type: text\/plain[^\r]*\r\n\r\nhello\r\n/);
  });

  test("meta.contentType wins over the Blob's own type; default is octet-stream", async () => {
    const typed = multipartBody(
      [],
      [["a", new InputFile(new Blob(["x"], { type: "text/plain" }), { contentType: "image/gif" })]],
    );
    assert.ok((await drain(typed.pieces)).includes("Content-Type: image/gif"));
    const bare = multipartBody([], [["b", new InputFile(new Uint8Array([1]))]]);
    assert.ok((await drain(bare.pieces)).includes("Content-Type: application/octet-stream"));
  });

  test('quotes and newlines in names/filenames are escaped (%22 / %0A / %0D)', async () => {
    const file = new InputFile(new Uint8Array([1]), { filename: 'we"ird\r\nname.bin' });
    const { pieces } = multipartBody([], [["photo", file]]);
    const text = await drain(pieces);
    assert.ok(text.includes('filename="we%22ird%0D%0Aname.bin"'));
    assert.ok(!text.includes('we"ird'));
  });

  test("missing filename falls back to the field name", async () => {
    const { pieces } = multipartBody([], [["voice", new InputFile(new Uint8Array([1]))]]);
    assert.ok((await drain(pieces)).includes('name="voice"; filename="voice"'));
  });

  test("streaming a one-shot ReadableStream part flags the body non-replayable but streams it through", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array([104, 105]));
        c.close();
      },
    });
    const { pieces, replayable } = multipartBody([], [["video", new InputFile(stream)]]);
    assert.strictEqual(replayable, false);
    assert.ok((await drain(pieces)).includes("\r\n\r\nhi\r\n--"));
  });

  test("replay: consecutive streamBody() builds over the same pieces emit identical bytes", async () => {
    const { pieces } = multipartBody(
      [["chat_id", "1"]],
      [["doc", new InputFile(new Blob([new Uint8Array(4096).fill(122)]))]],
    );
    assert.strictEqual(await drain(pieces), await drain(pieces));
  });

  test("a stream factory stays replayable: each body build opens a fresh stream", async () => {
    let opens = 0;
    const factory = () => {
      opens += 1;
      return new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(new TextEncoder().encode("fresh"));
          c.close();
        },
      });
    };
    const { pieces, replayable } = multipartBody([], [["video", new InputFile(factory)]]);
    assert.strictEqual(replayable, true);
    const first = await drain(pieces);
    const second = await drain(pieces);
    assert.strictEqual(first, second);
    assert.ok(first.includes("\r\n\r\nfresh\r\n"));
    assert.strictEqual(opens, 2);
  });

  test("a hostile meta.contentType cannot inject part headers", async () => {
    const file = new InputFile(new Uint8Array([1]), { contentType: 'image/png\r\nX-Evil: 1\r\n\r\nforged"' });
    const text = await drain(multipartBody([], [["photo", file]]).pieces);
    assert.ok(!text.includes("X-Evil"), "CR/LF in a content type must not become a header");
    assert.ok(text.includes("Content-Type: application/octet-stream"));
  });

  test("encoding is lazy: the source is not read until the body is consumed", async () => {
    let pulls = 0;
    const source = new ReadableStream<Uint8Array>(
      {
        pull(c) {
          pulls += 1;
          c.enqueue(new TextEncoder().encode("late"));
          c.close();
        },
      },
      { highWaterMark: 0 },
    );
    const { pieces } = multipartBody([["chat_id", "1"]], [["video", new InputFile(source)]]);
    const body = streamBody(pieces);
    assert.strictEqual(pulls, 0, "building the body must not read the upload");
    assert.ok((await new Response(body).text()).includes("late"));
    assert.strictEqual(pulls, 1);
  });

  test("bufferBody yields the same bytes as streaming", async () => {
    const { pieces } = multipartBody([["a", "b"]], [["f", new InputFile(new Uint8Array([9, 8, 7]))]]);
    const blob = await bufferBody(pieces);
    assert.strictEqual(await blob.text(), await drain(pieces));
  });

  test("cancelling the body stream mid-flight cancels the underlying source", async () => {
    let sourceCancelled = false;
    const endless = new ReadableStream<Uint8Array>({
      pull(c) {
        c.enqueue(new Uint8Array(64));
      },
      cancel() {
        sourceCancelled = true;
      },
    });
    const { pieces } = multipartBody([], [["video", new InputFile(endless)]]);
    const body = streamBody(pieces);
    const reader = body.getReader();
    await reader.read(); // part header
    await reader.read(); // first data chunk
    await reader.cancel();
    assert.strictEqual(sourceCancelled, true);
  });
});
