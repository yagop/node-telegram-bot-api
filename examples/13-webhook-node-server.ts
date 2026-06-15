/**
 * 13 - Raw webhook on a self-hosted node:http server (no Express / Workers / Next.js).
 *
 * `createWebhookServer(bot, { path, secretToken })` (from the `/node` subpath)
 * returns a plain `node:http` server wired to the bot - no framework in between.
 * It reuses the same Web-standard `webhookCallback` internally (secret-token check,
 * one Update parsed, `bot.handleUpdate`, 200), so behavior matches every other
 * webhook example. The server is returned WITHOUT `.listen()`, so you pick the port.
 *
 * This shows the low-level wiring (you own the `listen()` + graceful shutdown). For
 * the managed one-liner, `startWebhook(bot, { port, path, secretToken })` from the
 * same subpath does listen + SIGINT/SIGTERM shutdown for you (the webhook peer of `run`).
 *
 * Telegram only delivers webhooks over public HTTPS. Locally, put a TLS-terminating
 * reverse proxy (nginx / Caddy) or a tunnel (cloudflared / ngrok) in front of this
 * port. Register the webhook once, pointing at that public URL with the SAME secret:
 *   api.setWebhook({ url: "https://you.example/telegram", secret_token: SECRET })
 *
 * Run: BOT_TOKEN=123:abc WEBHOOK_SECRET=s3cret PORT=8443 \
 *      PUBLIC_URL=https://you.example/telegram bun examples/13-webhook-node-server.ts
 */
import { Bot } from "node-telegram-bot-api";
import { createWebhookServer } from "node-telegram-bot-api/node";

const token = process.env.BOT_TOKEN!;
const secret = process.env.WEBHOOK_SECRET; // strongly recommended; see setWebhook below
const port = Number(process.env.PORT ?? "8443");
const path = "/telegram";

const bot = new Bot(token);
bot.command("start", (ctx) => ctx.reply("Hello from a raw node:http webhook 🌐"));

// A bare node:http server: the same secret-token check and dispatch as every other
// webhook runtime, just without a framework. Requests off `path` get a 404.
const server = createWebhookServer(bot, { path, secretToken: secret });

server.listen(port, () => {
  console.log(`Webhook server listening on http://localhost:${port}${path}`);
});

// Point Telegram at your PUBLIC https URL (a proxy/tunnel in front of this port).
// The secret must match the one passed to createWebhookServer above.
const publicUrl = process.env.PUBLIC_URL;
if (publicUrl) {
  await bot.api.setWebhook({ url: publicUrl, secret_token: secret });
  console.log(`Registered webhook -> ${publicUrl}`);
} else {
  console.log("Set PUBLIC_URL (https, via a proxy/tunnel) to auto-register the webhook.");
}

// Graceful shutdown: stop accepting connections, then exit.
const close = (): void => {
  server.close(() => process.exit(0));
};
process.on("SIGINT", close);
process.on("SIGTERM", close);
