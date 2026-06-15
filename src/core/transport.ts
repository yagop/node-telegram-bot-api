/**
 * Transport (ADR-005, ADR-008) - the only module that touches `fetch`.
 *
 * It is injectable (`options.fetch`) so tests pass a fake instead of
 * monkeypatching `globalThis.fetch`. It merges a per-request timeout with the
 * caller's `AbortSignal`, unwraps the `{ ok, result }` envelope, and retries
 * `429` honoring `retry_after`. Failures surface as the structured errors in
 * `./errors`.
 */

import { encodeForm } from "./encode.js";
import {
  type ApiErrorParameters,
  NetworkError,
  ParseError,
  TelegramApiError,
  TelegramBotError,
  TimeoutError,
  isAbortError,
} from "./errors.js";
import { RateLimiter, type RateLimitOptions } from "./ratelimiter.js";

export interface TransportOptions {
  /** API origin. Default `https://api.telegram.org`. */
  apiRoot?: string;
  /** Injected fetch implementation. Default `globalThis.fetch`. */
  fetch?: typeof fetch;
  /** Per-request client timeout in ms for ordinary calls; `0` disables. Default 30000. */
  timeoutMs?: number;
  /** Max retries on 429 and transient (network/timeout/5xx) failures. Default 2. */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff on transient (non-429) retries. Default 300. */
  retryBackoffMs?: number;
  /** Opt-in proactive rate limiting (global + per-chat). Omit for zero overhead. */
  rateLimit?: RateLimitOptions;
}

type ApiResponse<R> =
  | { ok: true; result: R }
  | { ok: false; error_code: number; description: string; parameters?: ApiErrorParameters };

const DEFAULT_API_ROOT = "https://api.telegram.org";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_BACKOFF = 300;
const MAX_BACKOFF = 30_000;

/** Combine several abort signals into one, plus a listener cleanup. */
function combineSignals(signals: Array<AbortSignal | undefined>): {
  signal: AbortSignal | undefined;
  cleanup: () => void;
} {
  const list = signals.filter((s): s is AbortSignal => s != null);
  if (list.length === 0) return { signal: undefined, cleanup: () => {} };
  if (list.length === 1) return { signal: list[0], cleanup: () => {} };

  const controller = new AbortController();
  const cleanups: Array<() => void> = [];
  for (const s of list) {
    if (s.aborted) {
      controller.abort(s.reason);
      break;
    }
    const onAbort = () => controller.abort(s.reason);
    s.addEventListener("abort", onAbort, { once: true });
    cleanups.push(() => s.removeEventListener("abort", onAbort));
  }
  return { signal: controller.signal, cleanup: () => cleanups.forEach((fn) => fn()) };
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export class Transport {
  readonly apiRoot: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryBackoffMs: number;
  private readonly limiter?: RateLimiter;

  constructor(
    private readonly token: string,
    options: TransportOptions = {},
  ) {
    if (!token) throw new TelegramBotError("A bot token is required", { code: "EPARAM" });
    this.apiRoot = (options.apiRoot ?? DEFAULT_API_ROOT).replace(/\/+$/, "");
    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new NetworkError("No fetch implementation available; pass options.fetch");
    }
    this.fetchImpl = fetchImpl;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryBackoffMs = options.retryBackoffMs ?? DEFAULT_RETRY_BACKOFF;
    if (options.rateLimit) this.limiter = new RateLimiter(options.rateLimit);
  }

  /** Exponential backoff for transient retries: `base * 2^(attempt-1)`, capped, with jitter. */
  private backoff(attempt: number): number {
    const exp = Math.min(this.retryBackoffMs * 2 ** (attempt - 1), MAX_BACKOFF);
    return exp * (0.5 + Math.random() * 0.5);
  }

  /** For long polling the client timeout must outlast the server-side wait. */
  private effectiveTimeout(method: string, params?: Record<string, unknown>): number {
    if (method === "getUpdates" && params && typeof params.timeout === "number" && params.timeout > 0) {
      return params.timeout * 1000 + 10_000;
    }
    return this.timeoutMs;
  }

  async request<R>(
    method: string,
    params?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<R> {
    const url = `${this.apiRoot}/bot${this.token}/${method}`;
    const timeoutMs = this.effectiveTimeout(method, params);

    // Opt-in proactive rate limiting: acquire once, before the first send attempt
    // (not per retry), keyed by chat id when present.
    if (this.limiter) {
      await this.limiter.acquire(params?.chat_id as string | number | undefined, signal);
    }

    let attempt = 0;
    for (;;) {
      const { body, headers } = await encodeForm(params ?? {});
      const timeoutSignal = timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined;
      const { signal: composed, cleanup } = combineSignals([signal, timeoutSignal]);

      let response: Response;
      try {
        response = await this.fetchImpl(url, { method: "POST", body, headers, signal: composed });
      } catch (err) {
        if (signal?.aborted) throw err; // caller cancelled - propagate verbatim
        // Transient throws (fetch reject / our timeout): retry with backoff.
        if (attempt < this.maxRetries) {
          attempt += 1;
          await delay(this.backoff(attempt), signal);
          continue;
        }
        if (isAbortError(err)) throw new TimeoutError(`Request timed out: ${method}`, { cause: err });
        throw new NetworkError(`Network request failed: ${method}`, { cause: err });
      } finally {
        cleanup();
      }

      // Server-side 5xx is transient: retry without parsing the body. Read the
      // body once regardless so we can surface a precise error when exhausted.
      if (response.status >= 500) {
        const text = await response.text();
        if (attempt < this.maxRetries) {
          attempt += 1;
          await delay(this.backoff(attempt), signal);
          continue;
        }
        // Exhausted: prefer the `{ ok: false }` envelope when the body is one.
        const envelope = parseEnvelope<R>(text);
        if (envelope && !envelope.ok) {
          throw new TelegramApiError(envelope.error_code, envelope.description, envelope.parameters);
        }
        throw new NetworkError(`Server error ${response.status} on ${method}`);
      }

      const text = await response.text();
      let json: ApiResponse<R>;
      try {
        json = JSON.parse(text) as ApiResponse<R>;
      } catch (err) {
        throw new ParseError(`Invalid JSON in response to ${method}`, {
          cause: err,
          responseText: text,
        });
      }

      if (json.ok) return json.result;

      if (json.error_code === 429 && attempt < this.maxRetries) {
        attempt += 1;
        const retryAfter = json.parameters?.retry_after ?? 1;
        await delay(retryAfter * 1000, signal);
        continue;
      }

      throw new TelegramApiError(json.error_code, json.description, json.parameters);
    }
  }
}

/** Best-effort envelope parse; returns `undefined` when the body is not JSON. */
function parseEnvelope<R>(text: string): ApiResponse<R> | undefined {
  try {
    return JSON.parse(text) as ApiResponse<R>;
  } catch {
    return undefined;
  }
}
