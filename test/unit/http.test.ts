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

  it("stops retrying after maxRetriesOn429 and throws the 429", async () => {
    // Always 429 (retry_after 0 keeps the per-retry sleep tiny); after the
    // 2 retries it gives up and throws, exposing retry_after on the error.
    stubResponses([tooMany(0)]);
    const client = new HttpClient("TOKEN", { request: { maxRetriesOn429: 2 } });
    await assert.rejects(
      () => client.request("getMe"),
      (err: unknown) => {
        assert.ok(err instanceof TelegramError);
        const body = err.response?.body as { parameters?: { retry_after?: number } } | undefined;
        assert.equal(body?.parameters?.retry_after, 0);
        return true;
      },
    );
    assert.equal(calls, 3, "1 initial attempt + 2 retries");
  });

  it("does not retry when maxRetriesOn429 is 0", async () => {
    stubResponses([tooMany(0), ok]);
    const client = new HttpClient("TOKEN", { request: { maxRetriesOn429: 0 } });
    await assert.rejects(() => client.request("getMe"), TelegramError);
    assert.equal(calls, 1);
  });
});
