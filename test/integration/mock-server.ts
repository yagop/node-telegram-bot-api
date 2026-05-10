/**
 * Local Bot API mock. Mirrors the subset of Telegram endpoints exercised by the
 * integration suite so we can validate the wire format end-to-end without
 * actually contacting api.telegram.org (which is blocked in our sandbox).
 *
 * Each endpoint verifies that the bot token segment in the URL matches the
 * configured token, then returns a plausible Telegram response envelope.
 */

import http from "node:http";
import type { AddressInfo } from "node:net";

export interface MockServerHandle {
  baseUrl: string;
  port: number;
  close(): Promise<void>;
}

interface BotState {
  name: string;
  description: string;
  shortDescription: string;
  commands: Array<{ command: string; description: string }>;
  rights: Record<string, boolean>;
}

const state: BotState = {
  name: "Test Mock Bot",
  description: "Mock description",
  shortDescription: "Mock short description",
  commands: [],
  rights: {
    is_anonymous: false,
    can_manage_chat: true,
    can_delete_messages: false,
    can_manage_video_chats: false,
    can_restrict_members: false,
    can_promote_members: false,
    can_change_info: false,
    can_invite_users: true,
    can_post_messages: false,
    can_edit_messages: false,
    can_pin_messages: false,
  },
};

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function writeJson(res: http.ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(payload));
}

export async function startMockServer(token: string): Promise<MockServerHandle> {
  const server = http.createServer(async (req, res) => {
    const url = req.url ?? "";
    const tokenSegment = `/bot${token}/`;
    if (!url.startsWith(tokenSegment)) {
      writeJson(res, 401, { ok: false, error_code: 401, description: "Unauthorized" });
      return;
    }
    const method = url.slice(tokenSegment.length).split("?")[0];
    const body = await readBody(req);
    const params = new URLSearchParams(body);

    switch (method) {
      case "getMe":
        writeJson(res, 200, {
          ok: true,
          result: {
            id: 99178371,
            is_bot: true,
            first_name: "Test Mock Bot",
            username: "test_mock_bot",
            can_join_groups: true,
            can_read_all_group_messages: false,
            supports_inline_queries: false,
            supports_guest_queries: false,
            can_connect_to_business: true,
            has_main_web_app: false,
            has_topics_enabled: false,
            allows_users_to_create_topics: false,
            can_manage_bots: false
          },
        });
        return;
      case "getMyName":
        writeJson(res, 200, { ok: true, result: { name: state.name } });
        return;
      case "setMyName":
        if (params.get("name")) state.name = params.get("name")!;
        writeJson(res, 200, { ok: true, result: true });
        return;
      case "getMyDescription":
        writeJson(res, 200, { ok: true, result: { description: state.description } });
        return;
      case "getMyShortDescription":
        writeJson(res, 200, { ok: true, result: { short_description: state.shortDescription } });
        return;
      case "getMyCommands":
        writeJson(res, 200, { ok: true, result: state.commands });
        return;
      case "getMyDefaultAdministratorRights":
        writeJson(res, 200, { ok: true, result: state.rights });
        return;
      case "getWebhookInfo":
        writeJson(res, 200, {
          ok: true,
          result: {
            url: "",
            has_custom_certificate: false,
            pending_update_count: 0,
          },
        });
        return;
      case "deleteWebhook":
        writeJson(res, 200, { ok: true, result: true });
        return;
      case "getUpdates":
        writeJson(res, 200, { ok: true, result: [] });
        return;
      case "sendMessage": {
        const chatId = params.get("chat_id");
        if (chatId === "0") {
          writeJson(res, 400, {
            ok: false,
            error_code: 400,
            description: "Bad Request: chat not found",
          });
          return;
        }
        writeJson(res, 200, {
          ok: true,
          result: {
            message_id: 1,
            date: Math.floor(Date.now() / 1000),
            chat: { id: Number(chatId) || 1, type: "private" },
            text: params.get("text") ?? "",
          },
        });
        return;
      }
      default:
        writeJson(res, 404, {
          ok: false,
          error_code: 404,
          description: `Method not implemented in mock: ${method}`,
        });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const port = (server.address() as AddressInfo).port;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
