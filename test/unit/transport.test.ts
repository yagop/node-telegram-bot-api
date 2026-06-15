import { describe, expect, test } from "bun:test";
import { Transport } from "../../src/core/transport.js";
import {
  NetworkError,
  TelegramApiError,
  TimeoutError,
} from "../../src/core/errors.js";

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
    const { fetch } = jsonFetch([
      { ok: false, error_code: 400, description: "Bad Request: x" },
    ]);
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
    const { fetch, calls } = jsonFetch([
      { ok: false, error_code: 429, parameters: { retry_after: 0 } },
    ]);
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

  test("network failure -> NetworkError (EFETCH)", async () => {
    const throwingFetch = (async () => {
      throw new Error("connection reset");
    }) as unknown as typeof fetch;
    const tr = new Transport(TOKEN, { fetch: throwingFetch });
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
    const tr = new Transport(TOKEN, { fetch: abortAwareFetch, timeoutMs: 5 });
    let caught: unknown;
    try {
      await tr.request("getMe");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TimeoutError);
    expect((caught as TimeoutError).code).toBe("ETIMEOUT");
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
