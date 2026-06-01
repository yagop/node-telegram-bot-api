/**
 * Integration tests against the real Telegram Bot API.
 *
 * Tests are organized one `describe("<methodName>")` block per Bot API method.
 * A method that needs a fixture (e.g. a message to edit) seeds it inside its
 * own block, and any mutation of shared chat state (title, description,
 * permissions, invite links) is restored in that block's `after(...)` hook so
 * the chat is left as found.
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
 * irreversible bot configuration (logOut, close, deleteWebHook) are
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
  ChatPermissionsSchema,
  FileSchema,
  MessageSchema,
  MessageIdSchema,
  PollSchema,
  StickerSetSchema,
  UserProfilePhotosSchema,
  UserSchema,
  WebhookInfoSchema,
  type ChatPermissions,
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

/** True for an `ETELEGRAM` API rejection — used to tolerate chat-specific refusals. */
function isTelegramError(err: unknown): err is { code: string; message: string } {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "ETELEGRAM";
}

describe("Telegram Bot API (integration)", () => {
  const bot = new TelegramBot(TOKEN, { request: { timeoutMs: 60_000 } });

  // Send one photo up front; we reuse its file_id across tests that need
  // a Telegram-hosted file (sendPhoto from id, getFile, editMessageMedia, ...).
  let photoFileId: string;
  // The bot's own id, used to address reactions it added by user_id.
  let botUserId: number;
  // Every invite link minted below is revoked in the final cleanup.
  const createdLinks = new Set<string>();

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
    for (const link of createdLinks) {
      await bot.revokeChatInviteLink(GROUP_ID, link).catch(() => undefined);
      await sleep(1100);
    }
    await bot.stopPolling().catch(() => undefined);
  });

  // --- Bot identity ------------------------------------------------------

  describe("getMe", () => {
    it("returns a User describing the bot", async () => {
      const result = await bot.getMe();
      UserSchema.parse(result);
      assert.equal(result.is_bot, true);
      assert.equal(typeof result.id, "number");
    });
  });

  describe("getMyName", () => {
    it("returns an object with a name string", async () => {
      const result = await bot.getMyName();
      assert.equal(typeof result.name, "string");
    });
  });

  describe("getMyDescription", () => {
    it("returns an object with a description string", async () => {
      const result = await bot.getMyDescription();
      assert.equal(typeof result.description, "string");
    });
  });

  describe("getMyShortDescription", () => {
    it("returns an object with a short_description string", async () => {
      const result = await bot.getMyShortDescription();
      assert.equal(typeof result.short_description, "string");
    });
  });

  describe("getMyDefaultAdministratorRights", () => {
    it("returns a rights object", async () => {
      const rights = await bot.getMyDefaultAdministratorRights();
      assert.equal(typeof rights, "object");
    });
  });

  describe("getChatMenuButton", () => {
    it("returns a MenuButton object", async () => {
      const button = await bot.getChatMenuButton();
      assert.equal(typeof button, "object");
    });
  });

  // --- Webhook / updates -------------------------------------------------

  describe("getWebHookInfo", () => {
    it("returns a WebhookInfo that validates against the schema", async () => {
      const info = await bot.getWebHookInfo();
      WebhookInfoSchema.parse(info);
      assert.equal(typeof info.url, "string");
      assert.equal(typeof info.has_custom_certificate, "boolean");
      assert.equal(typeof info.pending_update_count, "number");
    });
  });

  describe("getUpdates", () => {
    it("with timeout=0 returns an Array", async () => {
      const updates = await bot.getUpdates({ timeout: 0, limit: 1 });
      assert.ok(Array.isArray(updates));
    });
  });

  // --- Sending text-like content ----------------------------------------

  describe("sendMessage", () => {
    it("sends a plain text message", async () => {
      const sent = await bot.sendMessage(GROUP_ID, `hello ${TIMESTAMP}`);
      MessageSchema.parse(sent);
      assert.equal(sent.text, `hello ${TIMESTAMP}`);
    });

    it("honors parse_mode and reply_markup", async () => {
      const sent = await bot.sendMessage(GROUP_ID, "*bold* text", {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "btn", callback_data: "noop" }]],
        },
      });
      MessageSchema.parse(sent);
      assert.ok(sent.reply_markup);
    });

    it("rejects with ETELEGRAM when chat_id is 0", async () => {
      await assert.rejects(bot.sendMessage(0, "should not arrive"), (err: unknown) => {
        const code = (err as { code?: string }).code;
        assert.equal(code, "ETELEGRAM");
        return true;
      });
    });
  });

  describe("sendChatAction", () => {
    it("returns true", async () => {
      const ok = await bot.sendChatAction(GROUP_ID, "typing");
      assert.equal(ok, true);
    });
  });

  describe("sendDice", () => {
    it("returns a Message with a dice value", async () => {
      const sent = await bot.sendDice(GROUP_ID);
      MessageSchema.parse(sent);
      assert.ok(sent.dice);
      assert.equal(typeof sent.dice!.value, "number");
    });
  });

  describe("sendLocation", () => {
    it("returns a Message with a location", async () => {
      const sent = await bot.sendLocation(GROUP_ID, 47.5351072, -52.7508537);
      MessageSchema.parse(sent);
      assert.ok(sent.location);
    });
  });

  describe("sendVenue", () => {
    it("returns a Message with a venue", async () => {
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
  });

  describe("sendPoll", () => {
    it("returns a Message with a Poll (skipped if chat disallows polls)", async (t) => {
      try {
        const sent = await bot.sendPoll(GROUP_ID, "Choose:", [{ text: "A" }, { text: "B" }, { text: "C" }], {
          is_anonymous: true,
        });
        MessageSchema.parse(sent);
        assert.ok(sent.poll);
        PollSchema.parse(sent.poll);
      } catch (err: unknown) {
        if (!isTelegramError(err)) throw err;
        softSkip(t, "chat does not permit polls");
      }
    });
  });

  describe("sendContact", () => {
    it("accepts phone_number/first_name + last_name & vcard, returns a contact", async () => {
      const vcard = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        "N:Tester;Inte;;;",
        "FN:Inte Tester",
        "TEL;TYPE=CELL:+15551234567",
        "END:VCARD",
      ].join("\n");

      const sent = await bot.sendContact(GROUP_ID, "+15551234567", "Inte", {
        last_name: "Tester",
        vcard,
      });

      MessageSchema.parse(sent);
      assert.ok(sent.contact, "expected the sent message to carry a contact");
      assert.equal(sent.contact!.phone_number.replace(/^\+/, ""), "15551234567");
      assert.equal(sent.contact!.first_name, "Inte");
      assert.equal(sent.contact!.last_name, "Tester");
    });
  });

  // --- File sending: every variant -------------------------------------

  describe("sendPhoto", () => {
    it("from a filesystem path", async () => {
      const sent = await bot.sendPhoto(GROUP_ID, PHOTO_PATH);
      MessageSchema.parse(sent);
      assert.ok(Array.isArray(sent.photo));
    });

    it("from a Buffer", async () => {
      const buf = fs.readFileSync(PHOTO_PATH);
      const sent = await bot.sendPhoto(GROUP_ID, buf, {}, { filename: "photo.png" });
      MessageSchema.parse(sent);
      assert.ok(Array.isArray(sent.photo));
    });

    it("from a Readable stream", async () => {
      const stream = fs.createReadStream(PHOTO_PATH);
      const sent = await bot.sendPhoto(GROUP_ID, stream);
      MessageSchema.parse(sent);
      assert.ok(Array.isArray(sent.photo));
    });

    it("from a previously-uploaded file_id", async () => {
      const sent = await bot.sendPhoto(GROUP_ID, photoFileId);
      MessageSchema.parse(sent);
      assert.ok(Array.isArray(sent.photo));
    });
  });

  describe("sendLivePhoto", () => {
    it("from a filesystem path", async () => {
      const sent = await bot.sendLivePhoto(GROUP_ID, LIVE_PHOTO_PATH, PHOTO_FOR_LIVE_PHOTO_PATH);
      MessageSchema.parse(sent);
      assert.ok(Array.isArray(sent.photo));
      assert.ok(sent.live_photo);
    });
  });

  describe("sendAudio", () => {
    it("from a filesystem path", async () => {
      const sent = await bot.sendAudio(GROUP_ID, AUDIO_PATH);
      MessageSchema.parse(sent);
      assert.ok(sent.audio);
    });
  });

  describe("sendDocument", () => {
    it("from a filesystem path", async () => {
      const sent = await bot.sendDocument(GROUP_ID, PHOTO_PATH);
      MessageSchema.parse(sent);
      assert.ok(sent.document);
    });
  });

  describe("sendVideo", () => {
    it("from a filesystem path", async () => {
      const sent = await bot.sendVideo(GROUP_ID, VIDEO_PATH);
      MessageSchema.parse(sent);
      assert.ok(sent.video);
    });
  });

  describe("sendAnimation", () => {
    it("from a filesystem path (gif)", async (t) => {
      try {
        const sent = await bot.sendAnimation(GROUP_ID, PHOTO_GIF_PATH);
        MessageSchema.parse(sent);
        assert.ok(sent.animation || sent.document);
      } catch (err: unknown) {
        if (!isTelegramError(err)) throw err;
        softSkip(t, "chat does not permit GIFs/animations");
      }
    });
  });

  describe("sendVoice", () => {
    it("from a filesystem path", async () => {
      const sent = await bot.sendVoice(GROUP_ID, VOICE_PATH);
      MessageSchema.parse(sent);
      assert.ok(sent.voice);
    });
  });

  describe("sendVideoNote", () => {
    it("from a Buffer (skipped if Telegram rejects the format)", async (t) => {
      const buf = fs.readFileSync(VIDEO_PATH);
      let sent;
      try {
        sent = await bot.sendVideoNote(GROUP_ID, buf, {}, { filename: "video.mp4" });
      } catch (err: unknown) {
        if (!isTelegramError(err)) throw err;
        softSkip(t, "video_note rejected by Telegram (must be a square video)");
        return;
      }
      MessageSchema.parse(sent);
      // Telegram occasionally classifies non-square clips as plain video.
      // Either branch demonstrates the round-trip succeeded.
      assert.ok(sent.video_note || sent.video);
    });
  });

  describe("sendSticker", () => {
    it("from a filesystem path", async (t) => {
      try {
        const sent = await bot.sendSticker(GROUP_ID, STICKER_PATH);
        MessageSchema.parse(sent);
        assert.ok(sent.sticker);
      } catch (err: unknown) {
        if (!isTelegramError(err)) throw err;
        softSkip(t, "chat does not permit stickers");
      }
    });
  });

  describe("sendMediaGroup", () => {
    it("returns an array of Message", async () => {
      const sent = await bot.sendMediaGroup(GROUP_ID, [
        { type: "photo", media: PHOTO_PATH },
        { type: "photo", media: photoFileId },
      ]);
      assert.ok(Array.isArray(sent));
      assert.equal(sent.length, 2);
      sent.forEach((m) => MessageSchema.parse(m));
    });
  });

  // --- File metadata & downloads ---------------------------------------

  describe("getFile", () => {
    it("returns a TelegramFile that validates", async () => {
      const file = await bot.getFile(photoFileId);
      FileSchema.parse(file);
      assert.equal(file.file_id, photoFileId);
    });
  });

  describe("getFileLink", () => {
    it("returns an https URL pointing to the file path", async () => {
      const link = await bot.getFileLink(photoFileId);
      assert.match(link, /^https:\/\/api\.telegram\.org\/file\/bot/);
    });
  });

  describe("downloadFile", () => {
    it("writes the file under the destination directory", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tg-int-"));
      try {
        const filePath = await bot.downloadFile(photoFileId, dir);
        assert.ok(fs.statSync(filePath).size > 0);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe("getFileStream", () => {
    it("emits 'info' and streams the bytes", async () => {
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

  describe("forwardMessage", () => {
    it("forwards a single message", async () => {
      const source = await bot.sendMessage(GROUP_ID, `forward-source ${TIMESTAMP}`);
      const sent = await bot.forwardMessage(GROUP_ID, GROUP_ID, source.message_id);
      MessageSchema.parse(sent);
    });

    it("honours disable_notification and protect_content", async () => {
      const source = await bot.sendMessage(GROUP_ID, `fwd-opts ${TIMESTAMP}`);
      const forwarded = await bot.forwardMessage(GROUP_ID, GROUP_ID, source.message_id, {
        disable_notification: true,
        protect_content: true,
      });
      const msg = MessageSchema.parse(forwarded);
      assert.equal(typeof msg.message_id, "number");
      assert.notEqual(msg.message_id, source.message_id);
      assert.ok(msg.forward_origin, "expected forward_origin on a forwarded message");
    });
  });

  describe("forwardMessages", () => {
    it("forwards an array of message_ids (with disable_notification)", async (t) => {
      const a = (await bot.sendMessage(GROUP_ID, "fwd-1")).message_id;
      const b = (await bot.sendMessage(GROUP_ID, "fwd-2")).message_id;
      let results;
      try {
        results = await bot.forwardMessages(GROUP_ID, GROUP_ID, [a, b], {
          disable_notification: true,
        });
      } catch (err) {
        if (!isTelegramError(err)) throw err;
        softSkip(t, `forwardMessages rejected: ${err.message}`);
        return;
      }
      assert.ok(Array.isArray(results));
      assert.equal(results.length, 2);
      for (const r of results) {
        const id = MessageIdSchema.parse(r);
        assert.equal(typeof id.message_id, "number");
      }
    });
  });

  describe("copyMessage", () => {
    it("returns a MessageId", async () => {
      const source = await bot.sendMessage(GROUP_ID, `copy-source ${TIMESTAMP}`);
      const result = await bot.copyMessage(GROUP_ID, GROUP_ID, source.message_id);
      assert.equal(typeof result.message_id, "number");
    });

    it("honours caption, parse_mode, show_caption_above_media, reply_markup, disable_notification", async () => {
      const source = await bot.sendMessage(GROUP_ID, `copy-opts ${TIMESTAMP}`);
      const copied = await bot.copyMessage(GROUP_ID, GROUP_ID, source.message_id, {
        caption: "*copied* caption",
        parse_mode: "MarkdownV2",
        show_caption_above_media: true,
        disable_notification: true,
        reply_markup: {
          inline_keyboard: [[{ text: "open", url: "https://core.telegram.org/bots/api" }]],
        },
      });
      const id = MessageIdSchema.parse(copied);
      assert.equal(typeof id.message_id, "number");
      assert.notEqual(id.message_id, source.message_id);
    });
  });

  describe("copyMessages", () => {
    it("copies an array of message_ids (with disable_notification)", async (t) => {
      const a = (await bot.sendMessage(GROUP_ID, "cpy-1")).message_id;
      const b = (await bot.sendMessage(GROUP_ID, "cpy-2")).message_id;
      let results;
      try {
        results = await bot.copyMessages(GROUP_ID, GROUP_ID, [a, b], {
          disable_notification: true,
        });
      } catch (err) {
        if (!isTelegramError(err)) throw err;
        softSkip(t, `copyMessages rejected: ${err.message}`);
        return;
      }
      assert.ok(Array.isArray(results));
      assert.equal(results.length, 2);
      for (const r of results) {
        const id = MessageIdSchema.parse(r);
        assert.equal(typeof id.message_id, "number");
      }
    });
  });

  // --- Editing ----------------------------------------------------------

  describe("editMessageText", () => {
    it("updates a previously-sent message", async () => {
      const sent = await bot.sendMessage(GROUP_ID, `edit-me ${TIMESTAMP}`);
      const edited = await bot.editMessageText("edited!", {
        chat_id: GROUP_ID,
        message_id: sent.message_id,
      });
      assert.ok(edited === true || (typeof edited === "object" && (edited as { text?: string }).text === "edited!"));
    });

    it("accepts parse_mode MarkdownV2, link_preview_options and reply_markup", async () => {
      const sent = await bot.sendMessage(GROUP_ID, `md-edit-me ${TIMESTAMP}`);
      const edited = await bot.editMessageText(`*bold* _italic_ ${TIMESTAMP}`, {
        chat_id: GROUP_ID,
        message_id: sent.message_id,
        parse_mode: "MarkdownV2",
        link_preview_options: { is_disabled: true },
        reply_markup: { inline_keyboard: [[{ text: "open", callback_data: "open" }]] },
      });
      assert.ok(edited !== true, "expected a Message back when editing an owned message");
      const msg = MessageSchema.parse(edited);
      assert.ok(Array.isArray(msg.entities) && msg.entities.length > 0);
      assert.ok(msg.reply_markup);
    });

    it("accepts pre-built entities and a disabled link preview", async () => {
      const sent = await bot.sendMessage(GROUP_ID, `entities-edit ${TIMESTAMP}`);
      const text = "bold then plain";
      const edited = await bot.editMessageText(text, {
        chat_id: GROUP_ID,
        message_id: sent.message_id,
        entities: [{ type: "bold", offset: 0, length: 4 }],
        link_preview_options: { is_disabled: true },
      });
      assert.ok(edited !== true);
      const msg = MessageSchema.parse(edited);
      assert.equal(msg.text, text);
      assert.ok(
        Array.isArray(msg.entities) &&
          msg.entities.some((e) => e.type === "bold" && e.offset === 0 && e.length === 4),
      );
    });
  });

  describe("editMessageCaption", () => {
    it("updates a photo caption", async () => {
      const sent = await bot.sendPhoto(GROUP_ID, photoFileId, { caption: "before" });
      const edited = await bot.editMessageCaption("after", {
        chat_id: GROUP_ID,
        message_id: sent.message_id,
      });
      assert.ok(edited === true || typeof edited === "object");
    });

    it("accepts caption, parse_mode, show_caption_above_media and reply_markup", async () => {
      const sent = await bot.sendPhoto(GROUP_ID, photoFileId, { caption: "before" });
      const edited = await bot.editMessageCaption("*after* caption", {
        chat_id: GROUP_ID,
        message_id: sent.message_id,
        parse_mode: "MarkdownV2",
        show_caption_above_media: true,
        reply_markup: { inline_keyboard: [[{ text: "cap", callback_data: "cap" }]] },
      });
      assert.ok(edited !== true, "expected a Message back when editing an owned photo");
      const msg = MessageSchema.parse(edited);
      assert.equal(msg.caption, "after caption");
      assert.ok(
        Array.isArray(msg.caption_entities) && msg.caption_entities.some((e) => e.type === "bold"),
      );
      assert.equal(msg.show_caption_above_media, true);
      assert.ok(msg.reply_markup);
    });
  });

  describe("editMessageReplyMarkup", () => {
    it("updates an inline keyboard", async () => {
      const sent = await bot.sendMessage(GROUP_ID, "with-buttons", {
        reply_markup: { inline_keyboard: [[{ text: "a", callback_data: "a" }]] },
      });
      const edited = await bot.editMessageReplyMarkup(
        { inline_keyboard: [[{ text: "b", callback_data: "b" }]] },
        { chat_id: GROUP_ID, message_id: sent.message_id },
      );
      assert.ok(edited !== true);
      const msg = MessageSchema.parse(edited);
      assert.ok(msg.reply_markup);
      assert.equal(msg.reply_markup!.inline_keyboard?.[0]?.[0]?.text, "b");
    });
  });

  describe("editMessageMedia", () => {
    it("replaces a photo with a new file via attach://", async () => {
      // Start from a different photo so the edit actually changes the message
      // (Telegram rejects no-op edits with "message is not modified").
      const sent = await bot.sendPhoto(GROUP_ID, STICKER_THUMB_PATH);
      const edited = await bot.editMessageMedia(
        { type: "photo", media: `attach://${PHOTO_PATH}` },
        { chat_id: GROUP_ID, message_id: sent.message_id },
      );
      assert.ok(edited === true || typeof edited === "object");
    });

    it("replaces a photo using a Telegram file_id (with caption + reply_markup)", async () => {
      // Send a different image first so swapping in `photoFileId` is a real change.
      const sent = await bot.sendPhoto(GROUP_ID, STICKER_THUMB_PATH);
      const edited = await bot.editMessageMedia(
        { type: "photo", media: photoFileId, caption: "swapped" },
        {
          chat_id: GROUP_ID,
          message_id: sent.message_id,
          reply_markup: { inline_keyboard: [[{ text: "m", callback_data: "m" }]] },
        },
      );
      assert.ok(edited !== true, "expected a Message back when editing owned media");
      const msg = MessageSchema.parse(edited);
      assert.ok(msg.photo && msg.photo.length > 0);
      assert.equal(msg.caption, "swapped");
    });
  });

  describe("editMessageLiveLocation", () => {
    it("edits then stops a live location (tolerates ETELEGRAM)", async (t) => {
      let sent;
      try {
        sent = await bot.sendLocation(GROUP_ID, 47.5351072, -52.7508537, { live_period: 120 });
      } catch (err) {
        if (!isTelegramError(err)) throw err;
        softSkip(t, `live location unsupported in this chat: ${err.message}`);
        return;
      }
      MessageSchema.parse(sent);

      try {
        const moved = await bot.editMessageLiveLocation(48.0, -53.0, {
          chat_id: GROUP_ID,
          message_id: sent.message_id,
          horizontal_accuracy: 10,
          heading: 90,
          proximity_alert_radius: 200,
          reply_markup: { inline_keyboard: [[{ text: "where", callback_data: "where" }]] },
        });
        assert.ok(moved !== true);
        const movedMsg = MessageSchema.parse(moved);
        assert.ok(movedMsg.location);

        const stopped = await bot.stopMessageLiveLocation({
          chat_id: GROUP_ID,
          message_id: sent.message_id,
        });
        assert.ok(stopped === true || typeof stopped === "object");
      } catch (err) {
        if (!isTelegramError(err)) throw err;
        softSkip(t, `editing/stopping live location refused: ${err.message}`);
      }
    });
  });

  // --- Deleting & reactions --------------------------------------------

  describe("deleteMessage", () => {
    it("removes a message", async () => {
      const sent = await bot.sendMessage(GROUP_ID, "to-delete");
      const ok = await bot.deleteMessage(GROUP_ID, sent.message_id);
      assert.equal(ok, true);
    });
  });

  describe("deleteMessages", () => {
    it("removes a batch", async () => {
      const a = (await bot.sendMessage(GROUP_ID, "to-delete-1")).message_id;
      const b = (await bot.sendMessage(GROUP_ID, "to-delete-2")).message_id;
      const ok = await bot.deleteMessages(GROUP_ID, [a, b]);
      assert.equal(ok, true);
    });
  });

  describe("setMessageReaction", () => {
    it("adds a reaction", async () => {
      const sent = await bot.sendMessage(GROUP_ID, "react-to-me");
      const ok = await bot.setMessageReaction(GROUP_ID, sent.message_id, {
        reaction: [{ type: "emoji", emoji: "👍" }],
      });
      assert.equal(ok, true);
    });
  });

  describe("deleteMessageReaction", () => {
    it("removes the bot's reaction", async () => {
      const sent = await bot.sendMessage(GROUP_ID, "react-then-undo");
      await bot.setMessageReaction(GROUP_ID, sent.message_id, {
        reaction: [{ type: "emoji", emoji: "👍" }],
      });
      // The bot's own reaction is a user reaction, so it must be addressed by
      // user_id. Requires the bot to hold the can_delete_messages admin right.
      const ok = await bot.deleteMessageReaction(GROUP_ID, sent.message_id, { user_id: botUserId });
      assert.equal(ok, true);
    });
  });

  describe("deleteAllMessageReactions", () => {
    it("clears chat-wide reactions added by the bot", async () => {
      const sent = await bot.sendMessage(GROUP_ID, "clear-all-reactions");
      await bot.setMessageReaction(GROUP_ID, sent.message_id, {
        reaction: [{ type: "emoji", emoji: "🔥" }],
      });
      const ok = await bot.deleteAllMessageReactions(GROUP_ID, { user_id: botUserId });
      assert.equal(ok, true);
    });
  });

  describe("stopPoll", () => {
    it("stops a previously-sent poll (skipped if chat disallows polls)", async (t) => {
      let sentMessageId: number;
      try {
        const sent = await bot.sendPoll(GROUP_ID, "stoppable?", [{ text: "yes" }, { text: "no" }]);
        sentMessageId = sent.message_id;
      } catch (err: unknown) {
        if (!isTelegramError(err)) throw err;
        softSkip(t, "chat does not permit polls");
        return;
      }
      try {
        const stopped = await bot.stopPoll(GROUP_ID, sentMessageId);
        PollSchema.parse(stopped);
      } catch (err: unknown) {
        if (!isTelegramError(err)) throw err;
        // Telegram rejects stopPoll on polls the bot didn't create or that
        // are otherwise un-stoppable in this chat. The roundtrip above
        // already proved the wire format works.
        softSkip(t, "poll could not be stopped by the bot in this chat");
      }
    });
  });

  // --- Chat info / membership ------------------------------------------

  describe("getChat", () => {
    it("returns a Chat object", async () => {
      const chat = await bot.getChat(GROUP_ID);
      ChatSchema.parse(chat);
      assert.equal(chat.id, GROUP_ID);
    });
  });

  describe("getChatMember", () => {
    it("returns a ChatMember", async () => {
      const member = await bot.getChatMember(GROUP_ID, USER_ID);
      ChatMemberSchema.parse(member);
    });
  });

  describe("getChatAdministrators", () => {
    it("returns an Array (empty in private chats)", async () => {
      try {
        const admins = await bot.getChatAdministrators(GROUP_ID);
        assert.ok(Array.isArray(admins));
      } catch (err: unknown) {
        // Available only for groups/supergroups — soft pass in a private chat.
        if (!isTelegramError(err)) throw err;
      }
    });

    it("accepts the return_bots:true option and returns an Array", async () => {
      try {
        const admins = await bot.getChatAdministrators(GROUP_ID, { return_bots: true });
        assert.ok(Array.isArray(admins));
      } catch (err: unknown) {
        if (!isTelegramError(err)) throw err;
      }
    });
  });

  describe("getChatMemberCount", () => {
    it("returns an Integer (or rejects on private chats)", async () => {
      try {
        const count = await bot.getChatMemberCount(GROUP_ID);
        assert.equal(typeof count, "number");
      } catch (err: unknown) {
        if (!isTelegramError(err)) throw err;
      }
    });
  });

  describe("getUserProfilePhotos", () => {
    it("returns a UserProfilePhotos object", async () => {
      const photos = await bot.getUserProfilePhotos(USER_ID);
      UserProfilePhotosSchema.parse(photos);
      assert.equal(typeof photos.total_count, "number");
    });

    it("accepts offset/limit", async () => {
      const photos = await bot.getUserProfilePhotos(USER_ID, { offset: 0, limit: 1 });
      UserProfilePhotosSchema.parse(photos);
      assert.equal(typeof photos.total_count, "number");
      assert.ok(Array.isArray(photos.photos));
      // limit:1 means at most one photo set is returned (Telegram may return 0).
      assert.ok(photos.photos.length <= 1);
    });
  });

  describe("getUserChatBoosts", () => {
    it("returns boosts or is refused by a non-boost chat", async () => {
      try {
        const boosts = await bot.getUserChatBoosts(GROUP_ID, USER_ID);
        assert.ok(boosts);
        assert.ok(Array.isArray(boosts.boosts));
      } catch (err: unknown) {
        // Many chats do not support boosts (e.g. basic groups) — tolerate.
        if (!isTelegramError(err)) throw err;
      }
    });
  });

  // --- Chat configuration (mutations are captured & restored) ----------

  describe("setChatTitle", () => {
    let original: string | undefined;

    before(async () => {
      original = (await bot.getChat(GROUP_ID)).title;
    });

    after(async () => {
      if (original) {
        await bot.setChatTitle(GROUP_ID, original).catch((err) => {
          if (!isTelegramError(err)) throw err;
        });
      }
    });

    it("sets a unique title and getChat reflects it", async () => {
      const newTitle = `ntba-test ${TIMESTAMP}`;
      try {
        const ok = await bot.setChatTitle(GROUP_ID, newTitle);
        assert.equal(ok, true);
        await sleep(1100);
        const chat = await bot.getChat(GROUP_ID);
        assert.equal(chat.title, newTitle);
      } catch (err) {
        if (!isTelegramError(err)) throw err;
      }
    });
  });

  describe("setChatDescription", () => {
    let original: string;

    before(async () => {
      original = (await bot.getChat(GROUP_ID)).description ?? "";
    });

    after(async () => {
      await bot.setChatDescription(GROUP_ID, original).catch((err) => {
        if (!isTelegramError(err)) throw err;
      });
    });

    it("sets a description and getChat reflects it", async () => {
      const newDescription = `ntba integration test description ${TIMESTAMP}`;
      try {
        const ok = await bot.setChatDescription(GROUP_ID, newDescription);
        assert.equal(ok, true);
        await sleep(1100);
        const chat = await bot.getChat(GROUP_ID);
        assert.equal(chat.description, newDescription);
      } catch (err) {
        if (!isTelegramError(err)) throw err;
      }
    });
  });

  describe("setChatPermissions", () => {
    let original: ChatPermissions | undefined;

    before(async () => {
      original = (await bot.getChat(GROUP_ID)).permissions;
    });

    after(async () => {
      if (original) {
        await bot.setChatPermissions(GROUP_ID, original).catch((err) => {
          if (!isTelegramError(err)) throw err;
        });
      }
    });

    it("applies a modified ChatPermissions object", async () => {
      const modified: ChatPermissions = {
        ...(original ?? {}),
        can_send_messages: true,
        can_send_polls: false,
        can_add_web_page_previews: false,
      };
      try {
        const ok = await bot.setChatPermissions(GROUP_ID, modified);
        assert.equal(ok, true);
        await sleep(1100);
        const chat = await bot.getChat(GROUP_ID);
        if (chat.permissions) {
          const parsed = ChatPermissionsSchema.parse(chat.permissions);
          assert.equal(parsed.can_send_polls, false);
          assert.equal(parsed.can_add_web_page_previews, false);
        }
      } catch (err) {
        if (!isTelegramError(err)) throw err;
      }
    });
  });

  describe("pinChatMessage", () => {
    it("pins (with disable_notification) then unpins via unpinChatMessage", async () => {
      const sent = await bot.sendMessage(GROUP_ID, `pin me ${TIMESTAMP}`);
      assert.equal(typeof sent.message_id, "number");
      await sleep(1100);
      try {
        const pinned = await bot.pinChatMessage(GROUP_ID, sent.message_id, {
          disable_notification: true,
        });
        assert.equal(pinned, true);
        await sleep(1100);
        const unpinned = await bot.unpinChatMessage(GROUP_ID, { message_id: sent.message_id });
        assert.equal(unpinned, true);
      } catch (err) {
        if (!isTelegramError(err)) throw err;
      }
    });
  });

  describe("unpinAllChatMessages", () => {
    it("returns true", async () => {
      try {
        const ok = await bot.unpinAllChatMessages(GROUP_ID);
        assert.equal(ok, true);
      } catch (err) {
        if (!isTelegramError(err)) throw err;
      }
    });
  });

  describe("deleteChatPhoto", () => {
    it("returns true (tolerated when the chat has no photo)", async () => {
      try {
        const ok = await bot.deleteChatPhoto(GROUP_ID);
        assert.equal(ok, true);
      } catch (err) {
        // CHAT_NOT_MODIFIED / no photo set / not allowed → ETELEGRAM is fine.
        if (!isTelegramError(err)) throw err;
      }
    });
  });

  describe("setChatPhoto", () => {
    it("is skipped — replacing the group avatar is irreversible", (t) => {
      // setChatPhoto replaces the group's avatar and there is no API to read
      // back the original image bytes, so the change cannot be cleanly reverted
      // to the prior photo. Per the suite's policy of never performing
      // irreversible mutations, this method is left to unit tests.
      softSkip(t, "setChatPhoto is irreversible — original photo bytes can't be restored");
    });
  });

  // --- Member moderation (tolerate, never harm a real user) -------------
  //
  // Every method below acts on USER_ID, a REAL user and very likely the chat
  // owner. Telegram REFUSES to ban/restrict/promote the owner (and the bot
  // lacks can_promote_members), surfacing an ETELEGRAM error — which is the
  // EXPECTED, asserted-as-tolerated outcome. On the off chance a call succeeds,
  // the mutation is reversed immediately so no real member is left moderated.

  describe("promoteChatMember", () => {
    it("bot lacks can_promote_members → ETELEGRAM (tolerated)", async (t) => {
      try {
        const result = await bot.promoteChatMember(GROUP_ID, USER_ID, {
          can_change_info: true,
          can_pin_messages: true,
        });
        assert.equal(typeof result, "boolean");
        // Extremely unlikely. If it somehow succeeds, clear the rights we set.
        await bot
          .promoteChatMember(GROUP_ID, USER_ID, { can_change_info: false, can_pin_messages: false })
          .catch(() => undefined);
        softSkip(t, "promoteChatMember unexpectedly succeeded; rights cleared again.");
      } catch (err) {
        if (!isTelegramError(err)) throw err;
      }
    });
  });

  describe("restrictChatMember", () => {
    it("ChatPermissions + until_date → ETELEGRAM for owner (tolerated)", async (t) => {
      const restrictedPermissions: ChatPermissions = {
        can_send_messages: false,
        can_send_polls: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false,
      };
      /** Permissions that fully un-restrict a member — used to reverse any restriction. */
      const FULL_PERMISSIONS: ChatPermissions = {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
        can_change_info: true,
        can_invite_users: true,
        can_pin_messages: true,
      };
      // until_date < 30s or > 366d is treated by Telegram as "forever"; use ~60s.
      const untilDate = Math.floor(Date.now() / 1000) + 60;
      try {
        const result = await bot.restrictChatMember(GROUP_ID, USER_ID, restrictedPermissions, {
          until_date: untilDate,
          use_independent_chat_permissions: true,
        });
        assert.equal(typeof result, "boolean");
        // Restriction unexpectedly applied to a real member — restore immediately.
        await bot.restrictChatMember(GROUP_ID, USER_ID, FULL_PERMISSIONS).catch(() => undefined);
        softSkip(t, "restrictChatMember unexpectedly succeeded; full permissions restored.");
      } catch (err) {
        if (!isTelegramError(err)) throw err;
      }
    });
  });

  describe("banChatMember", () => {
    it("ban (until_date / revoke_messages) then unbanChatMember → ETELEGRAM for owner (tolerated)", async (t) => {
      const untilDate = Math.floor(Date.now() / 1000) + 60;
      try {
        const banned = await bot.banChatMember(GROUP_ID, USER_ID, {
          until_date: untilDate,
          revoke_messages: false,
        });
        assert.equal(typeof banned, "boolean");
        // A real member was banned — undo it right away.
        const unbanned = await bot.unbanChatMember(GROUP_ID, USER_ID, { only_if_banned: true });
        assert.equal(typeof unbanned, "boolean");
        softSkip(t, "banChatMember unexpectedly succeeded; member unbanned again.");
      } catch (err) {
        if (!isTelegramError(err)) throw err;
      }
    });
  });

  describe("banChatSenderChat", () => {
    it("no real sender chat available → ETELEGRAM (tolerated)", async (t) => {
      // We have no genuine channel/sender-chat to ban. Try a dummy id and accept
      // the inevitable ETELEGRAM rejection; on the off chance it works, undo it.
      const dummySenderChatId = -1_000_000_000_000;
      try {
        const banned = await bot.banChatSenderChat(GROUP_ID, dummySenderChatId);
        assert.equal(typeof banned, "boolean");
        await bot.unbanChatSenderChat(GROUP_ID, dummySenderChatId).catch(() => undefined);
        softSkip(t, "banChatSenderChat unexpectedly succeeded with dummy id; reversed.");
      } catch (err) {
        if (!isTelegramError(err)) throw err;
      }
    });
  });

  describe("setChatAdministratorCustomTitle", () => {
    it("target not promoted by this bot → ETELEGRAM (tolerated)", async (t) => {
      try {
        const result = await bot.setChatAdministratorCustomTitle(GROUP_ID, USER_ID, "Test Title");
        assert.equal(typeof result, "boolean");
        await bot.setChatAdministratorCustomTitle(GROUP_ID, USER_ID, "").catch(() => undefined);
        softSkip(t, "setChatAdministratorCustomTitle unexpectedly succeeded; title cleared.");
      } catch (err) {
        if (!isTelegramError(err)) throw err;
      }
    });
  });

  // --- Chat invite links (group/supergroup-only) -----------------------

  describe("createChatInviteLink", () => {
    it("creates, edits and revokes a link (round-trip)", async (t) => {
      let created: { invite_link: string };
      try {
        created = await bot.createChatInviteLink(GROUP_ID, { name: `link-${TIMESTAMP}` });
      } catch (err: unknown) {
        if (!isTelegramError(err)) throw err;
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

    it("accepts name + expire_date + member_limit", async (t) => {
      const name = `inv-${TIMESTAMP}-a`;
      const expireDate = Math.floor(Date.now() / 1000) + 3600;
      const memberLimit = 7;
      let link;
      try {
        link = await bot.createChatInviteLink(GROUP_ID, {
          name,
          expire_date: expireDate,
          member_limit: memberLimit,
        });
      } catch (err: unknown) {
        if (!isTelegramError(err)) throw err;
        softSkip(t, "createChatInviteLink refused by this chat/bot");
        return;
      }
      createdLinks.add(link.invite_link);
      ChatInviteLinkSchema.parse(link);
      assert.equal(typeof link.invite_link, "string");
      assert.equal(link.name, name);
      assert.equal(link.expire_date, expireDate);
      assert.equal(link.member_limit, memberLimit);
      assert.equal(link.creates_join_request, false);
      assert.equal(link.is_revoked, false);
    });

    it("accepts creates_join_request (exclusive of member_limit)", async (t) => {
      const name = `inv-${TIMESTAMP}-b`;
      let link;
      try {
        link = await bot.createChatInviteLink(GROUP_ID, { name, creates_join_request: true });
      } catch (err: unknown) {
        if (!isTelegramError(err)) throw err;
        softSkip(t, "createChatInviteLink (join request) refused by this chat/bot");
        return;
      }
      createdLinks.add(link.invite_link);
      ChatInviteLinkSchema.parse(link);
      assert.equal(link.name, name);
      assert.equal(link.creates_join_request, true);
      assert.equal(link.member_limit, undefined);
    });
  });

  describe("editChatInviteLink", () => {
    it("reflects changed name/expire_date/member_limit", async (t) => {
      let created;
      try {
        created = await bot.createChatInviteLink(GROUP_ID, {
          name: `inv-${TIMESTAMP}-c`,
          member_limit: 3,
        });
      } catch (err: unknown) {
        if (!isTelegramError(err)) throw err;
        softSkip(t, "createChatInviteLink refused by this chat/bot");
        return;
      }
      createdLinks.add(created.invite_link);
      ChatInviteLinkSchema.parse(created);

      const newName = `inv-${TIMESTAMP}-c-edited`;
      const newExpire = Math.floor(Date.now() / 1000) + 7200;
      const newLimit = 11;
      const edited = await bot.editChatInviteLink(GROUP_ID, created.invite_link, {
        name: newName,
        expire_date: newExpire,
        member_limit: newLimit,
      });
      ChatInviteLinkSchema.parse(edited);
      assert.equal(edited.invite_link, created.invite_link);
      assert.equal(edited.name, newName);
      assert.equal(edited.expire_date, newExpire);
      assert.equal(edited.member_limit, newLimit);
    });
  });

  describe("exportChatInviteLink", () => {
    it("returns the primary link url as a string", async (t) => {
      let url;
      try {
        url = await bot.exportChatInviteLink(GROUP_ID);
      } catch (err: unknown) {
        if (!isTelegramError(err)) throw err;
        softSkip(t, "exportChatInviteLink refused by this chat/bot");
        return;
      }
      assert.equal(typeof url, "string");
      assert.ok(url.length > 0, "expected a non-empty invite url");
      // The exported (primary) link is regenerated by this call; it is not one
      // of ours to revoke, so it is intentionally not tracked for cleanup.
    });
  });

  describe("createChatSubscriptionInviteLink", () => {
    it("requires Stars subscriptions (tolerated)", async (t) => {
      // 30 days, in seconds, is the only currently-allowed subscription period.
      const subscriptionPeriod = 2_592_000;
      const subscriptionPrice = 1; // Telegram Stars
      let link;
      try {
        link = await bot.createChatSubscriptionInviteLink(
          GROUP_ID,
          subscriptionPeriod,
          subscriptionPrice,
          { name: `sub-${TIMESTAMP}` },
        );
      } catch (err: unknown) {
        if (!isTelegramError(err)) throw err;
        softSkip(t, "subscription invite links require Telegram Stars subscriptions");
        return;
      }
      createdLinks.add(link.invite_link);
      ChatInviteLinkSchema.parse(link);
      assert.equal(typeof link.invite_link, "string");
      assert.equal(link.subscription_period, subscriptionPeriod);
      assert.equal(link.subscription_price, subscriptionPrice);
    });
  });

  // --- Callback queries -------------------------------------------------

  describe("answerCallbackQuery", () => {
    it("needs a live callback_query id (cannot synthesize)", (t) => {
      softSkip(
        t,
        "answerCallbackQuery requires a real callback_query id produced by a user " +
          "tapping an inline keyboard button; such an id cannot be synthesized in a " +
          "non-interactive integration run.",
      );
    });
  });

  // --- Bot self-management (idempotent operations only) ----------------

  describe("setMyCommands() / getMyCommands() / deleteMyCommands()", () => {
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
  });

  describe("setMyDescription / getMyDescription round-trip", () => {
    it("setMyDescription / getMyDescription round-trip", async () => {
      const original = (await bot.getMyDescription()).description;
      const sample = `desc-${TIMESTAMP}`;
      assert.equal(await bot.setMyDescription({ description: sample }), true);
      const updated = await bot.getMyDescription();
      assert.equal(updated.description, sample);
      // Restore.
      await bot.setMyDescription({ description: original });
    });
  });

  describe("setMyShortDescription / getMyShortDescription", () => {
    it("setMyShortDescription / getMyShortDescription round-trip", async () => {
      const original = (await bot.getMyShortDescription()).short_description;
      const sample = `short-${TIMESTAMP}`;
      assert.equal(await bot.setMyShortDescription({ short_description: sample }), true);
      const updated = await bot.getMyShortDescription();
      assert.equal(updated.short_description, sample);
      // Restore.
      await bot.setMyShortDescription({ short_description: original });
    });
  });

  // --- Stickers --------------------------------------------------------

  describe("getStickerSet", () => {
    it("returns a StickerSet for a known public set", async () => {
      const set = await bot.getStickerSet(STICKER_SET_NAME);
      StickerSetSchema.parse(set);
      assert.ok(set.stickers.length > 0);
    });
  });

  describe("getCustomEmojiStickers", () => {
    it("returns an Array", async () => {
      const stickers = await bot.getCustomEmojiStickers([CUSTOM_EMOJI_ID]);
      assert.ok(Array.isArray(stickers));
    });
  });

  // --- Text/reply listeners (in-process) -------------------------------

  describe("onText", () => {
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
  });

  describe("onReplyToMessage", () => {
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
});
