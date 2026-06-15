/**
 * Attempt-all wiring matrix.
 *
 * Goal: prove the request pipeline is wired correctly for EVERY generated method
 * — URL building, form encoding, envelope unwrap, and error mapping — without
 * any real fixtures. Each method is invoked with NO arguments. The call is a
 * success iff it produces a genuine round-trip:
 *
 *   - it RESOLVES (a handful of no-param methods like `getMe` actually succeed), OR
 *   - it throws a `TelegramApiError` — the request reached Telegram and came back
 *     as a structured `{ ok: false }` (typically 400 "missing required field"),
 *     which is exactly the proof that the client wired the call correctly.
 *
 * It FAILS on any other throw (`NetworkError` / `ParseError` / `TimeoutError` /
 * `TypeError` / …) — those signal a client-side wiring or encoding bug rather
 * than a server-side rejection.
 *
 * Methods in `DANGEROUS_ARGLESS` would mutate bot/global state when called with
 * no args, so they are registered as `test.skip` (one entry per method, with the
 * reason in the title) rather than executed.
 */
import { test } from "bun:test";
import { TelegramApiError } from "../../src/core/errors.js";
import type { Api } from "../../src/core/api.js";
import { DANGEROUS_ARGLESS, enumerateMethods, hasToken, makeApi } from "./_env.js";

const PER_TEST_TIMEOUT_MS = 20000;

// One shared, rate-limited Api across the whole matrix. Created lazily so the
// no-token skip path never constructs it (and never needs a token).
let api: Api | undefined;
function getApi(): Api {
  api ??= makeApi();
  return api;
}

for (const name of enumerateMethods()) {
  if (DANGEROUS_ARGLESS.has(name)) {
    test.skip(`${name} (skipped: mutates bot/global state when called argless)`, () => {});
    continue;
  }

  test.skipIf(!hasToken)(
    name,
    async () => {
      let err: unknown;
      try {
        // Cast: the matrix calls every method positionally with no args.
        await (getApi() as unknown as Record<string, () => Promise<unknown>>)[name]!();
        return; // resolved — a real round-trip succeeded; wiring OK
      } catch (e) {
        err = e;
      }
      if (err instanceof TelegramApiError) return; // structured round-trip — wiring OK
      throw err; // non-API error — client-side wiring/encoding bug
    },
    PER_TEST_TIMEOUT_MS,
  );
}
