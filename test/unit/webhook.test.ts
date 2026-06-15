import { describe, expect, test } from "bun:test";
import { webhookCallback } from "../../src/core/webhook.js";
import type { Bot } from "../../src/core/bot.js";
import type { Update } from "../../src/types/index.js";

/** A fake Bot exposing only handleUpdate, recording the updates it receives. */
function fakeBot() {
  const received: Update[] = [];
  const bot = {
    handleUpdate: async (update: Update) => {
      received.push(update);
    },
  } as unknown as Bot;
  return { bot, received };
}

const UPDATE = { update_id: 1, message: { message_id: 1 } };

describe("webhookCallback", () => {
  test("valid POST with correct secret -> 200 and handleUpdate invoked", async () => {
    const { bot, received } = fakeBot();
    const handle = webhookCallback(bot, { secretToken: "s" });
    const res = await handle(
      new Request("https://h/hook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "s",
        },
        body: JSON.stringify(UPDATE),
      }),
    );
    expect(res.status).toBe(200);
    expect(received.length).toBe(1);
    expect(received[0]!.update_id).toBe(1);
  });

  test("wrong secret -> 401, handleUpdate not invoked", async () => {
    const { bot, received } = fakeBot();
    const handle = webhookCallback(bot, { secretToken: "s" });
    const res = await handle(
      new Request("https://h/hook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "wrong",
        },
        body: JSON.stringify(UPDATE),
      }),
    );
    expect(res.status).toBe(401);
    expect(received.length).toBe(0);
  });

  test("GET -> 405", async () => {
    const { bot } = fakeBot();
    const handle = webhookCallback(bot, { secretToken: "s" });
    const res = await handle(
      new Request("https://h/hook", { method: "GET" }),
    );
    expect(res.status).toBe(405);
  });

  test("malformed JSON body -> 400", async () => {
    const { bot, received } = fakeBot();
    const handle = webhookCallback(bot, { secretToken: "s" });
    const res = await handle(
      new Request("https://h/hook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "s",
        },
        body: "{ not json",
      }),
    );
    expect(res.status).toBe(400);
    expect(received.length).toBe(0);
  });
});
