/**
 * Transport (ADR-005, ADR-008) - the only module that touches `fetch`.
 *
 * It is injectable (`options.fetch`) so tests pass a fake instead of
 * monkeypatching `globalThis.fetch`. It merges a per-request timeout with the
 * caller's `AbortSignal`, unwraps the `{ ok, result }` envelope, and retries
 * `429` honoring `retry_after`. Failures surface as the structured errors in
 * `./errors`.
 */

import { debug } from "./debug.js";
import { backoff, delay } from "./delay.js";
import { encodeForm } from "./encode.js";
import {
  type ApiErrorParameters,
  HTTP_STATUS_TOO_MANY_REQUESTS,
  isAbortError,
  NetworkError,
  ParseError,
  TelegramApiError,
  TelegramBotError,
  TimeoutError,
} from "./errors.js";
import { RateLimiter, type RateLimitOptions } from "./ratelimiter.js";
import type { WireValue } from "./serialize.js";

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
  /**
   * Max 429 `retry_after` to honor by waiting, in ms. When Telegram asks to wait
   * longer than this, the request is NOT retried - the `TelegramApiError` is surfaced
   * immediately (read `err.retryAfter` to decide) instead of hanging for the full
   * flood-wait. Default 60000. `0` disables the cap (honor `retry_after` verbatim).
   */
  maxRetryAfterMs?: number;
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
const DEFAULT_MAX_RETRY_AFTER = 60_000;
const MAX_BACKOFF = 30_000;

const log = debug("transport");

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

export class Transport {
  readonly apiRoot: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryBackoffMs: number;
  private readonly maxRetryAfterMs: number;
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
    this.maxRetryAfterMs = options.maxRetryAfterMs ?? DEFAULT_MAX_RETRY_AFTER;
    if (options.rateLimit) this.limiter = new RateLimiter(options.rateLimit);
  }

  /** For long polling the client timeout must outlast the server-side wait. */
  private effectiveTimeout(method: string, params?: Record<string, WireValue>): number {
    if (method === "getUpdates" && params && typeof params.timeout === "number" && params.timeout > 0) {
      return params.timeout * 1000 + 10_000;
    }
    return this.timeoutMs;
  }

  async request<R>(method: string, params?: Record<string, WireValue>, signal?: AbortSignal): Promise<R> {
    const url = `${this.apiRoot}/bot${this.token}/${method}`;
    const timeoutMs = this.effectiveTimeout(method, params);
    log("-> %s", method);

    // Opt-in proactive rate limiting: acquire once, before the first send attempt
    // (not per retry), keyed by chat id when present.
    if (this.limiter) {
      await this.limiter.acquire(params?.chat_id as string | number | undefined, signal);
    }

    // Encode ONCE: the body is reused across every retry. Re-encoding per attempt
    // would re-consume a one-shot `ReadableStream` `InputFile`, so a retry of a
    // streamed upload would fail on an already-drained stream. A `FormData` /
    // `URLSearchParams` body is safe to send repeatedly.
    const { body, headers } = await encodeForm(params ?? {});

    // Bounded: at most `maxRetries + 1` attempts (the first send plus one retry
    // per allowed retry). `attempt` doubles as the loop counter and the retry
    // count; every error path either retries via `continue` or throws, so the
    // bound is a hard ceiling rather than the termination condition.
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const timeoutSignal = timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined;
      const { signal: composed, cleanup } = combineSignals([signal, timeoutSignal]);

      let response: Response;
      let text: string;
      try {
        response = await this.fetchImpl(url, { method: "POST", body, headers, signal: composed });
        // Read the body inside the try so a mid-stream read failure (connection
        // dropped after the headers) is classified and retried like any other
        // transient transport error, not thrown raw past the error hierarchy.
        text = await response.text();
      } catch (err) {
        if (signal?.aborted) throw err; // caller cancelled - propagate verbatim
        // Transient throws (fetch reject / body-read failure / our timeout): retry.
        if (attempt < this.maxRetries) {
          const wait = backoff(attempt + 1, this.retryBackoffMs, MAX_BACKOFF);
          log("%s transient error; retry %d/%d in %dms", method, attempt + 1, this.maxRetries, wait);
          await delay(wait, signal);
          continue;
        }
        if (isAbortError(err)) throw new TimeoutError(`Request timed out: ${method}`, { cause: err });
        throw new NetworkError(`Network request failed: ${method}`, { cause: err });
      } finally {
        cleanup();
      }

      // Server-side 5xx is transient: retry without parsing the body.
      if (response.status >= 500) {
        if (attempt < this.maxRetries) {
          const wait = backoff(attempt + 1, this.retryBackoffMs, MAX_BACKOFF);
          log("%s HTTP %d; retry %d/%d in %dms", method, response.status, attempt + 1, this.maxRetries, wait);
          await delay(wait, signal);
          continue;
        }
        // Exhausted: prefer the `{ ok: false }` envelope when the body is one.
        const envelope = parseEnvelope<R>(text);
        if (envelope && !envelope.ok) {
          throw new TelegramApiError(envelope.error_code, envelope.description, envelope.parameters);
        }
        throw new NetworkError(`Server error ${response.status} on ${method}`);
      }

      let json: ApiResponse<R>;
      try {
        json = JSON.parse(text) as ApiResponse<R>;
      } catch (err) {
        throw new ParseError(`Invalid JSON in response to ${method}`, {
          cause: err,
          responseText: text,
        });
      }

      if (json.ok) {
        log("<- %s ok", method);
        return json.result;
      }

      if (json.error_code === HTTP_STATUS_TOO_MANY_REQUESTS && attempt < this.maxRetries) {
        const retryAfter = json.parameters?.retry_after ?? 1;
        // Honor `retry_after` only up to the cap (0 = no cap). A longer flood-wait is
        // surfaced immediately (caller reads err.retryAfter) rather than hanging the
        // request for minutes; the per-request timeout does not bound this sleep.
        if (this.maxRetryAfterMs === 0 || retryAfter * 1000 <= this.maxRetryAfterMs) {
          log("%s 429; retry %d/%d after %ds", method, attempt + 1, this.maxRetries, retryAfter);
          await delay(retryAfter * 1000, signal);
          continue;
        }
        log(
          "%s 429; retry_after %ds exceeds maxRetryAfterMs (%dms) - surfacing",
          method,
          retryAfter,
          this.maxRetryAfterMs,
        );
      }

      log("<- %s error %d %s", method, json.error_code, json.description);
      throw new TelegramApiError(json.error_code, json.description, json.parameters);
    }

    // Unreachable: the final iteration (attempt === maxRetries) takes a throwing
    // branch on every error path, so the loop never falls through here. Present
    // only to satisfy control-flow analysis now that the loop is bounded.
    throw new TelegramBotError(`Retry loop exited without a result: ${method}`);
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
