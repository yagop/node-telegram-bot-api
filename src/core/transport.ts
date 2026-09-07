/**
 * Transport - the only module that touches `fetch`.
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
  /** Per-request client timeout in ms for ordinary calls; `0` disables. Default 300000 (5 min). */
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

type ApiError = {
  ok: false;
  error_code: number;
  description: string;
  parameters?: ApiErrorParameters;
};
type ApiResponse<R> = { ok: true; result: R } | ApiError;

/** The wire-ready body factory + headers `encodeForm` produced, plus per-request context. */
type RequestBody = URLSearchParams | ReadableStream<Uint8Array> | Blob;
type RequestContext = {
  url: string;
  method: string;
  makeBody: () => RequestBody;
  headers: Record<string, string>;
  timeoutMs: number;
  signal: AbortSignal | undefined;
  maxRetries: number;
};

/** The outcome of one send attempt: a bounded backoff-and-retry, or a final result. */
type AttemptOutcome<R> = { retry: true; waitMs: number } | { retry: false; result: R };

const DEFAULT_API_ROOT = "https://api.telegram.org";
// Generous enough that a large upload on a slow link is not cut off mid-stream;
// pass timeoutMs to tighten it for latency-sensitive bots.
const DEFAULT_TIMEOUT = 300_000;
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
  if (list.length === 0) {
    return { signal: undefined, cleanup: () => {} };
  }
  if (list.length === 1) {
    return { signal: list[0], cleanup: () => {} };
  }

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
  return {
    signal: controller.signal,
    cleanup: () => {
      for (const fn of cleanups) {
        fn();
      }
    },
  };
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
    options: TransportOptions = {}
  ) {
    if (!token) {
      throw new TelegramBotError("A bot token is required", { code: "EPARAM" });
    }
    // Empty/whitespace apiRoot falls back to the default; `??` would keep "".
    const root = options.apiRoot?.trim();
    this.apiRoot = (root ? root : DEFAULT_API_ROOT).replace(/\/+$/, "");
    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new NetworkError("No fetch implementation available; pass options.fetch");
    }
    this.fetchImpl = fetchImpl;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryBackoffMs = options.retryBackoffMs ?? DEFAULT_RETRY_BACKOFF;
    this.maxRetryAfterMs = options.maxRetryAfterMs ?? DEFAULT_MAX_RETRY_AFTER;
    if (options.rateLimit) {
      this.limiter = new RateLimiter(options.rateLimit);
    }
  }

  /** For long polling the client timeout must outlast the server-side wait. */
  private effectiveTimeout(method: string, params?: Record<string, WireValue>): number {
    if (
      method === "getUpdates" &&
      params &&
      typeof params.timeout === "number" &&
      params.timeout > 0
    ) {
      return params.timeout * 1000 + 10_000;
    }
    return this.timeoutMs;
  }

  async request<R>(
    method: string,
    params?: Record<string, WireValue>,
    signal?: AbortSignal
  ): Promise<R> {
    const url = `${this.apiRoot}/bot${this.token}/${method}`;
    const timeoutMs = this.effectiveTimeout(method, params);
    log("-> %s", method);

    // Opt-in proactive rate limiting: acquire once, before the first send attempt
    // (not per retry), keyed by chat id when present.
    if (this.limiter) {
      await this.limiter.acquire(params?.chat_id as string | number | undefined, signal);
    }

    // Encode ONCE (headers + multipart layout), then build a fresh `body()` per
    // attempt: a streamed multipart body is consumed by the send, so a retry
    // must stream it again from the sources. When the body is NOT replayable (a
    // caller-provided one-shot `ReadableStream` `InputFile`), retrying is
    // impossible - the first failure surfaces immediately.
    const { body: makeBody, headers, replayable } = await encodeForm(params ?? {});
    const ctx: RequestContext = {
      url,
      method,
      makeBody,
      headers,
      timeoutMs,
      signal,
      maxRetries: replayable ? this.maxRetries : 0,
    };

    // Bounded: at most `maxRetries + 1` attempts (the first send plus one retry
    // per allowed retry). `attempt` doubles as the loop counter and the retry
    // count; every attempt returns a result, throws, or asks for a bounded
    // backoff and loops, so the bound is a hard ceiling rather than the
    // termination condition.
    for (let attempt = 0; attempt <= ctx.maxRetries; attempt++) {
      const outcome = await this.attempt<R>(ctx, attempt);
      if (!outcome.retry) {
        return outcome.result;
      }
      await delay(outcome.waitMs, signal);
    }

    // Unreachable: the final iteration (attempt === maxRetries) never yields a
    // `retry` outcome, so the loop never falls through here. Present only to
    // satisfy control-flow analysis now that the loop is bounded.
    throw new TelegramBotError(`Retry loop exited without a result: ${method}`);
  }

  /** One send attempt: run the transport, then classify the response. */
  private async attempt<R>(ctx: RequestContext, attempt: number): Promise<AttemptOutcome<R>> {
    const timeoutSignal = ctx.timeoutMs > 0 ? AbortSignal.timeout(ctx.timeoutMs) : undefined;
    const { signal: composed, cleanup } = combineSignals([ctx.signal, timeoutSignal]);
    // Build body/init outside the try so a synchronous body-build failure
    // surfaces raw and unretried, not caught and retried as a transport error.
    const init = buildInit(ctx.makeBody(), ctx.headers, composed);
    let response: Response;
    let text: string;
    try {
      response = await this.fetchImpl(ctx.url, init);
      // Read the body inside the try so a mid-stream read failure (connection
      // dropped after the headers) is classified and retried like any other
      // transient transport error, not thrown raw past the error hierarchy.
      text = await response.text();
    } catch (err) {
      return this.onTransportError<R>(err, ctx, attempt);
    } finally {
      cleanup();
    }
    return this.classify<R>(ctx, attempt, response, text);
  }

  /** Transient throw (fetch reject / body-read failure / our timeout): retry or surface. */
  private onTransportError<R>(
    err: unknown,
    ctx: RequestContext,
    attempt: number
  ): AttemptOutcome<R> {
    if (ctx.signal?.aborted) {
      throw err; // caller cancelled - propagate verbatim
    }
    if (attempt < ctx.maxRetries) {
      const wait = backoff(attempt + 1, this.retryBackoffMs, MAX_BACKOFF);
      log("%s transient error; retry %d/%d in %dms", ctx.method, attempt + 1, ctx.maxRetries, wait);
      return { retry: true, waitMs: wait };
    }
    if (isAbortError(err)) {
      throw new TimeoutError(`Request timed out: ${ctx.method}`, { cause: err });
    }
    throw new NetworkError(`Network request failed: ${ctx.method}`, { cause: err });
  }

  /** Map a completed HTTP response to a result, a bounded retry, or a thrown error. */
  private classify<R>(
    ctx: RequestContext,
    attempt: number,
    response: Response,
    text: string
  ): AttemptOutcome<R> {
    // Server-side 5xx is transient: retry without parsing the body.
    if (response.status >= 500) {
      return this.onServerError<R>(ctx, attempt, response, text);
    }

    const json = parseJson<R>(text, ctx.method);
    if (json.ok) {
      log("<- %s ok", ctx.method);
      return { retry: false, result: json.result };
    }
    return this.onApiError(ctx, attempt, json);
  }

  /** Handle a 5xx: retry while attempts remain, else surface an envelope/network error. */
  private onServerError<R>(
    ctx: RequestContext,
    attempt: number,
    response: Response,
    text: string
  ): AttemptOutcome<R> {
    if (attempt < ctx.maxRetries) {
      const wait = backoff(attempt + 1, this.retryBackoffMs, MAX_BACKOFF);
      log(
        "%s HTTP %d; retry %d/%d in %dms",
        ctx.method,
        response.status,
        attempt + 1,
        ctx.maxRetries,
        wait
      );
      return { retry: true, waitMs: wait };
    }
    // Exhausted: prefer the `{ ok: false }` envelope when the body is one.
    const envelope = parseEnvelope<R>(text);
    if (envelope && !envelope.ok) {
      throw new TelegramApiError(envelope.error_code, envelope.description, envelope.parameters);
    }
    throw new NetworkError(`Server error ${response.status} on ${ctx.method}`);
  }

  /** Handle an `{ ok: false }` envelope: honor a capped 429 retry_after, else throw. */
  private onApiError<R>(ctx: RequestContext, attempt: number, json: ApiError): AttemptOutcome<R> {
    if (json.error_code === HTTP_STATUS_TOO_MANY_REQUESTS && attempt < ctx.maxRetries) {
      const retryAfter = json.parameters?.retry_after ?? 1;
      // Honor `retry_after` only up to the cap (0 = no cap). A longer flood-wait is
      // surfaced immediately (caller reads err.retryAfter) rather than hanging the
      // request for minutes; the per-request timeout does not bound this sleep.
      if (this.maxRetryAfterMs === 0 || retryAfter * 1000 <= this.maxRetryAfterMs) {
        log("%s 429; retry %d/%d after %ds", ctx.method, attempt + 1, ctx.maxRetries, retryAfter);
        return { retry: true, waitMs: retryAfter * 1000 };
      }
      log(
        "%s 429; retry_after %ds exceeds maxRetryAfterMs (%dms) - surfacing",
        ctx.method,
        retryAfter,
        this.maxRetryAfterMs
      );
    }

    log("<- %s error %d %s", ctx.method, json.error_code, json.description);
    throw new TelegramApiError(json.error_code, json.description, json.parameters);
  }
}

/** Build a POST init, tagging a stream body with `duplex: "half"` as the fetch spec requires. */
function buildInit(
  body: RequestBody,
  headers: Record<string, string>,
  signal: AbortSignal | undefined
): RequestInit & { duplex?: "half" } {
  const init: RequestInit & { duplex?: "half" } = {
    method: "POST",
    body,
    headers,
    signal,
  };
  // The fetch spec (and undici) require `duplex: "half"` to send a stream body;
  // set it only then so runtimes that reject the member for ordinary bodies are
  // unaffected.
  if (body instanceof ReadableStream) {
    init.duplex = "half";
  }
  return init;
}

/** Parse the `{ ok, result }` envelope, or throw a `ParseError` when the body is not JSON. */
function parseJson<R>(text: string, method: string): ApiResponse<R> {
  try {
    return JSON.parse(text) as ApiResponse<R>;
  } catch (err) {
    throw new ParseError(`Invalid JSON in response to ${method}`, {
      cause: err,
      responseText: text,
    });
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
