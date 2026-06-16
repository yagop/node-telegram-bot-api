import { describe, expect, test } from "bun:test";
import { NetworkError, TelegramApiError, TimeoutError } from "../../src/core/errors.js";
import { InputFile } from "../../src/core/files.js";
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
    expect(result).toEqual({ id: 42 });
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
    expect(caught).toBeInstanceOf(TelegramApiError);
    const e = caught as TelegramApiError;
    expect(e.errorCode).toBe(400);
    expect(e.code).toBe("ETELEGRAM");
    expect(e.description).toBe("Bad Request: x");
  });

  test("429 then success retries and resolves", async () => {
    const { fetch, calls } = jsonFetch([
      { ok: false, error_code: 429, parameters: { retry_after: 0 } },
      { ok: true, result: true },
    ]);
    const tr = new Transport(TOKEN, { fetch, maxRetries: 2 });
    const result = await tr.request<boolean>("getMe");
    expect(result).toBe(true);
    expect(calls.length).toBe(2);
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
    expect(caught).toBeInstanceOf(TelegramApiError);
    expect((caught as TelegramApiError).errorCode).toBe(429);
    expect(calls.length).toBe(2); // maxRetries + 1
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
    expect(caught).toBeInstanceOf(TelegramApiError);
    expect((caught as TelegramApiError).errorCode).toBe(429);
    expect((caught as TelegramApiError).retryAfter).toBe(3600); // preserved for the caller
    expect(calls.length).toBe(1); // surfaced on the first response, never retried
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
    expect(caught).toBeInstanceOf(NetworkError);
    expect((caught as NetworkError).code).toBe("EFETCH");
  });

  test("timeout -> TimeoutError when our signal aborts", async () => {
    // Fake fetch rejects only when the passed signal aborts, with an AbortError.
    const abortAwareFetch = ((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) return;
        if (signal.aborted) {
          const e = new Error("aborted");
          e.name = "AbortError";
          return reject(e);
        }
        signal.addEventListener(
          "abort",
          () => {
            const e = new Error("aborted");
            e.name = "AbortError";
            reject(e);
          },
          { once: true },
        );
      })) as unknown as typeof fetch;
    // maxRetries: 0 so our timeout surfaces immediately as a TimeoutError.
    const tr = new Transport(TOKEN, { fetch: abortAwareFetch, timeoutMs: 5, maxRetries: 0 });
    let caught: unknown;
    try {
      await tr.request("getMe");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TimeoutError);
    expect((caught as TimeoutError).code).toBe("ETIMEOUT");
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
    expect(result).toEqual({ id: 7 });
    expect(calls.length).toBe(2);
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
    expect(result).toBe(true);
    expect(calls.length).toBe(2);
  });

  test("retried streamed upload re-sends the buffered body (no stream re-consumption)", async () => {
    // The body is encoded once and reused; a ReadableStream-backed InputFile is
    // drained to a Blob a single time, so the 502 retry must still carry the bytes.
    let i = 0;
    const sizes: number[] = [];
    const flakyFetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      i += 1;
      sizes.push(((init?.body as FormData).get("photo") as Blob).size);
      if (i === 1) return new Response("upstream error", { status: 502 });
      return new Response(JSON.stringify({ ok: true, result: true }));
    }) as unknown as typeof fetch;
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array([1, 2, 3, 4, 5]));
        c.close();
      },
    });
    const tr = new Transport(TOKEN, { fetch: flakyFetch, maxRetries: 2, retryBackoffMs: 0 });
    const result = await tr.request<boolean>("sendPhoto", { chat_id: 1, photo: new InputFile(stream) });
    expect(result).toBe(true);
    expect(sizes).toEqual([5, 5]); // both attempts saw the full 5-byte body
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
    expect(caught).toBeInstanceOf(NetworkError);
    expect(i).toBe(2); // retried once before surfacing
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
    expect(caught).toBeInstanceOf(NetworkError);
    expect((caught as NetworkError).message).toContain("503");
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
    expect((caught as Error).name).toBe("AbortError");
    expect(caught).not.toBeInstanceOf(NetworkError);
    expect(calls).toBe(1);
  });

  test("request URL contains /bot<token>/<method> and uses POST", async () => {
    const { fetch, calls } = jsonFetch([{ ok: true, result: {} }]);
    const tr = new Transport(TOKEN, { fetch });
    await tr.request("getMe");
    expect(calls.length).toBe(1);
    expect(calls[0]!.url).toBe(`https://api.telegram.org/bot${TOKEN}/getMe`);
    expect(calls[0]!.init?.method).toBe("POST");
  });
});
