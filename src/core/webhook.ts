/**
 * Web-standard webhook callback (ADR-005, §6.7).
 *
 * A pure `(Request) => Promise<Response>`: verify the secret-token header, parse
 * one `Update`, run `bot.handleUpdate`, return a `Response`. The same function
 * runs on Cloudflare Workers, Deno Deploy, Vercel Edge, Bun.serve, and the
 * Next.js App Router (which speaks `Request`/`Response` natively) - so this file
 * imports nothing Node-specific. Framework adapters that bridge `(req, res)`
 * servers live under `src/node` and delegate to this callback.
 *
 * Authenticity: the `secretToken` compare below is the ONLY thing that
 * authenticates a caller, and Telegram offers nothing stronger - webhook payloads
 * are not signed (unlike, say, Stripe). So treat `secret_token` as REQUIRED in
 * production (a long random value, set identically here and in `setWebhook`); with
 * it unset, anyone who learns the URL can POST forged updates. Defense in depth is
 * a deployment concern, not this callback's: terminate TLS at your edge and, if you
 * want it, allowlist Telegram's published source-IP ranges at the proxy/firewall
 * (brittle in app code behind CDNs, so it is intentionally not built in here).
 *
 * Update dedup: Telegram **redelivers** an update if the webhook does not reply
 * with a 2xx in time (its delivery is at-least-once, not exactly-once). The same
 * `update.update_id` can therefore arrive more than once - especially with
 * `fastAck`/`waitUntil`, where the handler runs *after* the 200 and so cannot
 * influence whether Telegram considers the delivery acknowledged. Make handlers
 * idempotent, or dedupe on `update.update_id` (e.g. a short-TTL seen-set) before
 * acting on side effects. This callback does **not** dedupe for you.
 */

import type { Update } from "../types/index.js";
import type { Bot } from "./bot.js";
import { debug } from "./debug.js";
import { TelegramBotError } from "./errors.js";

const log = debug("webhook");

/**
 * The charset/length Telegram allows for `secret_token` (Bot API `setWebhook`):
 * 1-256 of `A-Z`, `a-z`, `0-9`, `_`, `-`. A value outside this can never match the
 * header Telegram sends, so we reject it at setup rather than 401-ing every update.
 */
const SECRET_TOKEN_RE = /^[A-Za-z0-9_-]{1,256}$/;

export interface WebhookOptions {
  /**
   * If set, the `X-Telegram-Bot-Api-Secret-Token` request header must match it,
   * else the callback responds 401. Mirrors `setWebhook`'s `secret_token` (set the
   * same value in both places). Must be 1-256 chars of `[A-Za-z0-9_-]`; an invalid
   * value throws at setup. Compared in constant time (see {@link safeEqual}).
   *
   * REQUIRED unless {@link WebhookOptions.allowUnauthenticated} is set: webhook
   * payloads are unsigned, so this header is the only thing authenticating a caller.
   */
  secretToken?: string;

  /**
   * Opt out of the required-secret check. When `true`, a callback may be created
   * WITHOUT a `secretToken` - use only when authentication is enforced at another
   * layer (a reverse proxy, mTLS, or an unguessable URL path). Without either a
   * `secretToken` or this flag, {@link webhookCallback} throws at setup, so an
   * unauthenticated webhook is never created by accident.
   */
  allowUnauthenticated?: boolean;

  /**
   * Early-ACK mode. When `true`, the handler returns `200` **immediately** after
   * secret/parse validation and runs `bot.handleUpdate(update)` in the background
   * instead of awaiting it. This prevents a slow handler from tripping Telegram's
   * webhook timeout (which would otherwise cause a redelivery). See the file-level
   * dedup note: handlers should be idempotent when this is enabled.
   *
   * Implied when {@link WebhookOptions.waitUntil} is provided.
   */
  fastAck?: boolean;

  /**
   * Serverless keep-alive hook (e.g. Cloudflare/Vercel `ctx.waitUntil`). When
   * provided, the background `bot.handleUpdate(update)` promise is handed to it so
   * the runtime keeps the worker alive until the handler settles. Providing this
   * implies fast-ACK behavior (200 returned immediately) even if `fastAck` is unset.
   */
  waitUntil?: (promise: Promise<unknown>) => void;
}

/**
 * Constant-time string comparison. Does not early-out on content: a length
 * difference may be revealed (via the loop bound), but for a given length the
 * comparison always inspects every position, so it leaks no information about
 * *where* two equal-length strings differ. Pure JS - no `node:crypto` - to keep
 * `src/core` edge-safe.
 */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export function webhookCallback(bot: Bot, options: WebhookOptions = {}): (request: Request) => Promise<Response> {
  const { secretToken, allowUnauthenticated, fastAck, waitUntil } = options;

  // Secure by default: a webhook callback requires a secret token. The only way
  // to create one without is to opt out explicitly (auth enforced elsewhere), so
  // an unauthenticated endpoint can never be stood up by accident.
  if (secretToken === undefined) {
    if (allowUnauthenticated !== true) {
      throw new TelegramBotError(
        "webhookCallback requires `secretToken` (matching setWebhook's secret_token). " +
          "Set it, or pass `allowUnauthenticated: true` if auth is enforced at another layer.",
        { code: "EPARAM" },
      );
    }
  } else if (!SECRET_TOKEN_RE.test(secretToken)) {
    throw new TelegramBotError(
      "Invalid `secretToken`: must be 1-256 characters of A-Z, a-z, 0-9, _ or - (per setWebhook).",
      { code: "EPARAM" },
    );
  }

  // Providing a waitUntil hook implies fast-ACK behavior.
  const earlyAck = fastAck === true || waitUntil !== undefined;

  return async function handle(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (secretToken !== undefined) {
      // Always run the constant-time compare, even when the header is missing
      // (compare against ""), to avoid an early-out path that leaks header presence.
      const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
      if (!safeEqual(got, secretToken)) {
        log("rejected POST: bad secret token");
        return new Response("Unauthorized", { status: 401 });
      }
    }

    let update: Update;
    try {
      update = (await request.json()) as Update;
    } catch {
      log("rejected POST: invalid JSON body");
      return new Response("Bad Request", { status: 400 });
    }
    log("update %d", update.update_id);

    if (earlyAck) {
      // Validate, kick off the handler, and ACK now. The 200 is already sent, so
      // a handler rejection can never reach the caller; `.catch` keeps it from
      // surfacing as an unhandled rejection. With a `bot.catch()` boundary the
      // rejection was already routed there and this catch never fires; without
      // one, `handleUpdate` rethrows and we'd otherwise drop the error silently
      // - log it (message + stack) so a handler bug stays debuggable. The error
      // is rendered explicitly because `%o` would JSON-stringify an `Error` to
      // `{}` (Errors carry their fields on non-enumerable properties).
      const work = Promise.resolve(bot.handleUpdate(update)).catch((err: unknown) => {
        const detail = err instanceof Error ? err.stack ?? err.message : String(err);
        log("background handleUpdate failed for update %d: %s", update.update_id, detail);
      });
      if (waitUntil !== undefined) waitUntil(work);
      log("update %d: acked 200, handling in background", update.update_id);
      return new Response(null, { status: 200 });
    }

    await bot.handleUpdate(update);
    return new Response(null, { status: 200 });
  };
}
