/**
 * Unit tests for HttpClient's 429 handling. `globalThis.fetch` is stubbed to
 * return controllable status/body; no network.
 */

import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import { HttpClient } from "../../src/http.js";
import { TelegramError } from "../../src/errors.js";

const originalFetch = globalThis.fetch;
let calls = 0;

/** Queue of response bodies; each fetch call shifts the next one. */
function stubResponses(bodies: unknown[]) {
  calls = 0;
  globalThis.fetch = (async () => {
    const body = bodies[Math.min(calls, bodies.length - 1)];
    calls++;
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

const ok = { ok: true, result: { id: 1 } };
const tooMany = (retryAfter: number) => ({
  ok: false,
  error_code: 429,
  description: "Too Many Requests: retry after " + retryAfter,
  parameters: { retry_after: retryAfter },
});

describe("HttpClient 429 handling", () => {
  beforeEach(() => {
    calls = 0;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("retries after a short retry_after and succeeds", async () => {
    stubResponses([tooMany(0), ok]);
    const client = new HttpClient("TOKEN");
    const result = await client.request<{ id: number }>("getMe");
    assert.deepEqual(result, { id: 1 });
    assert.equal(calls, 2, "should retry once then succeed");
  });

  it("caps the sleep at maxRetryAfterSeconds for a large retry_after, then retries", async () => {
    // retry_after is huge, but the cap (0s) means the client retries almost
    // immediately instead of sleeping for the advertised ~31 minutes.
    stubResponses([tooMany(1847), ok]);
    const client = new HttpClient("TOKEN", { request: { maxRetryAfterSeconds: 0 } });
    const start = Date.now();
    const result = await client.request<{ id: number }>("getMe");
    assert.deepEqual(result, { id: 1 });
    assert.equal(calls, 2, "should still retry, just without the long sleep");
    assert.ok(Date.now() - start < 1000, "must not sleep for the advertised retry_after");
  });

  it("honors maxRetryAfterSeconds: Infinity by retrying any retry_after", async () => {
    stubResponses([tooMany(0), ok]);
    const client = new HttpClient("TOKEN", { request: { maxRetryAfterSeconds: Infinity } });
    const result = await client.request<{ id: number }>("getMe");
    assert.deepEqual(result, { id: 1 });
    assert.equal(calls, 2);
  });

  it("does not retry when maxRetriesOn429 is 0", async () => {
    stubResponses([tooMany(0), ok]);
    const client = new HttpClient("TOKEN", { request: { maxRetriesOn429: 0 } });
    await assert.rejects(() => client.request("getMe"), TelegramError);
    assert.equal(calls, 1);
  });
});
