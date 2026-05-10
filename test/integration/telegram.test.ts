/**
 * Integration tests against a Telegram-compatible Bot API endpoint.
 *
 * Run modes (auto-detected):
 *
 * 1. **Live**: if `api.telegram.org` is reachable, the suite hits the real
 *    Bot API using the token in `TEST_TELEGRAM_TOKEN`. This validates wire
 *    compatibility with Telegram itself.
 *
 * 2. **Mocked**: if the network is unavailable (sandboxed CI etc.), the suite
 *    spins up a local Bot-API-shaped HTTP server (see `mock-server.ts`) and
 *    runs the same assertions against it. The mock accepts the configured
 *    token, replays a valid `User` from `getMe`, etc.
 *
 * Either way the suite verifies:
 *   - URL & body construction by the HTTP transport
 *   - JSON envelope parsing (`ok` true/false)
 *   - Mapping of `error_code` responses to `TelegramError` (code `ETELEGRAM`)
 *   - Schema correctness via Zod against real-shape payloads
 *   - Round-tripping of read methods (getMyName / getMyDescription / …)
 */

import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  TelegramBot,
  UserSchema,
  WebhookInfoSchema,
} from "../../src/index.js";
import { startMockServer, type MockServerHandle } from "./mock-server.js";

const TOKEN = process.env.TEST_TELEGRAM_TOKEN;
const FORCE_MOCK = process.env.TEST_FORCE_MOCK === "1";

if (!TOKEN) {
  // Helpful error rather than a confusing schema-parse failure deeper down.
  // Set TEST_TELEGRAM_TOKEN in your shell or GitHub Actions secrets.
  // For local mock-only runs, use a placeholder + TEST_FORCE_MOCK=1.
  throw new Error(
    "TEST_TELEGRAM_TOKEN env var is required to run integration tests. " +
      "Set it to a real token (live mode) or set both TEST_TELEGRAM_TOKEN and TEST_FORCE_MOCK=1 (mock mode).",
  );
}

async function probeLive(): Promise<boolean> {
  if (FORCE_MOCK) return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${TOKEN}/getMe`, {
      signal: ctrl.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

describe("Telegram Bot API (integration)", () => {
  let bot: TelegramBot;
  let mock: MockServerHandle | null = null;
  let mode: "live" | "mock" = "live";

  before(async () => {
    const live = await probeLive();
    if (!live) {
      mode = "mock";
      mock = await startMockServer(TOKEN);
      // eslint-disable-next-line no-console
      console.log(
        `[integration] api.telegram.org unreachable from sandbox — running against mock at ${mock.baseUrl}`,
      );
    } else {
      // eslint-disable-next-line no-console
      console.log("[integration] api.telegram.org reachable — running against live API");
    }
  });

  after(async () => {
    if (mock) await mock.close();
  });

  beforeEach(() => {
    const baseApiUrl = mock ? mock.baseUrl : "https://api.telegram.org";
    bot = new TelegramBot(TOKEN, {
      baseApiUrl,
      request: { timeoutMs: 30_000 },
    });
  });

  afterEach(async () => {
    if (bot) await bot.stopPolling().catch(() => undefined);
  });

  it("getMe() returns a User describing the bot", async () => {
    const me = await bot.getMe();
    UserSchema.parse(me);
    assert.equal(me.is_bot, true);
    assert.equal(typeof me.id, "number");
    assert.equal(typeof me.first_name, "string");
  });

  it("getMyName() returns the configured bot display name", async () => {
    const result = await bot.getMyName();
    assert.equal(typeof result.name, "string");
  });

  it("getMyDescription() returns a description object", async () => {
    const result = await bot.getMyDescription();
    assert.equal(typeof result.description, "string");
  });

  it("getMyShortDescription() returns a short_description object", async () => {
    const result = await bot.getMyShortDescription();
    assert.equal(typeof result.short_description, "string");
  });

  it("getMyCommands() returns an array (possibly empty)", async () => {
    const cmds = await bot.getMyCommands();
    assert.ok(Array.isArray(cmds));
  });

  it("getMyDefaultAdministratorRights() returns a rights object", async () => {
    const rights = await bot.getMyDefaultAdministratorRights();
    assert.equal(typeof rights, "object");
  });

  it("getWebHookInfo() returns a WebhookInfo object that validates against the schema", async () => {
    const info = await bot.getWebHookInfo();
    WebhookInfoSchema.parse(info);
    assert.equal(typeof info.url, "string");
    assert.equal(typeof info.has_custom_certificate, "boolean");
    assert.equal(typeof info.pending_update_count, "number");
  });

  it("deleteWebHook() returns true (no-op when no webhook is set)", async () => {
    const ok = await bot.deleteWebHook();
    assert.equal(ok, true);
  });

  it("getUpdates() with timeout=0 returns an empty (or short) array", async () => {
    const updates = await bot.getUpdates({ timeout: 0, limit: 1 });
    assert.ok(Array.isArray(updates));
  });

  it("setMyName() round-trips a value successfully (skipped if rate-limited)", async (t) => {
    if (mode === "live") {
      // Telegram rate-limits this method aggressively. Skip on live to avoid
      // disrupting an external bot configuration.
      t.skip("Skipping setMyName on live API");
      return;
    }
    const original = await bot.getMyName();
    const ok = await bot.setMyName({ name: original.name });
    assert.equal(ok, true);
  });

  it("ETELEGRAM is raised when calling a method with bad arguments", async () => {
    if (mode === "live") {
      // On live, hitting Telegram with an invalid chat_id can vary in shape.
      // We still want to validate the error path: a chat_id that cannot exist.
    }
    await assert.rejects(bot.sendMessage(0, "should not arrive"), (err: Error) => {
      const code = (err as { code?: string }).code;
      assert.equal(code, "ETELEGRAM");
      return true;
    });
  });
});
