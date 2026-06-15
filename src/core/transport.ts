/**
 * Transport — the ONLY module that touches `fetch` (ADR-001 / ADR-008).
 *
 * Builds the per-method URL, POSTs the encoded body, unwraps Telegram's
 * `{ ok, result, description, error_code, parameters }` envelope, retries on
 * HTTP 429 honouring `retry_after`, and maps every failure mode onto the
 * runtime-agnostic error hierarchy. Web-standard only: global `fetch`,
 * `AbortSignal`, `Response`.
 */

import type { BuiltBody } from "./encode.js";
import {
  NetworkError,
  TimeoutError,
  ParseError,
  TelegramApiError,
} from "./errors.js";

export interface TransportOptions {
  baseUrl?: string;
  testEnvironment?: boolean;
  timeoutMs?: number;
  maxRetriesOn429?: number;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
}

interface ResponseEnvelope<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: { migrate_to_chat_id?: number; retry_after?: number };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Transport {
  constructor(
    private token: string,
    private opts: TransportOptions = {},
  ) {
    if (!token) {
      throw new NetworkError("Telegram Bot token not provided");
    }
  }

  buildUrl(method: string): string {
    const baseUrl = this.opts.baseUrl ?? "https://api.telegram.org";
    const suffix = this.opts.testEnvironment ? "/test" : "";
    return `${baseUrl}/bot${this.token}${suffix}/${method}`;
  }

  async call<T>(method: string, built: BuiltBody, signal?: AbortSignal): Promise<T> {
    const url = this.buildUrl(method);
    const maxRetries = this.opts.maxRetriesOn429 ?? 2;
    const doFetch = this.opts.fetch ?? fetch;

    for (let attempt = 0; ; attempt++) {
      const signals: AbortSignal[] = [];
      if (signal) {
        signals.push(signal);
      }
      if (this.opts.timeoutMs !== undefined) {
        signals.push(AbortSignal.timeout(this.opts.timeoutMs));
      }
      const merged = signals.length > 0 ? AbortSignal.any(signals) : undefined;

      let res: Response;
      try {
        res = await doFetch(url, {
          method: "POST",
          body: built.body,
          headers: { ...this.opts.headers, ...built.headers },
          signal: merged,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "TimeoutError") {
          throw new TimeoutError();
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new NetworkError(message, { cause: err });
      }

      const text = await res.text();
      let envelope: ResponseEnvelope<T>;
      try {
        envelope = JSON.parse(text) as ResponseEnvelope<T>;
      } catch (err) {
        throw new ParseError(
          `Failed to parse response body as JSON: ${err instanceof Error ? err.message : String(err)}`,
          { status: res.status, body: text },
        );
      }

      if (envelope.ok) {
        return envelope.result as T;
      }

      const retryAfter = envelope.parameters?.retry_after;
      if (
        envelope.error_code === 429 &&
        typeof retryAfter === "number" &&
        attempt < maxRetries &&
        !signal?.aborted
      ) {
        await sleep((retryAfter + 1) * 1000);
        continue;
      }

      throw new TelegramApiError(method, {
        errorCode: envelope.error_code,
        description: envelope.description,
        parameters: envelope.parameters,
      });
    }
  }
}
