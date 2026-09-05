import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { NetworkError, TelegramApiError, TimeoutError } from "../../src/core/errors.js";
import { InputFile } from "../../src/core/files.js";
import { supportsRequestStreams } from "../../src/core/multipart.js";
import { Transport } from "../../src/core/transport.js";

const TOKEN = "123:ABC";

/** Build a fake fetch that returns the given JSON bodies in sequence. */
function jsonFetch(bodies: unknown[]): {
  fetch: typeof fetch;
  calls: Array<{ url: string; init?: RequestInit }>;
} {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  let i = 0;
  const fake = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const body = bodies[Math.min(i, bodies.length - 1)];
    i += 1;
    return new Response(JSON.stringify(body));
  }) as unknown as typeof fetch;
  return { fetch: fake, calls };
}

describe("Transport", () => {
  test("success unwraps { ok: true, result }", async () => {
    const { fetch } = jsonFetch([{ ok: true, result: { id: 42 } }]);
    const tr = new Transport(TOKEN, { fetch });
    const result = await tr.request<{ id: number }>("getMe");
    assert.deepStrictEqual(result, { id: 42 });
  });

  test("api error throws TelegramApiError with errorCode + code", async () => {
    const { fetch } = jsonFetch([{ ok: false, error_code: 400, description: "Bad Request: x" }]);
    const tr = new Transport(TOKEN, { fetch });
    let caught: unknown;
    try {
      await tr.request("getMe");
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof TelegramApiError);
    const e = caught as TelegramApiError;
    assert.strictEqual(e.errorCode, 400);
    assert.strictEqual(e.code, "ETELEGRAM");
    assert.strictEqual(e.description, "Bad Request: x");
  });

  test("429 then success retries and resolves", async () => {
    const { fetch, calls } = jsonFetch([
      { ok: false, error_code: 429, parameters: { retry_after: 0 } },
      { ok: true, result: true },
    ]);
    const tr = new Transport(TOKEN, { fetch, maxRetries: 2 });
    const result = await tr.request<boolean>("getMe");
    assert.strictEqual(result, true);
    assert.strictEqual(calls.length, 2);
  });

  test("429 exhausts retries -> throws with errorCode 429 and maxRetries+1 calls", async () => {
    const { fetch, calls } = jsonFetch([{ ok: false, error_code: 429, parameters: { retry_after: 0 } }]);
    const tr = new Transport(TOKEN, { fetch, maxRetries: 1 });
    let caught: unknown;
    try {
      await tr.request("getMe");
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof TelegramApiError);
    assert.strictEqual((caught as TelegramApiError).errorCode, 429);
    assert.strictEqual(calls.length, 2); // maxRetries + 1
  });

  test("429 with retry_after over maxRetryAfterMs surfaces immediately (no wait, no retry)", async () => {
    const { fetch, calls } = jsonFetch([{ ok: false, error_code: 429, parameters: { retry_after: 3600 } }]);
    // Cap at 1s: a 3600s flood-wait must NOT be honored - surface at once.
    const tr = new Transport(TOKEN, { fetch, maxRetries: 2, maxRetryAfterMs: 1000 });
    let caught: unknown;
    try {
      await tr.request("getMe");
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof TelegramApiError);
    assert.strictEqual((caught as TelegramApiError).errorCode, 429);
    assert.strictEqual((caught as TelegramApiError).retryAfter, 3600); // preserved for the caller
    assert.strictEqual(calls.length, 1); // surfaced on the first response, never retried
  });

  test("network failure -> NetworkError (EFETCH)", async () => {
    const throwingFetch = (async () => {
      throw new Error("connection reset");
    }) as unknown as typeof fetch;
    // maxRetries: 0 so the transient throw surfaces immediately (no backoff wait).
    const tr = new Transport(TOKEN, { fetch: throwingFetch, maxRetries: 0 });
    let caught: unknown;
    try {
      await tr.request("getMe");
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof NetworkError);
    assert.strictEqual((caught as NetworkError).code, "EFETCH");
  });

  test("timeout -> TimeoutError when our signal aborts", async () => {
    // When the per-request timeout fires, fetch rejects with an AbortError;
    // mirror that rejection directly (driving the real unref'd AbortSignal.timeout
    // here would leave the test promise pending once the event loop drains).
    const abortingFetch = (async () => {
      const e = new Error("aborted");
      e.name = "AbortError";
      throw e;
    }) as unknown as typeof fetch;
    // maxRetries: 0 so our timeout surfaces immediately as a TimeoutError.
    const tr = new Transport(TOKEN, { fetch: abortingFetch, maxRetries: 0 });
    let caught: unknown;
    try {
      await tr.request("getMe");
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof TimeoutError);
    assert.strictEqual((caught as TimeoutError).code, "ETIMEOUT");
  });

  test("client timeout (AbortSignal.timeout -> TimeoutError DOMException) classifies as TimeoutError, not NetworkError", async () => {
    // Mirror what real `fetch` does under `AbortSignal.timeout()`: it rejects with
    // a DOMException whose `name` is "TimeoutError" (NOT "AbortError"), per the
    // HTML spec. Before the isAbortError fix this fell through to NetworkError.
    // A DOMException is not an Error, so reject with that bare shape - directly,
    // since the real timeout timer is unref'd and would hang under node:test.
    const timeoutFetch = (async () => {
      throw { name: "TimeoutError", message: "signal timed out" };
    }) as unknown as typeof fetch;
    const tr = new Transport(TOKEN, { fetch: timeoutFetch, maxRetries: 0 });
    let caught: unknown;
    try {
      await tr.request("getMe");
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof TimeoutError, "expected TimeoutError, got NetworkError (timeout misclassified)");
    assert.strictEqual((caught as TimeoutError).code, "ETIMEOUT");
    assert.ok(!(caught instanceof NetworkError));
  });

  test("transient network throw then success retries and resolves (fetch called twice)", async () => {
    let i = 0;
    const calls: number[] = [];
    const flakyFetch = (async () => {
      calls.push(i);
      i += 1;
      if (i === 1) throw new Error("connection reset");
      return new Response(JSON.stringify({ ok: true, result: { id: 7 } }));
    }) as unknown as typeof fetch;
    const tr = new Transport(TOKEN, { fetch: flakyFetch, maxRetries: 2, retryBackoffMs: 0 });
    const result = await tr.request<{ id: number }>("getMe");
    assert.deepStrictEqual(result, { id: 7 });
    assert.strictEqual(calls.length, 2);
  });

  test("5xx response then success retries and resolves", async () => {
    let i = 0;
    const calls: string[] = [];
    const flakyFetch = (async (url: string | URL | Request) => {
      calls.push(String(url));
      i += 1;
      if (i === 1) return new Response("upstream error", { status: 502 });
      return new Response(JSON.stringify({ ok: true, result: true }));
    }) as unknown as typeof fetch;
    const tr = new Transport(TOKEN, { fetch: flakyFetch, maxRetries: 2, retryBackoffMs: 0 });
    const result = await tr.request<boolean>("getMe");
    assert.strictEqual(result, true);
    assert.strictEqual(calls.length, 2);
  });

  test("upload body is a multipart stream with duplex: 'half' (or a Blob where streaming is off)", async () => {
    let init: RequestInit | undefined;
    const okFetch = (async (_url: string | URL | Request, i?: RequestInit) => {
      init = i;
      await new Response(i?.body as ConstructorParameters<typeof Response>[0]).text(); // consume, like a real send
      return new Response(JSON.stringify({ ok: true, result: true }));
    }) as unknown as typeof fetch;
    const tr = new Transport(TOKEN, { fetch: okFetch });
    await tr.request("sendPhoto", { chat_id: 1, photo: new InputFile(new Uint8Array([1])) });
    if (supportsRequestStreams()) {
      assert.ok(init?.body instanceof ReadableStream);
      assert.strictEqual((init as { duplex?: string }).duplex, "half");
    } else {
      // e.g. proxied Bun: the buffered-Blob fallback, without a duplex member.
      assert.ok(init?.body instanceof Blob);
      assert.strictEqual((init as { duplex?: string }).duplex, undefined);
    }
    assert.match(new Headers(init?.headers).get("content-type") ?? "", /^multipart\/form-data; boundary=/);
  });

  test("retried upload re-streams the full body: each attempt gets a fresh stream", async () => {
    // The multipart layout is encoded once; body() builds a new stream per
    // attempt, so the 502 retry must carry the full bytes again.
    let i = 0;
    const texts: string[] = [];
    const flakyFetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      i += 1;
      texts.push(await new Response(init?.body as ConstructorParameters<typeof Response>[0]).text());
      if (i === 1) return new Response("upstream error", { status: 502 });
      return new Response(JSON.stringify({ ok: true, result: true }));
    }) as unknown as typeof fetch;
    const tr = new Transport(TOKEN, { fetch: flakyFetch, maxRetries: 2, retryBackoffMs: 0 });
    const result = await tr.request<boolean>("sendPhoto", {
      chat_id: 1,
      photo: new InputFile(new Uint8Array([65, 66, 67, 68, 69])),
    });
    assert.strictEqual(result, true);
    assert.strictEqual(texts.length, 2);
    assert.strictEqual(texts[0], texts[1]); // identical bytes on both attempts
    assert.ok(texts[0]!.includes("ABCDE"));
  });

  test("a stream-factory upload retries: each attempt opens a fresh stream", async () => {
    let calls = 0;
    let opens = 0;
    const bodies: string[] = [];
    const flakyFetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      calls += 1;
      bodies.push(await new Response(init?.body as ConstructorParameters<typeof Response>[0]).text());
      if (calls === 1) return new Response("upstream error", { status: 502 });
      return new Response(JSON.stringify({ ok: true, result: true }));
    }) as unknown as typeof fetch;
    const factory = () => {
      opens += 1;
      return new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(new TextEncoder().encode("retryable bytes"));
          c.close();
        },
      });
    };
    const tr = new Transport(TOKEN, { fetch: flakyFetch, maxRetries: 2, retryBackoffMs: 0 });
    const result = await tr.request<boolean>("sendPhoto", { chat_id: 1, photo: new InputFile(factory) });
    assert.strictEqual(result, true);
    assert.strictEqual(calls, 2);
    // Streaming: one fresh stream per attempt. Buffered fallback (e.g. Bun):
    // the factory is drained once into the replayable Blob.
    assert.strictEqual(opens, supportsRequestStreams() ? 2 : 1);
    assert.ok(bodies.every((b) => b.includes("retryable bytes")));
  });

  test("a one-shot streamed upload is never retried (the body cannot be replayed)", { skip: !supportsRequestStreams() }, async () => {
    // A caller-provided ReadableStream is consumed by the first send; instead of
    // retrying with an empty/broken body, the failure surfaces immediately.
    // (Skipped where streaming is off - the buffered Blob IS replayable there.)
    let calls = 0;
    const failingFetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      calls += 1;
      await new Response(init?.body as ConstructorParameters<typeof Response>[0]).text(); // drain, like a real send
      return new Response("upstream error", { status: 502 });
    }) as unknown as typeof fetch;
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array([1, 2, 3, 4, 5]));
        c.close();
      },
    });
    const tr = new Transport(TOKEN, { fetch: failingFetch, maxRetries: 2, retryBackoffMs: 0 });
    let caught: unknown;
    try {
      await tr.request("sendPhoto", { chat_id: 1, photo: new InputFile(stream) });
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof NetworkError);
    assert.match((caught as NetworkError).message, /502/);
    assert.strictEqual(calls, 1); // no second attempt despite maxRetries: 2
  });

  test("a body-read failure is transient: retried, then wrapped as NetworkError", async () => {
    let i = 0;
    // Headers arrive (status 200) but the body read rejects mid-stream.
    const brokenBodyFetch = (async () => {
      i += 1;
      return { status: 200, text: () => Promise.reject(new Error("stream broke")) } as unknown as Response;
    }) as unknown as typeof fetch;
    const tr = new Transport(TOKEN, { fetch: brokenBodyFetch, maxRetries: 1, retryBackoffMs: 0 });
    let caught: unknown;
    try {
      await tr.request("getMe");
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof NetworkError);
    assert.strictEqual(i, 2); // retried once before surfacing
  });

  test("exhausted 5xx -> NetworkError including the status", async () => {
    const fetch500 = (async () => new Response("boom", { status: 503 })) as unknown as typeof fetch;
    const tr = new Transport(TOKEN, { fetch: fetch500, maxRetries: 1, retryBackoffMs: 0 });
    let caught: unknown;
    try {
      await tr.request("getMe");
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof NetworkError);
    assert.match((caught as NetworkError).message, /503/);
  });

  test("caller-abort is not retried and propagates verbatim", async () => {
    const controller = new AbortController();
    let calls = 0;
    const abortingFetch = (async (_url: string, init?: RequestInit) => {
      calls += 1;
      controller.abort(new Error("caller cancelled"));
      const e = new Error("aborted");
      e.name = "AbortError";
      // Mirror real fetch: reject because the (caller) signal aborted.
      if (init?.signal?.aborted) throw e;
      throw e;
    }) as unknown as typeof fetch;
    const tr = new Transport(TOKEN, { fetch: abortingFetch, maxRetries: 3, retryBackoffMs: 0 });
    let caught: unknown;
    try {
      await tr.request("getMe", {}, controller.signal);
    } catch (err) {
      caught = err;
    }
    // Propagated verbatim (not wrapped) and fetch was called exactly once.
    assert.strictEqual((caught as Error).name, "AbortError");
    assert.ok(!(caught instanceof NetworkError));
    assert.strictEqual(calls, 1);
  });

  test("request URL contains /bot<token>/<method> and uses POST", async () => {
    const { fetch, calls } = jsonFetch([{ ok: true, result: {} }]);
    const tr = new Transport(TOKEN, { fetch });
    await tr.request("getMe");
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0]!.url, `https://api.telegram.org/bot${TOKEN}/getMe`);
    assert.strictEqual(calls[0]!.init?.method, "POST");
  });

  test("empty/whitespace apiRoot falls back to the default instead of a relative URL", async () => {
    for (const apiRoot of ["", "   "]) {
      const { fetch, calls } = jsonFetch([{ ok: true, result: {} }]);
      const tr = new Transport(TOKEN, { fetch, apiRoot });
      await tr.request("getMe");
      assert.strictEqual(calls[0]!.url, `https://api.telegram.org/bot${TOKEN}/getMe`);
    }
  });

  test("a non-empty apiRoot is used verbatim (trailing slashes trimmed)", async () => {
    const { fetch, calls } = jsonFetch([{ ok: true, result: {} }]);
    const tr = new Transport(TOKEN, { fetch, apiRoot: "http://localhost:8081//" });
    await tr.request("getMe");
    assert.strictEqual(calls[0]!.url, `http://localhost:8081/bot${TOKEN}/getMe`);
  });
});
