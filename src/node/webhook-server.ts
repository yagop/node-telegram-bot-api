/**
 * Self-hosted `node:http` webhook server — Node-only.
 *
 * A thin convenience that spins up a bare `node:http` server and delegates each
 * request to the web-standard {@link webhookCallback}. The core never touches
 * `node:http`; this file is the only Node-server glue (ADR-012).
 */

import { createServer } from "node:http";
import type { Server } from "node:http";

import { webhookCallback } from "../core/webhook.js";
import type { Bot } from "../core/bot.js";

export interface NodeWebhookServerOptions {
  host?: string;
  port?: number;
  path?: string;
  secretToken?: string;
}

/** Create a `node:http` server that feeds incoming updates to the bot. */
export function createWebhookServer(bot: Bot, options: NodeWebhookServerOptions = {}): Server {
  const callback = webhookCallback(bot, { secretToken: options.secretToken });

  return createServer(async (req, res) => {
    if (options.path && !(req.url ?? "").includes(options.path)) {
      res.statusCode = 401;
      res.end();
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }

    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const item of value) headers.append(name, item);
      } else {
        headers.set(name, value);
      }
    }

    const method = req.method ?? "POST";
    const hasBody = chunks.length > 0 && method !== "GET" && method !== "HEAD";
    const body = hasBody
      ? new Blob([Buffer.concat(chunks) as unknown as Uint8Array<ArrayBuffer>])
      : undefined;

    const request = new Request("http://localhost" + (req.url ?? "/"), {
      method,
      headers,
      body,
    });

    const response = await callback(request);
    res.statusCode = response.status;
    res.end(await response.text());
  });
}
