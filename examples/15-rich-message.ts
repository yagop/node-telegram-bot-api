/**
 * 15 - Rich messages (`sendRichMessage`).
 *
 * A rich message is a small formatted document - headings, paragraphs, quotes,
 * lists, buttons and media - not just entity-styled text. `RichMessageBuilder`
 * fluently assembles the `blocks` form of an `InputRichMessage`; `RichTextBuilder`
 * builds the recursive rich-text tree for any block's text (bold/italic/links/code,
 * nested freely); `richMessageButton` labels a button with that same rich text.
 * Each `.build()` returns the plain shape that drops straight into `rich_message`.
 *
 * Run: BOT_TOKEN=123:abc CHAT_ID=12345 bun examples/15-rich-message.ts
 */
import {
  Api,
  RichMessageBuilder,
  RichTextBuilder,
  richListItem,
  richMessageButton,
} from "node-telegram-bot-api";

const api = new Api(process.env.BOT_TOKEN!);
const chatId = Number(process.env.CHAT_ID ?? "0");

// A paragraph's text is itself rich: nest styled spans, links and inline code.
const intro = new RichTextBuilder()
  .plain("Shipped ")
  .bold("rich messages")
  .plain(" - build structured, formatted documents with ")
  .code("RichMessageBuilder")
  .plain(". See the ")
  .url("Bot API docs", "https://core.telegram.org/bots/api#sendrichmessage")
  .plain(".");

// Assemble the document block by block. Nested blocks (blockquote, list, ...)
// accept a callback builder, so the tree reads top-down.
const richMessage = new RichMessageBuilder()
  .heading("Release notes", 1)
  .paragraph(intro)
  .blockquote((b) => b.paragraph("No escaping. No hand-counted offsets."), "the changelog")
  .list([
    richListItem((b) => b.paragraph("Headings, paragraphs, quotes")),
    richListItem((b) => b.paragraph("Ordered/unordered lists"), { has_checkbox: true, is_checked: true }),
    richListItem((b) => b.paragraph("Buttons and media")),
  ])
  .buttons([
    richMessageButton("Open docs", { url: "https://core.telegram.org/bots/api", style: "primary" }),
    richMessageButton(new RichTextBuilder().bold("Star").plain(" on GitHub"), {
      url: "https://github.com/yagop/node-telegram-bot-api",
    }),
  ])
  .build();

if (chatId !== 0) {
  await api.sendRichMessage({ chat_id: chatId, rich_message: richMessage });
  console.log("Sent a rich message.");
}

// The `html` mode is a plain object - no builder needed. Use `media` (keyed by an
// id referenced from the HTML via tg://photo?id=...) to embed uploads.
if (chatId !== 0) {
  await api.sendRichMessage({
    chat_id: chatId,
    rich_message: { html: "<h1>Rich messages</h1><p>Also expressible as <b>HTML</b>.</p>" },
  });
}
