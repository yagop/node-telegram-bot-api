import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { encodeForm } from "../../src/core/encode.js";
import { formPart, InputFile } from "../../src/core/files.js";

// encodeForm is the pure wire-record consumer (a Record<string, WireValue>): per
// field it collects an InputFile as a multipart part, spreads a FormPart's JSON +
// parts, or sets a string/String-coerced scalar. The param-side serialization
// (objects -> JSON, nested InputFile -> attach://, null-stripping) lives in
// serializeParams and is covered by serialize.test.ts; the multipart wire layout
// itself is covered by multipart.test.ts.

/** Drain one body() build into its full text. */
async function bodyText(body: URLSearchParams | ReadableStream<Uint8Array> | Blob): Promise<string> {
  return new Response(body as ConstructorParameters<typeof Response>[0]).text();
}

/** The boundary token from an EncodedRequest's content-type header. */
function boundaryOf(headers: Record<string, string>): string {
  const match = /^multipart\/form-data; boundary=(?<b>\S+)$/.exec(headers["content-type"] ?? "");
  assert.ok(match?.groups?.b, `not a multipart content-type: ${headers["content-type"]}`);
  return match.groups.b;
}

describe("encodeForm", () => {
  test("no files -> URLSearchParams + urlencoded content-type, replayable", async () => {
    const { body, headers, replayable } = await encodeForm({
      chat_id: 1,
      text: "hi",
      reply_markup: '{"inline_keyboard":[]}',
    });
    assert.strictEqual(headers["content-type"], "application/x-www-form-urlencoded");
    assert.strictEqual(replayable, true);
    const params = body();
    assert.ok(params instanceof URLSearchParams);
    assert.strictEqual(params.get("chat_id"), "1");
    assert.strictEqual(params.get("text"), "hi");
    assert.strictEqual(params.get("reply_markup"), '{"inline_keyboard":[]}');
  });

  test("preserves a surrogate pair across a 2048-code-unit boundary", async () => {
    const text = `<b>${"P".repeat(2044)}🔎</b>${"P".repeat(10)}`;
    assert.strictEqual(text.codePointAt(2047), 0x1f50e);

    const { body } = await encodeForm({ chat_id: 1, text, parse_mode: "HTML" });
    const params = body();
    assert.ok(params instanceof URLSearchParams);
    assert.strictEqual(params.get("text"), text);
  });

  test("with file -> streamed multipart body carrying string fields and the file part", async () => {
    // Streaming pinned on: the multipart layout is runtime-independent; the
    // default mode only picks stream-vs-Blob delivery (probed per runtime).
    const { body, headers } = await encodeForm(
      { chat_id: 1, photo: new InputFile(new Uint8Array([65, 66, 67]), { filename: "p.png" }) },
      true,
    );
    const boundary = boundaryOf(headers);
    assert.ok(body() instanceof ReadableStream);
    const text = await bodyText(body());
    assert.ok(text.includes(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n1\r\n`));
    assert.ok(
      text.includes(
        `Content-Disposition: form-data; name="photo"; filename="p.png"\r\n` +
          `Content-Type: application/octet-stream\r\n\r\nABC\r\n`,
      ),
    );
    assert.ok(text.endsWith(`--${boundary}--\r\n`));
  });

  test("a FormPart writes its field string + keyed parts (multipart)", async () => {
    const file = new InputFile(new Uint8Array([57]), { filename: "m.bin" });
    const part = formPart('[{"type":"photo","media":"attach://media_0"}]', [["media_0", file]]);
    const { body, headers } = await encodeForm({ chat_id: 1, media: part });
    const text = await bodyText(body());
    assert.ok(
      text.includes(`name="media"\r\n\r\n[{"type":"photo","media":"attach://media_0"}]\r\n`),
      "the composite's JSON goes out under its field name",
    );
    assert.ok(text.includes(`name="media_0"; filename="m.bin"`), "the attach:// part is keyed by its ref");
    assert.strictEqual(boundaryOf(headers).length <= 70, true);
  });

  test("Blob/Uint8Array bodies are replayable: each body() streams the full bytes again", async () => {
    const { body, replayable } = await encodeForm(
      { chat_id: 1, photo: new InputFile(new Blob([new Uint8Array(1024).fill(66)]), { filename: "p.bin" }) },
      true,
    );
    assert.strictEqual(replayable, true);
    const first = await bodyText(body());
    const second = await bodyText(body());
    assert.strictEqual(first, second);
    assert.ok(first.includes("B".repeat(1024)));
  });

  test("a one-shot ReadableStream InputFile marks the request non-replayable", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array([1, 2, 3]));
        c.close();
      },
    });
    const { replayable } = await encodeForm({ chat_id: 1, video: new InputFile(stream) }, true);
    assert.strictEqual(replayable, false);
  });

  test("no-streaming fallback buffers the same bytes into a replayable Blob", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array([68, 69, 70]));
        c.close();
      },
    });
    const streamed = await encodeForm({ chat_id: 1, photo: new InputFile(new Uint8Array([68, 69, 70])) }, true);
    const buffered = await encodeForm({ chat_id: 1, photo: new InputFile(stream) }, false);
    assert.ok(buffered.body() instanceof Blob);
    assert.strictEqual(buffered.replayable, true, "a buffered Blob body is re-sendable even for stream input");
    // Same layout either way (boundaries differ; compare with them stripped).
    const norm = async (r: typeof buffered) => (await bodyText(r.body())).replaceAll(boundaryOf(r.headers), "X");
    assert.strictEqual(await norm(buffered), await norm(streamed));
    assert.strictEqual(await norm(buffered), await norm(buffered), "Blob body drains repeatedly");
  });
});
