/**
 * Replaces the legacy `test/test.format-send-data.js` suite. The behaviour
 * being verified is now spread across `prepareFile()` and the body-builder
 * inside `HttpClient`. This test focuses on the format pipeline through
 * `HttpClient` by stubbing `globalThis.fetch`.
 */

import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import { HttpClient } from "../../src/http.js";
import { prepareFile } from "../../src/utils.js";

interface CapturedRequest {
  url: string;
  init: RequestInit;
}

const originalFetch = globalThis.fetch;
let captured: CapturedRequest | null = null;

function stubFetch(responseBody: unknown, status = 200) {
  globalThis.fetch = (async (url: RequestInfo | URL, init: RequestInit = {}) => {
    captured = { url: String(url), init };
    return new Response(JSON.stringify(responseBody), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

describe("format-send-data (via HttpClient)", () => {
  beforeEach(() => {
    captured = null;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("encodes form-only requests as application/x-www-form-urlencoded", async () => {
    stubFetch({ ok: true, result: { user: 1 } });
    const client = new HttpClient("TEST_TOKEN");
    await client.request("getMe", { form: { foo: "bar", n: 42, b: true } });
    assert.ok(captured);
    assert.equal(
      (captured!.init.headers as Record<string, string>)["content-type"],
      "application/x-www-form-urlencoded",
    );
    const body = String(captured!.init.body);
    const params = new URLSearchParams(body);
    assert.equal(params.get("foo"), "bar");
    assert.equal(params.get("n"), "42");
    assert.equal(params.get("b"), "true");
  });

  it("uses multipart/form-data when a file is attached", async () => {
    stubFetch({ ok: true, result: { message_id: 1 } });
    const client = new HttpClient("TEST_TOKEN");
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const { file } = await prepareFile(buffer);
    assert.ok(file);

    await client.request("sendPhoto", {
      form: { chat_id: 99 },
      formData: { photo: file! },
    });

    assert.ok(captured);
    // fetch sets the multipart content-type on its own based on the FormData body.
    assert.ok(captured!.init.body instanceof FormData);
    const fd = captured!.init.body as FormData;
    assert.equal(fd.get("chat_id"), "99");
    assert.ok(fd.get("photo"));
  });

  it("constructs the canonical Telegram URL", async () => {
    stubFetch({ ok: true, result: { id: 1, is_bot: true, first_name: "TestBot" } });
    const client = new HttpClient("ABCDEF");
    await client.request("getMe");
    assert.equal(captured!.url, "https://api.telegram.org/botABCDEF/getMe");
  });

  it("appends /test segment when testEnvironment is set", async () => {
    stubFetch({ ok: true, result: {} });
    const client = new HttpClient("ABC", { testEnvironment: true });
    await client.request("getMe");
    assert.equal(captured!.url, "https://api.telegram.org/botABC/test/getMe");
  });

  it("respects baseApiUrl override", async () => {
    stubFetch({ ok: true, result: {} });
    const client = new HttpClient("ABC", { baseApiUrl: "http://127.0.0.1:9000" });
    await client.request("getMe");
    assert.equal(captured!.url, "http://127.0.0.1:9000/botABC/getMe");
  });

  it("throws TelegramError for ok=false responses", async () => {
    stubFetch({ ok: false, error_code: 400, description: "Bad Request: chat not found" });
    const client = new HttpClient("ABC");
    await assert.rejects(client.request("sendMessage"), /ETELEGRAM/);
  });

  it("throws ParseError for non-JSON responses", async () => {
    globalThis.fetch = (async () =>
      new Response("not json", { status: 200, headers: { "content-type": "text/plain" } })) as typeof fetch;
    const client = new HttpClient("ABC");
    await assert.rejects(client.request("getMe"), /EPARSE/);
  });

  it("skips undefined/null values in form bodies", async () => {
    stubFetch({ ok: true, result: {} });
    const client = new HttpClient("ABC");
    await client.request("getMe", { form: { a: 1, b: undefined, c: null, d: "x" } });
    const params = new URLSearchParams(String(captured!.init.body));
    assert.equal(params.get("a"), "1");
    assert.equal(params.get("b"), null);
    assert.equal(params.get("c"), null);
    assert.equal(params.get("d"), "x");
  });

  it("JSON-serializes object values in form bodies", async () => {
    stubFetch({ ok: true, result: {} });
    const client = new HttpClient("ABC");
    await client.request("getMe", { form: { keyboard: [[1, 2]], obj: { a: 1 } } });
    const params = new URLSearchParams(String(captured!.init.body));
    assert.equal(params.get("keyboard"), "[[1,2]]");
    assert.equal(params.get("obj"), '{"a":1}');
  });
});
