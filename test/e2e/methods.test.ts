/**
 * Live integration (e2e) suite — ONE describe per Bot API method (~180).
 *
 * Mirrors v1's integration pattern (see `.claude/skills/run-tests/SKILL.md`):
 * every method hits the real `api.telegram.org`, throttled, with real fixtures.
 *
 * STRICT MODEL: every method test calls the method FOR REAL and lets a rejection
 * FAIL the test. There is no error-swallowing wrapper around `TelegramApiError`
 * — if the API rejects, the test fails. The call resolving IS the assertion; where a result
 * is captured a single light `expect(result).toBeDefined()` documents it. Each test
 * is self-contained: a method that needs a `message_id` / `file_id` / poll creates
 * its own fixture at the top and reverts (delete / unpin) within the same test.
 *
 * Consequence: env-limited methods (forum-only, payments without a provider,
 * special-supergroup stickers, owner-not-promotable admin ops, business / story /
 * gift / managed-bot / passport, etc.) WILL FAIL when run live in this environment.
 * That is intended — the suite no longer masks those rejections.
 *
 * RUNNING THE FULL SUITE LOGS THE BOT OUT: `logOut` and `close` are the LAST two
 * describe blocks and terminate the bot session (~10 min lockout). Acceptable for
 * a droppable test bot. Anything placed after them would 401.
 *
 * Credentials come from the environment (loaded from `.env` by `bun test`):
 *   NODE_TELEGRAM_TOKEN, TEST_GROUP_ID, TEST_USER_ID.
 * Without a token the whole suite no-ops (describe.skipIf).
 */
import { describe, expect, test } from "bun:test";

import { Api } from "../../src/core/api.js";
import { inputFile } from "../../src/core/files.js";
import { json } from "../../src/core/json.js";
import { InlineKeyboard } from "../../src/core/keyboard.js";
import { EntityBuilder } from "../../src/core/entities.js";
import { MediaGroup } from "../../src/core/media.js";
import type {
  AcceptedGiftTypes,
  BotCommand,
  BotCommandScopeDefault,
  ChatPermissions,
  InlineQueryResult,
  InputChecklist,
  InputMedia,
  InputPaidMedia,
  InputPollOption,
  InputProfilePhoto,
  InputRichMessage,
  InputStoryContent,
  KeyboardButton,
  LabeledPrice,
  Message,
  PassportElementError,
  ReactionType,
} from "../../src/types/index.js";

// ---------------------------------------------------------------------------
// Environment + shared client
// ---------------------------------------------------------------------------

const TOKEN = process.env.NODE_TELEGRAM_TOKEN ?? process.env.TEST_TELEGRAM_TOKEN;
const GROUP_ID = process.env.TEST_GROUP_ID ?? "";
const USER_ID = Number(process.env.TEST_USER_ID ?? "0");
const hasLive = !!TOKEN;

// `chat_id` accepts `number | string`; keep the raw env string (group ids are
// large negative numbers that survive better as strings on the wire).
const chatId: number | string = /^-?\d+$/.test(GROUP_ID) ? Number(GROUP_ID) : GROUP_ID;

// ONE shared, rate-limited client constructed at module scope (no shared setup hook).
// `global: 1` (~1 req/s) respects Telegram's flood limits like v1's ~1.1s
// throttle. maxRetries:1 keeps a flood `retry_after` from blowing the timeout.
const api = new Api(TOKEN ?? "0:placeholder", {
  rateLimit: { global: 1 },
  maxRetries: 1,
  timeoutMs: 30_000,
});

// ---------------------------------------------------------------------------
// Reusable builders for structured (Json<T>) params
// ---------------------------------------------------------------------------

const samplePermissions = json<ChatPermissions>({
  can_send_messages: true,
  can_send_polls: true,
  can_invite_users: true,
});

const sampleInlineKeyboard = new InlineKeyboard().text("noop", "noop").build();

/**
 * Resolve the target user id once, falling back to the bot's own id when
 * TEST_USER_ID is unset. Tests that act on a user use this inline.
 */
async function targetUserId(): Promise<number> {
  if (USER_ID) return USER_ID;
  const me = await api.getMe();
  return me.id;
}

// Track every describe name so the coverage test can assert parity.
const describedMethods = new Set<string>();
function method(name: string, body: () => void): void {
  describedMethods.add(name);
  describe(name, body);
}

// `describe.skipIf` no-ops the whole suite when there is no token, so a plain
// `bun test` (no creds) passes. The orchestrator runs WITH a token.
const live = describe.skipIf(!hasLive);

live("methods", () => {
  // -------------------------------------------------------------------------
  // Updates / webhook / identity
  // -------------------------------------------------------------------------

  method("getUpdates", () => {
    test("returns an array", async () => {
      const updates = await api.getUpdates({ limit: 1, timeout: 0 });
      expect(updates).toBeDefined();
    });
  });

  method("setWebhook", () => {
    // Self-contained: set a dummy webhook then immediately delete it to restore
    // polling state the rest of the suite relies on.
    test("set then revert to polling", async () => {
      await api.setWebhook({ url: "https://example.com/e2e-webhook" });
      await api.deleteWebhook({ drop_pending_updates: false });
    });
  });

  method("deleteWebhook", () => {
    test("clears any webhook", async () => {
      await api.deleteWebhook();
    });
  });

  method("getWebhookInfo", () => {
    test("returns webhook info", async () => {
      const info = await api.getWebhookInfo();
      expect(info).toBeDefined();
    });
  });

  method("getMe", () => {
    test("identifies a bot", async () => {
      const me = await api.getMe();
      expect(me.is_bot).toBe(true);
      expect(typeof me.id).toBe("number");
    });
  });

  // -------------------------------------------------------------------------
  // Sending messages & media
  // -------------------------------------------------------------------------

  method("sendMessage", () => {
    test("returns message_id and text", async () => {
      const built = new EntityBuilder().bold("e2e").plain(" sendMessage").build();
      const msg = await api.sendMessage({
        chat_id: chatId,
        text: built.text,
        entities: built.entities,
        reply_markup: sampleInlineKeyboard,
      });
      expect(typeof msg.message_id).toBe("number");
      expect(msg.text).toContain("sendMessage");
    });
  });

  method("forwardMessage", () => {
    test("forwards a freshly-sent message", async () => {
      const src = await api.sendMessage({ chat_id: chatId, text: "e2e forwardMessage" });
      const fwd = await api.forwardMessage({
        chat_id: chatId,
        from_chat_id: chatId,
        message_id: src.message_id,
      });
      expect(typeof fwd.message_id).toBe("number");
    });
  });

  method("forwardMessages", () => {
    test("forwards a batch", async () => {
      const src = await api.sendMessage({ chat_id: chatId, text: "e2e forwardMessages" });
      const res = await api.forwardMessages({
        chat_id: chatId,
        from_chat_id: chatId,
        message_ids: json<number[]>([src.message_id]),
      });
      expect(res).toBeDefined();
    });
  });

  method("copyMessage", () => {
    test("copies a freshly-sent message", async () => {
      const src = await api.sendMessage({ chat_id: chatId, text: "e2e copyMessage" });
      const copy = await api.copyMessage({
        chat_id: chatId,
        from_chat_id: chatId,
        message_id: src.message_id,
      });
      expect(typeof copy.message_id).toBe("number");
    });
  });

  method("copyMessages", () => {
    test("copies a batch", async () => {
      const src = await api.sendMessage({ chat_id: chatId, text: "e2e copyMessages" });
      const res = await api.copyMessages({
        chat_id: chatId,
        from_chat_id: chatId,
        message_ids: json<number[]>([src.message_id]),
      });
      expect(res).toBeDefined();
    });
  });

  method("sendPhoto", () => {
    test("sends a photo by URL", async () => {
      const msg = await api.sendPhoto({
        chat_id: chatId,
        photo: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg",
        caption: "e2e photo",
      });
      expect(Array.isArray(msg.photo)).toBe(true);
    });
  });

  method("sendLivePhoto", () => {
    test("sends a live photo", async () => {
      const msg = await api.sendLivePhoto({
        chat_id: chatId,
        live_photo: "https://example.com/e2e.mov",
        photo: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg",
      });
      expect(msg).toBeDefined();
    });
  });

  method("sendAudio", () => {
    test("sends an uploaded audio", async () => {
      const msg = await api.sendAudio({
        chat_id: chatId,
        audio: inputFile(new TextEncoder().encode("ID3e2e"), {
          filename: "e2e.mp3",
          contentType: "audio/mpeg",
        }),
      });
      expect(msg).toBeDefined();
    });
  });

  method("sendDocument", () => {
    test("sends an uploaded document", async () => {
      const msg = await api.sendDocument({
        chat_id: chatId,
        document: inputFile(new TextEncoder().encode("e2e-doc"), { filename: "e2e.txt" }),
        caption: "e2e doc",
      });
      expect(msg.document?.file_id).toBeTruthy();
    });
  });

  method("sendVideo", () => {
    test("sends an uploaded video", async () => {
      const msg = await api.sendVideo({
        chat_id: chatId,
        video: inputFile(new TextEncoder().encode("e2e"), {
          filename: "e2e.mp4",
          contentType: "video/mp4",
        }),
      });
      expect(msg).toBeDefined();
    });
  });

  method("sendAnimation", () => {
    test("sends an uploaded animation", async () => {
      const msg = await api.sendAnimation({
        chat_id: chatId,
        animation: inputFile(new TextEncoder().encode("e2e"), {
          filename: "e2e.gif",
          contentType: "image/gif",
        }),
      });
      expect(msg).toBeDefined();
    });
  });

  method("sendVoice", () => {
    test("sends an uploaded voice", async () => {
      const msg = await api.sendVoice({
        chat_id: chatId,
        voice: inputFile(new TextEncoder().encode("e2e"), {
          filename: "e2e.ogg",
          contentType: "audio/ogg",
        }),
      });
      expect(msg).toBeDefined();
    });
  });

  method("sendVideoNote", () => {
    test("sends an uploaded video note", async () => {
      const msg = await api.sendVideoNote({
        chat_id: chatId,
        video_note: inputFile(new TextEncoder().encode("e2e"), {
          filename: "e2e.mp4",
          contentType: "video/mp4",
        }),
      });
      expect(msg).toBeDefined();
    });
  });

  method("sendPaidMedia", () => {
    test("sends paid media", async () => {
      const media = json<InputPaidMedia[]>([
        { type: "photo", media: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg" },
      ]);
      const msg = await api.sendPaidMedia({ chat_id: chatId, star_count: 1, media });
      expect(msg).toBeDefined();
    });
  });

  method("sendMediaGroup", () => {
    test("sends a two-photo album", async () => {
      const media = new MediaGroup()
        .photo("https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg", { caption: "a" })
        .photo("https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg", { caption: "b" })
        .build();
      const res = await api.sendMediaGroup({ chat_id: chatId, media });
      expect(res).toBeDefined();
    });
  });

  method("sendLocation", () => {
    test("sends a location", async () => {
      const msg = await api.sendLocation({ chat_id: chatId, latitude: 51.5, longitude: -0.12 });
      expect(typeof msg.message_id).toBe("number");
    });
  });

  method("sendVenue", () => {
    test("sends a venue", async () => {
      const msg = await api.sendVenue({
        chat_id: chatId,
        latitude: 51.5,
        longitude: -0.12,
        title: "e2e venue",
        address: "1 Test St",
      });
      expect(msg).toBeDefined();
    });
  });

  method("sendContact", () => {
    test("sends a contact", async () => {
      const msg = await api.sendContact({
        chat_id: chatId,
        phone_number: "+10000000000",
        first_name: "E2E",
      });
      expect(msg).toBeDefined();
    });
  });

  method("sendPoll", () => {
    test("returns a poll message", async () => {
      const msg = await api.sendPoll({
        chat_id: chatId,
        question: "e2e poll specific?",
        options: json<InputPollOption[]>([{ text: "a" }, { text: "b" }]),
      });
      expect(msg.poll?.id).toBeTruthy();
    });
  });

  method("sendChecklist", () => {
    test("sends a checklist", async () => {
      const checklist = json<InputChecklist>({
        title: "e2e checklist",
        tasks: [{ id: 1, text: "task one" }],
      });
      const msg = await api.sendChecklist({
        business_connection_id: "e2e",
        chat_id: chatId,
        checklist,
      });
      expect(msg).toBeDefined();
    });
  });

  method("sendDice", () => {
    test("returns a dice", async () => {
      const msg = await api.sendDice({ chat_id: chatId, emoji: "🎲" });
      expect(msg.dice).toBeDefined();
      expect(typeof msg.dice?.value).toBe("number");
    });
  });

  method("sendMessageDraft", () => {
    test("sends a message draft", async () => {
      const res = await api.sendMessageDraft({
        chat_id: Number(chatId) || 0,
        draft_id: 1,
        text: "e2e draft",
      });
      expect(res).toBeDefined();
    });
  });

  method("sendChatAction", () => {
    test("returns true", async () => {
      const ok = await api.sendChatAction({ chat_id: chatId, action: "typing" });
      expect(ok).toBe(true);
    });
  });

  method("setMessageReaction", () => {
    test("reacts to a freshly-sent message", async () => {
      const msg = await api.sendMessage({ chat_id: chatId, text: "e2e setMessageReaction" });
      const reaction = json<ReactionType[]>([{ type: "emoji", emoji: "👍" } as ReactionType]);
      const ok = await api.setMessageReaction({
        chat_id: chatId,
        message_id: msg.message_id,
        reaction,
      });
      expect(ok).toBe(true);
    });
  });

  method("getUserProfilePhotos", () => {
    test("returns profile photos", async () => {
      const res = await api.getUserProfilePhotos({ user_id: await targetUserId() });
      expect(res).toBeDefined();
    });
  });

  method("getUserProfileAudios", () => {
    test("returns profile audios", async () => {
      const res = await api.getUserProfileAudios({ user_id: await targetUserId() });
      expect(res).toBeDefined();
    });
  });

  method("setUserEmojiStatus", () => {
    test("sets the user emoji status", async () => {
      await api.setUserEmojiStatus({ user_id: await targetUserId() });
    });
  });

  method("getFile", () => {
    test("resolves an uploaded file_id", async () => {
      // Self-contained: upload a document inline, then resolve its file_id.
      const doc = await api.sendDocument({
        chat_id: chatId,
        document: inputFile(new TextEncoder().encode("e2e"), { filename: "e2e.txt" }),
      });
      const fileId = doc.document?.file_id ?? "";
      const file = await api.getFile({ file_id: fileId });
      expect(file.file_id).toBe(fileId);
    });
  });

  // -------------------------------------------------------------------------
  // Chat member / admin
  // -------------------------------------------------------------------------

  method("banChatMember", () => {
    test("bans a chat member", async () => {
      await api.banChatMember({ chat_id: chatId, user_id: await targetUserId() });
    });
  });

  method("unbanChatMember", () => {
    test("unbans a chat member", async () => {
      await api.unbanChatMember({ chat_id: chatId, user_id: await targetUserId() });
    });
  });

  method("restrictChatMember", () => {
    test("restricts a chat member", async () => {
      await api.restrictChatMember({
        chat_id: chatId,
        user_id: await targetUserId(),
        permissions: samplePermissions,
      });
    });
  });

  method("promoteChatMember", () => {
    test("promotes a chat member", async () => {
      await api.promoteChatMember({
        chat_id: chatId,
        user_id: await targetUserId(),
        can_pin_messages: true,
      });
    });
  });

  method("setChatAdministratorCustomTitle", () => {
    test("sets a custom admin title", async () => {
      await api.setChatAdministratorCustomTitle({
        chat_id: chatId,
        user_id: await targetUserId(),
        custom_title: "E2E",
      });
    });
  });

  method("setChatMemberTag", () => {
    test("sets a chat member tag", async () => {
      await api.setChatMemberTag({ chat_id: chatId, user_id: await targetUserId() });
    });
  });

  method("banChatSenderChat", () => {
    test("bans a sender chat", async () => {
      await api.banChatSenderChat({ chat_id: chatId, sender_chat_id: await targetUserId() });
    });
  });

  method("unbanChatSenderChat", () => {
    test("unbans a sender chat", async () => {
      await api.unbanChatSenderChat({ chat_id: chatId, sender_chat_id: await targetUserId() });
    });
  });

  method("setChatPermissions", () => {
    test("sets chat permissions", async () => {
      await api.setChatPermissions({ chat_id: chatId, permissions: samplePermissions });
    });
  });

  // -------------------------------------------------------------------------
  // Invite links / join requests
  // -------------------------------------------------------------------------

  method("exportChatInviteLink", () => {
    test("exports the primary invite link", async () => {
      const link = await api.exportChatInviteLink({ chat_id: chatId });
      expect(link).toBeDefined();
    });
  });

  method("createChatInviteLink", () => {
    test("creates an invite link", async () => {
      const link = await api.createChatInviteLink({ chat_id: chatId, name: "e2e link" });
      expect(link).toBeDefined();
    });
  });

  method("editChatInviteLink", () => {
    test("edits an existing invite link", async () => {
      // Self-contained: create a link, then edit it.
      const created = await api.createChatInviteLink({ chat_id: chatId, name: "e2e edit src" });
      const edited = await api.editChatInviteLink({
        chat_id: chatId,
        invite_link: created.invite_link,
        name: "e2e edited",
      });
      expect(edited).toBeDefined();
    });
  });

  method("createChatSubscriptionInviteLink", () => {
    test("creates a subscription invite link", async () => {
      const link = await api.createChatSubscriptionInviteLink({
        chat_id: chatId,
        subscription_period: 2_592_000,
        subscription_price: 1,
      });
      expect(link).toBeDefined();
    });
  });

  method("editChatSubscriptionInviteLink", () => {
    test("edits a subscription invite link", async () => {
      const created = await api.createChatSubscriptionInviteLink({
        chat_id: chatId,
        subscription_period: 2_592_000,
        subscription_price: 1,
      });
      const edited = await api.editChatSubscriptionInviteLink({
        chat_id: chatId,
        invite_link: created.invite_link,
      });
      expect(edited).toBeDefined();
    });
  });

  method("revokeChatInviteLink", () => {
    test("revokes an invite link", async () => {
      const created = await api.createChatInviteLink({ chat_id: chatId, name: "e2e revoke src" });
      const revoked = await api.revokeChatInviteLink({
        chat_id: chatId,
        invite_link: created.invite_link,
      });
      expect(revoked).toBeDefined();
    });
  });

  method("approveChatJoinRequest", () => {
    test("approves a join request", async () => {
      await api.approveChatJoinRequest({ chat_id: chatId, user_id: await targetUserId() });
    });
  });

  method("declineChatJoinRequest", () => {
    test("declines a join request", async () => {
      await api.declineChatJoinRequest({ chat_id: chatId, user_id: await targetUserId() });
    });
  });

  method("answerChatJoinRequestQuery", () => {
    test("answers a join request query", async () => {
      await api.answerChatJoinRequestQuery({
        chat_join_request_query_id: "e2e",
        result: "approve",
      });
    });
  });

  method("sendChatJoinRequestWebApp", () => {
    test("sends a chat join request web app", async () => {
      await api.sendChatJoinRequestWebApp({
        chat_join_request_query_id: "e2e",
        web_app_url: "https://example.com",
      });
    });
  });

  // -------------------------------------------------------------------------
  // Chat profile / pins
  // -------------------------------------------------------------------------

  method("setChatPhoto", () => {
    test("sets the chat photo", async () => {
      await api.setChatPhoto({
        chat_id: chatId,
        photo: inputFile(new TextEncoder().encode("\xFF\xD8\xFFe2e"), {
          filename: "chat.jpeg",
          contentType: "image/jpeg",
        }),
      });
    });
  });

  method("deleteChatPhoto", () => {
    test("deletes the chat photo", async () => {
      await api.deleteChatPhoto({ chat_id: chatId });
    });
  });

  method("setChatTitle", () => {
    // Self-contained: capture the original title, set a new one, then restore.
    test("set then restore", async () => {
      const chat = await api.getChat({ chat_id: chatId });
      const original = chat.title ?? "e2e group";
      await api.setChatTitle({ chat_id: chatId, title: "e2e title" });
      await api.setChatTitle({ chat_id: chatId, title: original });
    });
  });

  method("setChatDescription", () => {
    test("sets the chat description", async () => {
      await api.setChatDescription({ chat_id: chatId, description: "e2e description" });
    });
  });

  method("pinChatMessage", () => {
    test("pins then unpins a freshly-sent message", async () => {
      const msg = await api.sendMessage({ chat_id: chatId, text: "e2e pinChatMessage" });
      const pinned = await api.pinChatMessage({
        chat_id: chatId,
        message_id: msg.message_id,
        disable_notification: true,
      });
      expect(pinned).toBe(true);
      // Revert so the chat stays clean.
      await api.unpinChatMessage({ chat_id: chatId, message_id: msg.message_id });
    });
  });

  method("unpinChatMessage", () => {
    test("unpins a freshly-pinned message", async () => {
      const msg = await api.sendMessage({ chat_id: chatId, text: "e2e unpinChatMessage" });
      await api.pinChatMessage({
        chat_id: chatId,
        message_id: msg.message_id,
        disable_notification: true,
      });
      const ok = await api.unpinChatMessage({ chat_id: chatId, message_id: msg.message_id });
      expect(ok).toBe(true);
    });
  });

  method("unpinAllChatMessages", () => {
    test("returns true", async () => {
      const ok = await api.unpinAllChatMessages({ chat_id: chatId });
      expect(ok).toBe(true);
    });
  });

  method("leaveChat", () => {
    // Leaving the test group would break every later test, so we exercise the
    // wiring against a non-existent chat (Telegram rejects with a 400).
    test("leaves a chat", async () => {
      await api.leaveChat({ chat_id: 1 });
    });
  });

  // -------------------------------------------------------------------------
  // Chat info
  // -------------------------------------------------------------------------

  method("getChat", () => {
    test("returns the chat", async () => {
      const chat = await api.getChat({ chat_id: chatId });
      expect(typeof chat.id).toBe("number");
    });
  });

  method("getChatAdministrators", () => {
    test("returns admins", async () => {
      const admins = await api.getChatAdministrators({ chat_id: chatId });
      expect(admins).toBeDefined();
    });
  });

  method("getChatMemberCount", () => {
    test("returns a count", async () => {
      const count = await api.getChatMemberCount({ chat_id: chatId });
      expect(typeof count).toBe("number");
    });
  });

  method("getChatMember", () => {
    test("returns a member", async () => {
      const member = await api.getChatMember({ chat_id: chatId, user_id: await targetUserId() });
      expect(member).toBeDefined();
    });
  });

  method("getUserPersonalChatMessages", () => {
    test("returns personal chat messages", async () => {
      const res = await api.getUserPersonalChatMessages({
        user_id: await targetUserId(),
        limit: 1,
      });
      expect(res).toBeDefined();
    });
  });

  method("setChatStickerSet", () => {
    test("sets the chat sticker set", async () => {
      await api.setChatStickerSet({ chat_id: chatId, sticker_set_name: "pusheen" });
    });
  });

  method("deleteChatStickerSet", () => {
    test("deletes the chat sticker set", async () => {
      await api.deleteChatStickerSet({ chat_id: chatId });
    });
  });

  // -------------------------------------------------------------------------
  // Forum topics (require a forum-enabled supergroup)
  // -------------------------------------------------------------------------

  method("getForumTopicIconStickers", () => {
    test("returns icon stickers", async () => {
      const stickers = await api.getForumTopicIconStickers();
      expect(stickers).toBeDefined();
    });
  });

  method("createForumTopic", () => {
    test("creates a forum topic", async () => {
      const topic = await api.createForumTopic({ chat_id: chatId, name: "e2e topic" });
      expect(topic).toBeDefined();
    });
  });

  method("editForumTopic", () => {
    test("edits a forum topic", async () => {
      await api.editForumTopic({ chat_id: chatId, message_thread_id: 1, name: "x" });
    });
  });

  method("closeForumTopic", () => {
    test("closes a forum topic", async () => {
      await api.closeForumTopic({ chat_id: chatId, message_thread_id: 1 });
    });
  });

  method("reopenForumTopic", () => {
    test("reopens a forum topic", async () => {
      await api.reopenForumTopic({ chat_id: chatId, message_thread_id: 1 });
    });
  });

  method("deleteForumTopic", () => {
    test("deletes a forum topic", async () => {
      await api.deleteForumTopic({ chat_id: chatId, message_thread_id: 1 });
    });
  });

  method("unpinAllForumTopicMessages", () => {
    test("unpins all forum topic messages", async () => {
      await api.unpinAllForumTopicMessages({ chat_id: chatId, message_thread_id: 1 });
    });
  });

  method("editGeneralForumTopic", () => {
    test("edits the general forum topic", async () => {
      await api.editGeneralForumTopic({ chat_id: chatId, name: "General" });
    });
  });

  method("closeGeneralForumTopic", () => {
    test("closes the general forum topic", async () => {
      await api.closeGeneralForumTopic({ chat_id: chatId });
    });
  });

  method("reopenGeneralForumTopic", () => {
    test("reopens the general forum topic", async () => {
      await api.reopenGeneralForumTopic({ chat_id: chatId });
    });
  });

  method("hideGeneralForumTopic", () => {
    test("hides the general forum topic", async () => {
      await api.hideGeneralForumTopic({ chat_id: chatId });
    });
  });

  method("unhideGeneralForumTopic", () => {
    test("unhides the general forum topic", async () => {
      await api.unhideGeneralForumTopic({ chat_id: chatId });
    });
  });

  method("unpinAllGeneralForumTopicMessages", () => {
    test("unpins all general forum topic messages", async () => {
      await api.unpinAllGeneralForumTopicMessages({ chat_id: chatId });
    });
  });

  // -------------------------------------------------------------------------
  // Queries / boosts / business / managed bots
  // -------------------------------------------------------------------------

  method("answerCallbackQuery", () => {
    test("answers a callback query", async () => {
      await api.answerCallbackQuery({ callback_query_id: "e2e" });
    });
  });

  method("answerGuestQuery", () => {
    test("answers a guest query", async () => {
      const result = json<InlineQueryResult>({
        type: "article",
        id: "1",
        title: "e2e",
        input_message_content: { message_text: "e2e" },
      } as InlineQueryResult);
      await api.answerGuestQuery({ guest_query_id: "e2e", result });
    });
  });

  method("getUserChatBoosts", () => {
    test("returns user chat boosts", async () => {
      const res = await api.getUserChatBoosts({ chat_id: chatId, user_id: await targetUserId() });
      expect(res).toBeDefined();
    });
  });

  method("getBusinessConnection", () => {
    test("returns a business connection", async () => {
      const res = await api.getBusinessConnection({ business_connection_id: "e2e" });
      expect(res).toBeDefined();
    });
  });

  method("getManagedBotToken", () => {
    test("returns a managed bot token", async () => {
      await api.getManagedBotToken({ user_id: await targetUserId() });
    });
  });

  method("replaceManagedBotToken", () => {
    test("replaces a managed bot token", async () => {
      await api.replaceManagedBotToken({ user_id: await targetUserId() });
    });
  });

  method("getManagedBotAccessSettings", () => {
    test("returns managed bot access settings", async () => {
      await api.getManagedBotAccessSettings({ user_id: await targetUserId() });
    });
  });

  method("setManagedBotAccessSettings", () => {
    test("sets managed bot access settings", async () => {
      await api.setManagedBotAccessSettings({
        user_id: await targetUserId(),
        is_access_restricted: false,
      });
    });
  });

  // -------------------------------------------------------------------------
  // Bot profile / commands
  // -------------------------------------------------------------------------

  method("setMyCommands", () => {
    // Self-contained: set then clear so the bot's command list is unchanged.
    test("set then clear", async () => {
      const commands = json<BotCommand[]>([{ command: "e2e", description: "e2e command" }]);
      const scope = json<BotCommandScopeDefault>({ type: "default" });
      const ok = await api.setMyCommands({ commands, scope });
      expect(ok).toBe(true);
      await api.deleteMyCommands({ scope });
    });
  });

  method("deleteMyCommands", () => {
    test("returns true", async () => {
      const ok = await api.deleteMyCommands();
      expect(ok).toBe(true);
    });
  });

  method("getMyCommands", () => {
    test("returns commands", async () => {
      const commands = await api.getMyCommands();
      expect(commands).toBeDefined();
    });
  });

  method("setMyName", () => {
    test("sets the bot name", async () => {
      await api.setMyName({});
    });
  });

  method("getMyName", () => {
    test("returns the name", async () => {
      const name = await api.getMyName();
      expect(name).toBeDefined();
    });
  });

  method("setMyDescription", () => {
    // Self-contained: set then clear.
    test("set then clear", async () => {
      await api.setMyDescription({ description: "e2e description" });
      await api.setMyDescription({ description: "" });
    });
  });

  method("getMyDescription", () => {
    test("returns the description", async () => {
      const desc = await api.getMyDescription();
      expect(desc).toBeDefined();
    });
  });

  method("setMyShortDescription", () => {
    test("set then clear", async () => {
      await api.setMyShortDescription({ short_description: "e2e" });
      await api.setMyShortDescription({ short_description: "" });
    });
  });

  method("getMyShortDescription", () => {
    test("returns the short description", async () => {
      const desc = await api.getMyShortDescription();
      expect(desc).toBeDefined();
    });
  });

  method("setMyProfilePhoto", () => {
    test("sets the bot profile photo", async () => {
      const photo = json<InputProfilePhoto>({
        type: "static",
        photo: "attach://e2e",
      } as InputProfilePhoto);
      await api.setMyProfilePhoto({ photo });
    });
  });

  method("removeMyProfilePhoto", () => {
    test("removes the bot profile photo", async () => {
      await api.removeMyProfilePhoto();
    });
  });

  method("setChatMenuButton", () => {
    test("sets the chat menu button", async () => {
      await api.setChatMenuButton({ menu_button: json({ type: "default" }) });
    });
  });

  method("getChatMenuButton", () => {
    test("returns the menu button", async () => {
      const button = await api.getChatMenuButton();
      expect(button).toBeDefined();
    });
  });

  method("setMyDefaultAdministratorRights", () => {
    test("sets default administrator rights", async () => {
      await api.setMyDefaultAdministratorRights({});
    });
  });

  method("getMyDefaultAdministratorRights", () => {
    test("returns rights", async () => {
      const rights = await api.getMyDefaultAdministratorRights();
      expect(rights).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Gifts / verification / business account (need accounts)
  // -------------------------------------------------------------------------

  method("getAvailableGifts", () => {
    test("returns gifts", async () => {
      const gifts = await api.getAvailableGifts();
      expect(gifts).toBeDefined();
    });
  });

  method("sendGift", () => {
    test("sends a gift", async () => {
      await api.sendGift({ gift_id: "e2e", user_id: await targetUserId() });
    });
  });

  method("giftPremiumSubscription", () => {
    test("gifts a premium subscription", async () => {
      await api.giftPremiumSubscription({
        user_id: await targetUserId(),
        month_count: 3,
        star_count: 1,
      });
    });
  });

  method("verifyUser", () => {
    test("verifies a user", async () => {
      await api.verifyUser({ user_id: await targetUserId() });
    });
  });

  method("verifyChat", () => {
    test("verifies a chat", async () => {
      await api.verifyChat({ chat_id: chatId });
    });
  });

  method("removeUserVerification", () => {
    test("removes user verification", async () => {
      await api.removeUserVerification({ user_id: await targetUserId() });
    });
  });

  method("removeChatVerification", () => {
    test("removes chat verification", async () => {
      await api.removeChatVerification({ chat_id: chatId });
    });
  });

  method("readBusinessMessage", () => {
    test("reads a business message", async () => {
      await api.readBusinessMessage({ business_connection_id: "e2e", chat_id: 1, message_id: 1 });
    });
  });

  method("deleteBusinessMessages", () => {
    test("deletes business messages", async () => {
      await api.deleteBusinessMessages({
        business_connection_id: "e2e",
        message_ids: json<number[]>([1]),
      });
    });
  });

  method("setBusinessAccountName", () => {
    test("sets the business account name", async () => {
      await api.setBusinessAccountName({ business_connection_id: "e2e", first_name: "E2E" });
    });
  });

  method("setBusinessAccountUsername", () => {
    test("sets the business account username", async () => {
      await api.setBusinessAccountUsername({ business_connection_id: "e2e" });
    });
  });

  method("setBusinessAccountBio", () => {
    test("sets the business account bio", async () => {
      await api.setBusinessAccountBio({ business_connection_id: "e2e" });
    });
  });

  method("setBusinessAccountProfilePhoto", () => {
    test("sets the business account profile photo", async () => {
      const photo = json<InputProfilePhoto>({
        type: "static",
        photo: "attach://e2e",
      } as InputProfilePhoto);
      await api.setBusinessAccountProfilePhoto({ business_connection_id: "e2e", photo });
    });
  });

  method("removeBusinessAccountProfilePhoto", () => {
    test("removes the business account profile photo", async () => {
      await api.removeBusinessAccountProfilePhoto({ business_connection_id: "e2e" });
    });
  });

  method("setBusinessAccountGiftSettings", () => {
    test("sets business account gift settings", async () => {
      await api.setBusinessAccountGiftSettings({
        business_connection_id: "e2e",
        show_gift_button: true,
        accepted_gift_types: json<AcceptedGiftTypes>({
          unlimited_gifts: true,
          limited_gifts: true,
          unique_gifts: true,
          premium_subscription: true,
          gifts_from_channels: true,
        }),
      });
    });
  });

  method("getBusinessAccountStarBalance", () => {
    test("returns the business account star balance", async () => {
      await api.getBusinessAccountStarBalance({ business_connection_id: "e2e" });
    });
  });

  method("transferBusinessAccountStars", () => {
    test("transfers business account stars", async () => {
      await api.transferBusinessAccountStars({ business_connection_id: "e2e", star_count: 1 });
    });
  });

  method("getBusinessAccountGifts", () => {
    test("returns business account gifts", async () => {
      await api.getBusinessAccountGifts({ business_connection_id: "e2e" });
    });
  });

  method("getUserGifts", () => {
    test("returns user gifts", async () => {
      await api.getUserGifts({ user_id: await targetUserId() });
    });
  });

  method("getChatGifts", () => {
    test("returns chat gifts", async () => {
      await api.getChatGifts({ chat_id: chatId });
    });
  });

  method("convertGiftToStars", () => {
    test("converts a gift to stars", async () => {
      await api.convertGiftToStars({ business_connection_id: "e2e", owned_gift_id: "e2e" });
    });
  });

  method("upgradeGift", () => {
    test("upgrades a gift", async () => {
      await api.upgradeGift({ business_connection_id: "e2e", owned_gift_id: "e2e" });
    });
  });

  method("transferGift", () => {
    test("transfers a gift", async () => {
      await api.transferGift({
        business_connection_id: "e2e",
        owned_gift_id: "e2e",
        new_owner_chat_id: await targetUserId(),
      });
    });
  });

  // -------------------------------------------------------------------------
  // Stories (need a business connection)
  // -------------------------------------------------------------------------

  method("postStory", () => {
    test("posts a story", async () => {
      const content = json<InputStoryContent>({
        type: "photo",
        photo: "attach://e2e",
      } as InputStoryContent);
      await api.postStory({ business_connection_id: "e2e", content, active_period: 86_400 });
    });
  });

  method("repostStory", () => {
    test("reposts a story", async () => {
      await api.repostStory({
        business_connection_id: "e2e",
        from_chat_id: await targetUserId(),
        from_story_id: 1,
        active_period: 86_400,
      });
    });
  });

  method("editStory", () => {
    test("edits a story", async () => {
      const content = json<InputStoryContent>({
        type: "photo",
        photo: "attach://e2e",
      } as InputStoryContent);
      await api.editStory({ business_connection_id: "e2e", story_id: 1, content });
    });
  });

  method("deleteStory", () => {
    test("deletes a story", async () => {
      await api.deleteStory({ business_connection_id: "e2e", story_id: 1 });
    });
  });

  // -------------------------------------------------------------------------
  // Inline / prepared messages
  // -------------------------------------------------------------------------

  method("answerWebAppQuery", () => {
    test("answers a web app query", async () => {
      const result = json<InlineQueryResult>({
        type: "article",
        id: "1",
        title: "e2e",
        input_message_content: { message_text: "e2e" },
      } as InlineQueryResult);
      await api.answerWebAppQuery({ web_app_query_id: "e2e", result });
    });
  });

  method("savePreparedInlineMessage", () => {
    test("saves a prepared inline message", async () => {
      const result = json<InlineQueryResult>({
        type: "article",
        id: "1",
        title: "e2e",
        input_message_content: { message_text: "e2e" },
      } as InlineQueryResult);
      await api.savePreparedInlineMessage({ user_id: await targetUserId(), result });
    });
  });

  method("savePreparedKeyboardButton", () => {
    test("saves a prepared keyboard button", async () => {
      const button = json<KeyboardButton>({ text: "e2e" } as KeyboardButton);
      await api.savePreparedKeyboardButton({ user_id: await targetUserId(), button });
    });
  });

  // -------------------------------------------------------------------------
  // Editing / deleting messages
  // -------------------------------------------------------------------------

  method("editMessageText", () => {
    test("edits a freshly-sent message text", async () => {
      const msg = await api.sendMessage({ chat_id: chatId, text: "e2e editMessageText" });
      const res = await api.editMessageText({
        chat_id: chatId,
        message_id: msg.message_id,
        text: `e2e edited ${Date.now()}`,
      });
      // Result is `Message | boolean`; on a real edit it's a Message.
      if (typeof res !== "boolean") {
        expect((res as Message).text).toContain("e2e edited");
      }
    });
  });

  method("editMessageCaption", () => {
    test("edits a message caption", async () => {
      // Self-contained: send a captioned photo, then edit its caption.
      const photo = await api.sendPhoto({
        chat_id: chatId,
        photo: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg",
        caption: "e2e caption src",
      });
      await api.editMessageCaption({
        chat_id: chatId,
        message_id: photo.message_id,
        caption: "e2e caption",
      });
    });
  });

  method("editMessageMedia", () => {
    test("edits a message media", async () => {
      // Self-contained: send a photo, then replace its media.
      const sent = await api.sendPhoto({
        chat_id: chatId,
        photo: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg",
      });
      const media = json<InputMedia>({
        type: "photo",
        media: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg",
      } as InputMedia);
      await api.editMessageMedia({ chat_id: chatId, message_id: sent.message_id, media });
    });
  });

  method("editMessageLiveLocation", () => {
    test("edits a live location", async () => {
      // Self-contained: send a live location, then move it.
      const sent = await api.sendLocation({
        chat_id: chatId,
        latitude: 51.5,
        longitude: -0.12,
        live_period: 60,
      });
      await api.editMessageLiveLocation({
        chat_id: chatId,
        message_id: sent.message_id,
        latitude: 51.6,
        longitude: -0.13,
      });
    });
  });

  method("stopMessageLiveLocation", () => {
    test("stops a live location", async () => {
      const sent = await api.sendLocation({
        chat_id: chatId,
        latitude: 51.5,
        longitude: -0.12,
        live_period: 60,
      });
      await api.stopMessageLiveLocation({ chat_id: chatId, message_id: sent.message_id });
    });
  });

  method("editMessageChecklist", () => {
    test("edits a message checklist", async () => {
      const checklist = json<InputChecklist>({
        title: "e2e",
        tasks: [{ id: 1, text: "t" }],
      });
      await api.editMessageChecklist({
        business_connection_id: "e2e",
        chat_id: chatId,
        message_id: 1,
        checklist,
      });
    });
  });

  method("editMessageReplyMarkup", () => {
    test("edits a freshly-sent message reply markup", async () => {
      const msg = await api.sendMessage({
        chat_id: chatId,
        text: "e2e editMessageReplyMarkup",
        reply_markup: sampleInlineKeyboard,
      });
      await api.editMessageReplyMarkup({
        chat_id: chatId,
        message_id: msg.message_id,
        reply_markup: new InlineKeyboard().url("docs", "https://core.telegram.org").build(),
      });
    });
  });

  method("stopPoll", () => {
    test("stops a freshly-sent poll", async () => {
      const poll = await api.sendPoll({
        chat_id: chatId,
        question: "e2e stopPoll?",
        options: json<InputPollOption[]>([{ text: "yes" }, { text: "no" }]),
      });
      const stopped = await api.stopPoll({ chat_id: chatId, message_id: poll.message_id });
      expect(stopped.is_closed).toBe(true);
    });
  });

  method("approveSuggestedPost", () => {
    test("approves a suggested post", async () => {
      await api.approveSuggestedPost({ chat_id: Number(chatId) || 1, message_id: 1 });
    });
  });

  method("declineSuggestedPost", () => {
    test("declines a suggested post", async () => {
      await api.declineSuggestedPost({ chat_id: Number(chatId) || 1, message_id: 1 });
    });
  });

  method("deleteMessage", () => {
    test("deletes a freshly-sent message", async () => {
      const msg = await api.sendMessage({ chat_id: chatId, text: "e2e deleteMessage" });
      const ok = await api.deleteMessage({ chat_id: chatId, message_id: msg.message_id });
      expect(ok).toBe(true);
    });
  });

  method("deleteMessages", () => {
    test("deletes a batch of freshly-sent messages", async () => {
      const sent = await api.sendMessage({ chat_id: chatId, text: "e2e deleteMessages" });
      const ok = await api.deleteMessages({
        chat_id: chatId,
        message_ids: json<number[]>([sent.message_id]),
      });
      expect(ok).toBeDefined();
    });
  });

  method("deleteMessageReaction", () => {
    test("deletes a message reaction", async () => {
      const msg = await api.sendMessage({ chat_id: chatId, text: "e2e deleteMessageReaction" });
      await api.deleteMessageReaction({ chat_id: chatId, message_id: msg.message_id });
    });
  });

  method("deleteAllMessageReactions", () => {
    test("deletes all message reactions", async () => {
      await api.deleteAllMessageReactions({ chat_id: chatId });
    });
  });

  // -------------------------------------------------------------------------
  // Stickers
  // -------------------------------------------------------------------------

  method("sendSticker", () => {
    test("sends a sticker", async () => {
      await api.sendSticker({
        chat_id: chatId,
        sticker: inputFile(new TextEncoder().encode("e2e"), {
          filename: "e2e.webp",
          contentType: "image/webp",
        }),
      });
    });
  });

  method("getStickerSet", () => {
    test("returns a known sticker set", async () => {
      const set = await api.getStickerSet({ name: "pusheen" });
      expect(set.name).toBe("pusheen");
    });
  });

  method("getCustomEmojiStickers", () => {
    test("returns custom emoji stickers", async () => {
      const res = await api.getCustomEmojiStickers({
        custom_emoji_ids: json<string[]>(["5368324170671202286"]),
      });
      expect(res).toBeDefined();
    });
  });

  method("uploadStickerFile", () => {
    test("uploads a sticker file", async () => {
      await api.uploadStickerFile({
        user_id: await targetUserId(),
        sticker: inputFile(new TextEncoder().encode("e2e"), { filename: "e2e.png" }),
        sticker_format: "static",
      });
    });
  });

  method("createNewStickerSet", () => {
    test("creates a new sticker set", async () => {
      await api.createNewStickerSet({
        user_id: await targetUserId(),
        name: `e2e_by_bot`,
        title: "e2e",
        stickers: json([{ sticker: "attach://e2e", format: "static", emoji_list: ["🙂"] }]),
      });
    });
  });

  method("addStickerToSet", () => {
    test("adds a sticker to a set", async () => {
      await api.addStickerToSet({
        user_id: await targetUserId(),
        name: "e2e_by_bot",
        sticker: json({ sticker: "attach://e2e", format: "static", emoji_list: ["🙂"] }),
      });
    });
  });

  method("setStickerPositionInSet", () => {
    test("sets a sticker position", async () => {
      await api.setStickerPositionInSet({ sticker: "e2e", position: 0 });
    });
  });

  method("deleteStickerFromSet", () => {
    test("deletes a sticker from a set", async () => {
      await api.deleteStickerFromSet({ sticker: "e2e" });
    });
  });

  method("replaceStickerInSet", () => {
    test("replaces a sticker in a set", async () => {
      await api.replaceStickerInSet({
        user_id: await targetUserId(),
        name: "e2e_by_bot",
        old_sticker: "e2e",
        sticker: json({ sticker: "attach://e2e", format: "static", emoji_list: ["🙂"] }),
      });
    });
  });

  method("setStickerEmojiList", () => {
    test("sets a sticker emoji list", async () => {
      await api.setStickerEmojiList({ sticker: "e2e", emoji_list: json<string[]>(["🙂"]) });
    });
  });

  method("setStickerKeywords", () => {
    test("sets sticker keywords", async () => {
      await api.setStickerKeywords({ sticker: "e2e" });
    });
  });

  method("setStickerMaskPosition", () => {
    test("sets a sticker mask position", async () => {
      await api.setStickerMaskPosition({ sticker: "e2e" });
    });
  });

  method("setStickerSetTitle", () => {
    test("sets a sticker set title", async () => {
      await api.setStickerSetTitle({ name: "e2e_by_bot", title: "e2e" });
    });
  });

  method("setStickerSetThumbnail", () => {
    test("sets a sticker set thumbnail", async () => {
      await api.setStickerSetThumbnail({
        name: "e2e_by_bot",
        user_id: await targetUserId(),
        format: "static",
      });
    });
  });

  method("setCustomEmojiStickerSetThumbnail", () => {
    test("sets a custom emoji sticker set thumbnail", async () => {
      await api.setCustomEmojiStickerSetThumbnail({ name: "e2e_by_bot" });
    });
  });

  method("deleteStickerSet", () => {
    test("deletes a sticker set", async () => {
      await api.deleteStickerSet({ name: "e2e_by_bot" });
    });
  });

  // -------------------------------------------------------------------------
  // Rich messages / inline queries
  // -------------------------------------------------------------------------

  method("sendRichMessage", () => {
    test("sends a rich message", async () => {
      const rich_message = json<InputRichMessage>({ html: "<b>e2e</b>" });
      const msg = await api.sendRichMessage({ chat_id: chatId, rich_message });
      expect(msg).toBeDefined();
    });
  });

  method("sendRichMessageDraft", () => {
    test("sends a rich message draft", async () => {
      const rich_message = json<InputRichMessage>({ html: "<b>e2e</b>" });
      await api.sendRichMessageDraft({ chat_id: Number(chatId) || 1, draft_id: 1, rich_message });
    });
  });

  method("answerInlineQuery", () => {
    test("answers an inline query", async () => {
      const results = json<InlineQueryResult[]>([
        {
          type: "article",
          id: "1",
          title: "e2e",
          input_message_content: { message_text: "e2e" },
        },
      ] as InlineQueryResult[]);
      await api.answerInlineQuery({ inline_query_id: "e2e", results });
    });
  });

  // -------------------------------------------------------------------------
  // Payments (need a provider token / Stars setup)
  // -------------------------------------------------------------------------

  method("sendInvoice", () => {
    test("sends an invoice", async () => {
      const prices = json<LabeledPrice[]>([{ label: "e2e", amount: 100 }]);
      const msg = await api.sendInvoice({
        chat_id: chatId,
        title: "e2e",
        description: "e2e invoice",
        payload: "e2e",
        currency: "XTR",
        prices,
      });
      expect(msg).toBeDefined();
    });
  });

  method("createInvoiceLink", () => {
    test("creates an invoice link", async () => {
      const prices = json<LabeledPrice[]>([{ label: "e2e", amount: 100 }]);
      const link = await api.createInvoiceLink({
        title: "e2e",
        description: "e2e invoice",
        payload: "e2e",
        currency: "XTR",
        prices,
      });
      expect(link).toBeDefined();
    });
  });

  method("answerShippingQuery", () => {
    test("answers a shipping query", async () => {
      await api.answerShippingQuery({ shipping_query_id: "e2e", ok: false });
    });
  });

  method("answerPreCheckoutQuery", () => {
    test("answers a pre-checkout query", async () => {
      await api.answerPreCheckoutQuery({ pre_checkout_query_id: "e2e", ok: true });
    });
  });

  // -------------------------------------------------------------------------
  // Stars
  // -------------------------------------------------------------------------

  method("getMyStarBalance", () => {
    test("returns a star balance", async () => {
      const balance = await api.getMyStarBalance();
      expect(balance).toBeDefined();
    });
  });

  method("getStarTransactions", () => {
    test("returns transactions", async () => {
      const res = await api.getStarTransactions({ limit: 1 });
      expect(res).toBeDefined();
    });
  });

  method("refundStarPayment", () => {
    test("refunds a star payment", async () => {
      await api.refundStarPayment({
        user_id: await targetUserId(),
        telegram_payment_charge_id: "e2e",
      });
    });
  });

  method("editUserStarSubscription", () => {
    test("edits a user star subscription", async () => {
      await api.editUserStarSubscription({
        user_id: await targetUserId(),
        telegram_payment_charge_id: "e2e",
        is_canceled: false,
      });
    });
  });

  // -------------------------------------------------------------------------
  // Passport / games
  // -------------------------------------------------------------------------

  method("setPassportDataErrors", () => {
    test("sets passport data errors", async () => {
      const errors = json<PassportElementError[]>([
        {
          source: "unspecified",
          type: "personal_details",
          element_hash: "e2e",
          message: "e2e",
        },
      ] as PassportElementError[]);
      await api.setPassportDataErrors({ user_id: await targetUserId(), errors });
    });
  });

  method("sendGame", () => {
    test("sends a game", async () => {
      await api.sendGame({ chat_id: Number(chatId) || 1, game_short_name: "e2e" });
    });
  });

  method("setGameScore", () => {
    test("sets a game score", async () => {
      await api.setGameScore({
        user_id: await targetUserId(),
        score: 1,
        chat_id: Number(chatId) || 1,
        message_id: 1,
      });
    });
  });

  method("getGameHighScores", () => {
    test("returns game high scores", async () => {
      await api.getGameHighScores({
        user_id: await targetUserId(),
        chat_id: Number(chatId) || 1,
        message_id: 1,
      });
    });
  });

  // -------------------------------------------------------------------------
  // SESSION TERMINATORS — MUST BE LAST.
  //
  // `logOut` and `close` end the bot session. After logOut the bot is locked out
  // of the Bot API for ~10 minutes; any method placed after these two would 401.
  // Running the FULL suite therefore logs this (droppable) test bot out — that is
  // expected and acceptable.
  // -------------------------------------------------------------------------

  method("logOut", () => {
    test("logs the bot out (terminates the session — ~10 min lockout)", async () => {
      await api.logOut();
    });
  });

  method("close", () => {
    test("closes the bot instance", async () => {
      await api.close();
    });
  });

  // -------------------------------------------------------------------------
  // Completeness guard: every Api method must have a describe block above.
  // -------------------------------------------------------------------------

  test("coverage — every Api method has a describe", () => {
    const apiMethods = Object.getOwnPropertyNames(Api.prototype).filter(
      (n) => n !== "constructor" && n !== "request",
    );
    const missing = apiMethods.filter((m) => !describedMethods.has(m));
    const extra = [...describedMethods].filter((m) => !apiMethods.includes(m));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    expect(describedMethods.size).toBe(apiMethods.length);
  });
});
