/**
 * 07 - Rich text via message entities.
 *
 * `EntityBuilder` is a fluent builder that accumulates text and tracks UTF-16
 * offsets for you, so you never hand-count entity positions or escape
 * Markdown/HTML. Its `.build()` returns `{ text, entities }` - both ready to drop
 * into `sendMessage`. `EntityType` is a typo-proof enum of every documented
 * entity kind.
 *
 * Run: BOT_TOKEN=123:abc CHAT_ID=12345 bun examples/07-formatting.ts
 */
import { Api, EntityBuilder, EntityType, json } from "node-telegram-bot-api";
import type { MessageEntity } from "node-telegram-bot-api";

const api = new Api(process.env.BOT_TOKEN!);
const chatId = Number(process.env.CHAT_ID ?? "0");

// Build styled text. Offsets/lengths are computed as you append.
const { text, entities } = new EntityBuilder()
  .bold("Release notes")
  .plain("\n\n")
  .plain("Shipped ")
  .italic("entity-based")
  .plain(" formatting - no escaping needed. Run ")
  .code("bun test")
  .plain(" and see the ")
  .link("changelog", "https://example.com/changelog")
  .plain(".")
  .build();

if (chatId !== 0) {
  await api.sendMessage({ chat_id: chatId, text, entities });
  console.log("Sent a formatted message.");
}

// You can also hand-build entities with `json()` + `EntityType` when you already
// know the offsets (e.g. mirroring text produced elsewhere).
const manualText = "spoiler ahead";
const manualEntities = json<MessageEntity[]>([
  { type: EntityType.Spoiler, offset: 0, length: manualText.length },
]);
if (chatId !== 0) {
  await api.sendMessage({ chat_id: chatId, text: manualText, entities: manualEntities });
}
