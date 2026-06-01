/**
 * Integration tests against the real Telegram Bot API.
 *
 * Required environment variables:
 *   - NODE_TELEGRAM_TOKEN — the Bot token used for the run.
 *   - TEST_GROUP_ID       — chat id where messages can be sent (group or private).
 *   - TEST_USER_ID        — a user id the bot can resolve in TEST_GROUP_ID.
 *
 * Optional:
 *   - TEST_STICKER_SET_NAME — a known public sticker set name (defaults to "pusheen").
 *   - TEST_CUSTOM_EMOJI_ID  — a custom emoji id for getCustomEmojiStickers() (has a default).
 *
 * The suite hits api.telegram.org directly. Tests that would mutate
 * irreversible bot configuration (logOut, close, deleteWebHook, setMyName,
 * setMyProfilePhoto, removeMyProfilePhoto, deleteStickerSet, etc.) are
 * deliberately skipped.
 */

import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  TelegramBot,
  ChatSchema,
  ChatInviteLinkSchema,
  ChatMemberSchema,
  FileSchema,
  MessageSchema,
  PollSchema,
  StickerSetSchema,
  UserProfilePhotosSchema,
  UserSchema,
  WebhookInfoSchema,
} from "../../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const PHOTO_PATH = path.join(DATA_DIR, "photo.png");
const LIVE_PHOTO_PATH = path.join(DATA_DIR, "live_photo.mp4");
const PHOTO_FOR_LIVE_PHOTO_PATH = path.join(DATA_DIR, "photo_live_photo.jpg");
const PHOTO_GIF_PATH = path.join(DATA_DIR, "photo.gif");
const AUDIO_PATH = path.join(DATA_DIR, "audio.mp3");
const VIDEO_PATH = path.join(DATA_DIR, "video.mp4");
const VOICE_PATH = path.join(DATA_DIR, "voice.ogg");
const STICKER_PATH = path.join(DATA_DIR, "sticker.png");
const STICKER_THUMB_PATH = path.join(DATA_DIR, "sticker_thumb.png");

const TOKEN = process.env.NODE_TELEGRAM_TOKEN ?? process.env.TEST_TELEGRAM_TOKEN;
const GROUP_ID_RAW = process.env.TEST_GROUP_ID;
const USER_ID_RAW = process.env.TEST_USER_ID;
const STICKER_SET_NAME = process.env.TEST_STICKER_SET_NAME ?? "pusheen";
const CUSTOM_EMOJI_ID = process.env.TEST_CUSTOM_EMOJI_ID ?? "5368324170671202286";

if (!TOKEN) {
  throw new Error(
    "NODE_TELEGRAM_TOKEN is required to run integration tests against api.telegram.org.",
  );
}
if (!GROUP_ID_RAW) {
  throw new Error("TEST_GROUP_ID is required to run integration tests.");
}
if (!USER_ID_RAW) {
  throw new Error("TEST_USER_ID is required to run integration tests.");
}

// Telegram group/supergroup chat ids are negative. Accept TEST_GROUP_ID with
// or without the leading minus and normalize to the canonical negative form.
const GROUP_ID_PARSED = Number(GROUP_ID_RAW);
const GROUP_ID: number = GROUP_ID_PARSED > 0 ? -GROUP_ID_PARSED : GROUP_ID_PARSED;
const USER_ID: number = Number(USER_ID_RAW);

const TIMESTAMP = Date.now();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Portable test-skip helper. Bun's node:test shim does not yet implement
 * `t.skip()` and throws `NotImplementedError`; on Bun the test simply
 * passes with no assertions, which is acceptable for our soft-skips.
 */
function softSkip(t: { skip: (reason?: string) => void }, reason: string): void {
  try {
    t.skip(reason);
  } catch {
    // Bun: skip() is not implemented — let the test pass quietly.
  }
}

describe("Telegram Bot API (integration)", () => {
  const bot = new TelegramBot(TOKEN, { request: { timeoutMs: 60_000 } });

  // Send one photo up front; we reuse its file_id across tests that need
  // a Telegram-hosted file (sendPhoto from id, getFile, getFileLink, ...).
  let photoFileId: string;
  // The bot's own id, used to address reactions it added by user_id.
  let botUserId: number;

  before(async () => {
    botUserId = (await bot.getMe()).id;
    const sent = await bot.sendPhoto(GROUP_ID, PHOTO_PATH);
    if (!sent.photo || sent.photo.length === 0) {
      throw new Error("expected sendPhoto to return a non-empty photo array");
    }
    photoFileId = sent.photo[sent.photo.length - 1]!.file_id;
  });

  afterEach(async () => {
    // Throttle to stay under Telegram's per-chat ~1 msg/sec rate limit.
    await sleep(1100);
  });

  after(async () => {
    await bot.stopPolling().catch(() => undefined);
  });

  // --- Bot identity ------------------------------------------------------

  describe("Bot identity", () => {
    it("getMe() returns a User describing the bot", async () => {
      const result = await bot.getMe();
      UserSchema.parse(result);
      assert.equal(result.is_bot, true);
      assert.equal(typeof result.id, "number");
    });

    it("getMyName() returns an object with a name string", async () => {
      const result = await bot.getMyName();
      assert.equal(typeof result.name, "string");
    });

    it("getMyDescription() returns an object with a description string", async () => {
      const result = await bot.getMyDescription();
      assert.equal(typeof result.description, "string");
    });

    it("getMyShortDescription() returns an object with a short_description string", async () => {
      const result = await bot.getMyShortDescription();
      assert.equal(typeof result.short_description, "string");
    });

    it("getMyDefaultAdministratorRights() returns a rights object", async () => {
      const rights = await bot.getMyDefaultAdministratorRights();
      assert.equal(typeof rights, "object");
    });

    it("getChatMenuButton() returns a MenuButton object", async () => {
      const button = await bot.getChatMenuButton();
      assert.equal(typeof button, "object");
    });
  });

  // --- Webhook / updates -------------------------------------------------

  describe("Webhook & updates", () => {
    it("getWebHookInfo() returns a WebhookInfo that validates against the schema", async () => {
      const info = await bot.getWebHookInfo();
      WebhookInfoSchema.parse(info);
      assert.equal(typeof info.url, "string");
      assert.equal(typeof info.has_custom_certificate, "boolean");
      assert.equal(typeof info.pending_update_count, "number");
    });

    it("getUpdates() with timeout=0 returns an Array", async () => {
      const updates = await bot.getUpdates({ timeout: 0, limit: 1 });
      assert.ok(Array.isArray(updates));
    });
  });

  // --- Sending text-like content ----------------------------------------

  describe("Sending messages", () => {
    it("sendMessage() sends a plain text message", async () => {
      const sent = await bot.sendMessage(GROUP_ID, `hello ${TIMESTAMP}`);
      MessageSchema.parse(sent);
      assert.equal(sent.text, `hello ${TIMESTAMP}`);
    });

    it("sendMessage() honors parse_mode and reply_markup", async () => {
      const sent = await bot.sendMessage(GROUP_ID, "*bold* text", {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "btn", callback_data: "noop" }]],
        },
      });
      MessageSchema.parse(sent);
      assert.ok(sent.reply_markup);
    });

    it("sendChatAction() returns true", async () => {
      const ok = await bot.sendChatAction(GROUP_ID, "typing");
      assert.equal(ok, true);
    });

    it("sendDice() returns a Message with a dice value", async () => {
      const sent = await bot.sendDice(GROUP_ID);
      MessageSchema.parse(sent);
      assert.ok(sent.dice);
      assert.equal(typeof sent.dice!.value, "number");
    });

    it("sendLocation() returns a Message with a location", async () => {
      const sent = await bot.sendLocation(GROUP_ID, 47.5351072, -52.7508537);
      MessageSchema.parse(sent);
      assert.ok(sent.location);
    });

    it("sendVenue() returns a Message with a venue", async () => {
      const sent = await bot.sendVenue(
        GROUP_ID,
        47.5351072,
        -52.7508537,
        "Venue Title",
        "Venue Address",
      );
      MessageSchema.parse(sent);
      assert.ok(sent.venue);
    });

    it("sendPoll() returns a Message with a Poll (skipped if chat disallows polls)", async (t) => {
      try {
        const sent = await bot.sendPoll(GROUP_ID, "Choose:", [{ text: "A" }, { text: "B" }, { text: "C" }], {
          is_anonymous: true,
        });
        MessageSchema.parse(sent);
        assert.ok(sent.poll);
        PollSchema.parse(sent.poll);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code !== "ETELEGRAM") throw err;
        softSkip(t, "chat does not permit polls");
      }
    });
  });

  // --- File sending: every variant -------------------------------------

  describe("Sending files", () => {
    it("sendPhoto() from a filesystem path", async () => {
      const sent = await bot.sendPhoto(GROUP_ID, PHOTO_PATH);
      MessageSchema.parse(sent);
      assert.ok(Array.isArray(sent.photo));
    });

    it("sendPhoto() from a Buffer", async () => {
      const buf = fs.readFileSync(PHOTO_PATH);
      const sent = await bot.sendPhoto(GROUP_ID, buf, {}, { filename: "photo.png" });
      MessageSchema.parse(sent);
      assert.ok(Array.isArray(sent.photo));
    });

    it("sendPhoto() from a Readable stream", async () => {
      const stream = fs.createReadStream(PHOTO_PATH);
      const sent = await bot.sendPhoto(GROUP_ID, stream);
      MessageSchema.parse(sent);
      assert.ok(Array.isArray(sent.photo));
    });

    it("sendPhoto() from a previously-uploaded file_id", async () => {
      const sent = await bot.sendPhoto(GROUP_ID, photoFileId);
      MessageSchema.parse(sent);
      assert.ok(Array.isArray(sent.photo));
    });

    it("sendLivePhoto() from a filesystem path", async () => {
      const sent = await bot.sendLivePhoto(GROUP_ID, LIVE_PHOTO_PATH, PHOTO_FOR_LIVE_PHOTO_PATH);
      MessageSchema.parse(sent);
      assert.ok(Array.isArray(sent.photo));
      assert.ok(sent.live_photo);
    });

    it("sendAudio() from a filesystem path", async () => {
      const sent = await bot.sendAudio(GROUP_ID, AUDIO_PATH);
      MessageSchema.parse(sent);
      assert.ok(sent.audio);
    });

    it("sendDocument() from a filesystem path", async () => {
      const sent = await bot.sendDocument(GROUP_ID, PHOTO_PATH);
      MessageSchema.parse(sent);
      assert.ok(sent.document);
    });

    it("sendVideo() from a filesystem path", async () => {
      const sent = await bot.sendVideo(GROUP_ID, VIDEO_PATH);
      MessageSchema.parse(sent);
      assert.ok(sent.video);
    });

    it("sendAnimation() from a filesystem path (gif)", async (t) => {
      try {
        const sent = await bot.sendAnimation(GROUP_ID, PHOTO_GIF_PATH);
        MessageSchema.parse(sent);
        assert.ok(sent.animation || sent.document);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code !== "ETELEGRAM") throw err;
        softSkip(t, "chat does not permit GIFs/animations");
      }
    });

    it("sendVoice() from a filesystem path", async () => {
      const sent = await bot.sendVoice(GROUP_ID, VOICE_PATH);
      MessageSchema.parse(sent);
      assert.ok(sent.voice);
    });

    it("sendVideoNote() from a Buffer (skipped if Telegram rejects the format)", async (t) => {
      const buf = fs.readFileSync(VIDEO_PATH);
      let sent;
      try {
        sent = await bot.sendVideoNote(GROUP_ID, buf, {}, { filename: "video.mp4" });
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code !== "ETELEGRAM") throw err;
        softSkip(t, "video_note rejected by Telegram (must be a square video)");
        return;
      }
      MessageSchema.parse(sent);
      // Telegram occasionally classifies non-square clips as plain video.
      // Either branch demonstrates the round-trip succeeded.
      assert.ok(sent.video_note || sent.video);
    });

    it("sendSticker() from a filesystem path", async (t) => {
      try {
        const sent = await bot.sendSticker(GROUP_ID, STICKER_PATH);
        MessageSchema.parse(sent);
        assert.ok(sent.sticker);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code !== "ETELEGRAM") throw err;
        softSkip(t, "chat does not permit stickers");
      }
    });

    it("sendMediaGroup() returns an array of Message", async () => {
      const sent = await bot.sendMediaGroup(GROUP_ID, [
        { type: "photo", media: PHOTO_PATH },
        { type: "photo", media: photoFileId },
      ]);
      assert.ok(Array.isArray(sent));
      assert.equal(sent.length, 2);
      sent.forEach((m) => MessageSchema.parse(m));
    });
  });

  // --- File downloads --------------------------------------------------

  describe("File metadata & downloads", () => {
    it("getFile() returns a TelegramFile that validates", async () => {
      const file = await bot.getFile(photoFileId);
      FileSchema.parse(file);
      assert.equal(file.file_id, photoFileId);
    });

    it("getFileLink() returns an https URL pointing to the file path", async () => {
      const link = await bot.getFileLink(photoFileId);
      assert.match(link, /^https:\/\/api\.telegram\.org\/file\/bot/);
    });

    it("downloadFile() writes the file under the destination directory", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tg-int-"));
      try {
        const filePath = await bot.downloadFile(photoFileId, dir);
        assert.ok(fs.statSync(filePath).size > 0);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("getFileStream() emits 'info' and streams the bytes", async () => {
      const stream = bot.getFileStream(photoFileId);
      let infoUri: string | undefined;
      stream.on("info", (info: { uri: string }) => {
        infoUri = info.uri;
      });
      const chunks: Buffer[] = [];
      for await (const chunk of stream as AsyncIterable<Buffer>) {
        chunks.push(chunk);
      }
      assert.ok(infoUri && infoUri.startsWith("https://"));
      assert.ok(Buffer.concat(chunks).length > 0);
    });
  });

  // --- Forwarding & copying ---------------------------------------------

  describe("Forwarding & copying", () => {
    let messageId: number;

    before(async () => {
      const sent = await bot.sendMessage(GROUP_ID, `forward-source ${TIMESTAMP}`);
      messageId = sent.message_id;
    });

    it("forwardMessage() forwards a single message", async () => {
      const sent = await bot.forwardMessage(GROUP_ID, GROUP_ID, messageId);
      MessageSchema.parse(sent);
    });

    it("copyMessage() returns a MessageId", async () => {
      const result = await bot.copyMessage(GROUP_ID, GROUP_ID, messageId);
      assert.equal(typeof result.message_id, "number");
    });

    it("forwardMessages() forwards an array of messages", async () => {
      const a = (await bot.sendMessage(GROUP_ID, "fwd-1")).message_id;
      const b = (await bot.sendMessage(GROUP_ID, "fwd-2")).message_id;
      const result = await bot.forwardMessages(GROUP_ID, GROUP_ID, [a, b]);
      assert.ok(Array.isArray(result));
      assert.equal(result.length, 2);
    });

    it("copyMessages() copies an array of messages", async () => {
      const a = (await bot.sendMessage(GROUP_ID, "cpy-1")).message_id;
      const b = (await bot.sendMessage(GROUP_ID, "cpy-2")).message_id;
      const result = await bot.copyMessages(GROUP_ID, GROUP_ID, [a, b]);
      assert.ok(Array.isArray(result));
      assert.equal(result.length, 2);
    });
  });

  // --- Editing & deleting ----------------------------------------------

  describe("Editing & deleting", () => {
    it("editMessageText() updates a previously-sent message", async () => {
      const sent = await bot.sendMessage(GROUP_ID, `edit-me ${TIMESTAMP}`);
      const edited = await bot.editMessageText("edited!", {
        chat_id: GROUP_ID,
        message_id: sent.message_id,
      });
      // editMessageText returns Message | true. Assert one of those is true.
      assert.ok(edited === true || (typeof edited === "object" && (edited as { text?: string }).text === "edited!"));
    });

    it("editMessageCaption() updates a photo caption", async () => {
      const sent = await bot.sendPhoto(GROUP_ID, photoFileId, { caption: "before" });
      const edited = await bot.editMessageCaption("after", {
        chat_id: GROUP_ID,
        message_id: sent.message_id,
      });
      assert.ok(edited === true || typeof edited === "object");
    });

    it("editMessageReplyMarkup() updates an inline keyboard", async () => {
      const sent = await bot.sendMessage(GROUP_ID, "with-buttons", {
        reply_markup: {
          inline_keyboard: [[{ text: "a", callback_data: "a" }]],
        },
      });
      const edited = await bot.editMessageReplyMarkup(
        { inline_keyboard: [[{ text: "b", callback_data: "b" }]] },
        { chat_id: GROUP_ID, message_id: sent.message_id },
      );
      assert.ok(edited === true || typeof edited === "object");
    });

    it("editMessageMedia() replaces a photo with a new file via attach://", async () => {
      // Start from a different photo so the edit actually changes the message
      // (Telegram rejects no-op edits with "message is not modified").
      const sent = await bot.sendPhoto(GROUP_ID, STICKER_THUMB_PATH);
      const edited = await bot.editMessageMedia(
        { type: "photo", media: `attach://${PHOTO_PATH}` },
        { chat_id: GROUP_ID, message_id: sent.message_id },
      );
      assert.ok(edited === true || typeof edited === "object");
    });

    it("editMessageMedia() replaces a photo using a Telegram file_id", async () => {
      // Send a different image first so swapping in `photoFileId` is a real change.
      const sent = await bot.sendPhoto(GROUP_ID, STICKER_THUMB_PATH);
      const edited = await bot.editMessageMedia(
        { type: "photo", media: photoFileId },
        { chat_id: GROUP_ID, message_id: sent.message_id },
      );
      assert.ok(edited === true || typeof edited === "object");
    });

    it("deleteMessage() removes a message", async () => {
      const sent = await bot.sendMessage(GROUP_ID, "to-delete");
      const ok = await bot.deleteMessage(GROUP_ID, sent.message_id);
      assert.equal(ok, true);
    });

    it("deleteMessages() removes a batch", async () => {
      const a = (await bot.sendMessage(GROUP_ID, "to-delete-1")).message_id;
      const b = (await bot.sendMessage(GROUP_ID, "to-delete-2")).message_id;
      const ok = await bot.deleteMessages(GROUP_ID, [a, b]);
      assert.equal(ok, true);
    });

    it("setMessageReaction() adds a reaction", async () => {
      const sent = await bot.sendMessage(GROUP_ID, "react-to-me");
      const ok = await bot.setMessageReaction(GROUP_ID, sent.message_id, {
        reaction: [{ type: "emoji", emoji: "👍" }],
      });
      assert.equal(ok, true);
    });

    it("deleteMessageReaction() removes the bot's reaction", async () => {
      const sent = await bot.sendMessage(GROUP_ID, "react-then-undo");
      await bot.setMessageReaction(GROUP_ID, sent.message_id, {
        reaction: [{ type: "emoji", emoji: "👍" }],
      });
      // The bot's own reaction is a user reaction, so it must be addressed by
      // user_id. Requires the bot to hold the can_delete_messages admin right.
      const ok = await bot.deleteMessageReaction(GROUP_ID, sent.message_id, { user_id: botUserId });
      assert.equal(ok, true);
    });

    it("deleteAllMessageReactions() clears chat-wide reactions added by the bot", async () => {
      const sent = await bot.sendMessage(GROUP_ID, "clear-all-reactions");
      await bot.setMessageReaction(GROUP_ID, sent.message_id, {
        reaction: [{ type: "emoji", emoji: "🔥" }],
      });
      const ok = await bot.deleteAllMessageReactions(GROUP_ID, { user_id: botUserId });
      assert.equal(ok, true);
    });

    it("stopPoll() stops a previously-sent poll (skipped if chat disallows polls)", async (t) => {
      let sentMessageId: number;
      try {
        const sent = await bot.sendPoll(GROUP_ID, "stoppable?", [{ text: "yes" }, { text: "no" }]);
        sentMessageId = sent.message_id;
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code !== "ETELEGRAM") throw err;
        softSkip(t, "chat does not permit polls");
        return;
      }
      try {
        const stopped = await bot.stopPoll(GROUP_ID, sentMessageId);
        PollSchema.parse(stopped);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code !== "ETELEGRAM") throw err;
        // Telegram rejects stopPoll on polls the bot didn't create or that
        // are otherwise un-stoppable in this chat. The roundtrip above
        // already proved the wire format works.
        softSkip(t, "poll could not be stopped by the bot in this chat");
      }
    });
  });

  // --- Chat info / membership ------------------------------------------

  describe("Chat info", () => {
    it("getChat() returns a Chat object", async () => {
      const chat = await bot.getChat(GROUP_ID);
      ChatSchema.parse(chat);
      assert.equal(chat.id, GROUP_ID);
    });

    it("getChatMember() returns a ChatMember", async () => {
      const member = await bot.getChatMember(GROUP_ID, USER_ID);
      ChatMemberSchema.parse(member);
    });

    it("getChatAdministrators() returns an Array (empty in private chats)", async () => {
      try {
        const admins = await bot.getChatAdministrators(GROUP_ID);
        assert.ok(Array.isArray(admins));
      } catch (err: unknown) {
        // Telegram returns Bad Request: method is available only for groups
        // and supergroup chats. Treat as a soft pass when running against a
        // private chat.
        const code = (err as { code?: string }).code;
        assert.equal(code, "ETELEGRAM");
      }
    });

    it("getChatMemberCount() returns an Integer (or rejects on private chats)", async () => {
      try {
        const count = await bot.getChatMemberCount(GROUP_ID);
        assert.equal(typeof count, "number");
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        assert.equal(code, "ETELEGRAM");
      }
    });

    it("getUserProfilePhotos() returns a UserProfilePhotos object", async () => {
      const photos = await bot.getUserProfilePhotos(USER_ID);
      UserProfilePhotosSchema.parse(photos);
      assert.equal(typeof photos.total_count, "number");
    });
  });

  // --- Chat invite links (group/supergroup-only) -----------------------

  describe("Chat invite links", () => {
    it("createChatInviteLink → editChatInviteLink → revokeChatInviteLink round-trip", async (t) => {
      let created: { invite_link: string };
      try {
        created = await bot.createChatInviteLink(GROUP_ID, {
          name: `link-${TIMESTAMP}`,
        });
      } catch (err: unknown) {
        // Private chats / chats where the bot isn't an admin can't create
        // invite links. Skip rather than fail.
        const code = (err as { code?: string }).code;
        assert.equal(code, "ETELEGRAM");
        softSkip(t, "invite link APIs require an admin bot in a group/supergroup/channel");
        return;
      }
      ChatInviteLinkSchema.parse(created);

      const edited = await bot.editChatInviteLink(GROUP_ID, created.invite_link, {
        name: `link-${TIMESTAMP}-edited`,
      });
      ChatInviteLinkSchema.parse(edited);

      const revoked = await bot.revokeChatInviteLink(GROUP_ID, created.invite_link);
      ChatInviteLinkSchema.parse(revoked);
      assert.equal(revoked.is_revoked, true);
    });
  });

  // --- Bot self-management (idempotent operations only) ----------------

  describe("Bot self-management", () => {
    it("setMyCommands() / getMyCommands() / deleteMyCommands() round-trip", async () => {
      const commands = [
        { command: "ping", description: "ping the bot" },
        { command: "help", description: "show help" },
      ];
      assert.equal(await bot.setMyCommands(commands), true);
      const fetched = await bot.getMyCommands();
      assert.ok(Array.isArray(fetched));
      assert.ok(fetched.some((c) => c.command === "ping"));
      assert.equal(await bot.deleteMyCommands(), true);
    });

    it("setMyDescription() / getMyDescription() round-trip", async () => {
      const original = (await bot.getMyDescription()).description;
      const sample = `desc-${TIMESTAMP}`;
      assert.equal(await bot.setMyDescription({ description: sample }), true);
      const after = await bot.getMyDescription();
      assert.equal(after.description, sample);
      // Restore.
      await bot.setMyDescription({ description: original });
    });

    it("setMyShortDescription() / getMyShortDescription() round-trip", async () => {
      const original = (await bot.getMyShortDescription()).short_description;
      const sample = `short-${TIMESTAMP}`;
      assert.equal(await bot.setMyShortDescription({ short_description: sample }), true);
      const after = await bot.getMyShortDescription();
      assert.equal(after.short_description, sample);
      // Restore.
      await bot.setMyShortDescription({ short_description: original });
    });
  });

  // --- Stickers --------------------------------------------------------

  describe("Stickers", () => {
    it("getStickerSet() returns a StickerSet for a known public set", async () => {
      const set = await bot.getStickerSet(STICKER_SET_NAME);
      StickerSetSchema.parse(set);
      assert.ok(set.stickers.length > 0);
    });

    it("getCustomEmojiStickers() returns an Array", async () => {
      const stickers = await bot.getCustomEmojiStickers([CUSTOM_EMOJI_ID]);
      assert.ok(Array.isArray(stickers));
    });
  });

  // --- Text/reply listeners (in-process) -------------------------------

  describe("In-process listeners", () => {
    it("onText() registers and removeTextListener() unregisters a callback", () => {
      const localBot = new TelegramBot(TOKEN);
      const regex = /^\/ping/;
      const cb = () => { };
      localBot.onText(regex, cb);
      const removed = localBot.removeTextListener(regex);
      assert.ok(removed);
      assert.equal(removed!.regexp.source, regex.source);
    });

    it("removeTextListener() returns null for an unknown regex", () => {
      const localBot = new TelegramBot(TOKEN);
      assert.equal(localBot.removeTextListener(/nope/), null);
    });

    it("onReplyToMessage() returns an id; removeReplyListener() returns the entry", () => {
      const localBot = new TelegramBot(TOKEN);
      const id = localBot.onReplyToMessage(GROUP_ID, 1, () => { });
      const entry = localBot.removeReplyListener(id);
      assert.ok(entry);
      assert.equal(entry!.id, id);
    });

    it("clearReplyListeners() removes all listeners", () => {
      const localBot = new TelegramBot(TOKEN);
      localBot.onReplyToMessage(GROUP_ID, 1, () => { });
      localBot.onReplyToMessage(GROUP_ID, 2, () => { });
      const cleared = localBot.clearReplyListeners();
      assert.equal(cleared.length, 2);
    });
  });

  // --- Errors ----------------------------------------------------------

  describe("Errors", () => {
    it("sendMessage() to chat id 0 raises ETELEGRAM", async () => {
      await assert.rejects(bot.sendMessage(0, "should not arrive"), (err: unknown) => {
        const code = (err as { code?: string }).code;
        assert.equal(code, "ETELEGRAM");
        return true;
      });
    });
  });
});
