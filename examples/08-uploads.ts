/**
 * 08 - Uploading files.
 *
 * Three ways to supply file bytes:
 *   - `new InputFile(bytes, { filename })` - wrap in-memory bytes (Blob / Uint8Array /
 *     ReadableStream). Web-standard, works on every runtime.
 *   - `fromPath("./pic.jpg")` - read a local file off disk (from the `/node` subpath).
 *   - `new MediaGroup()` - build a `sendMediaGroup` payload; uploaded files are wired
 *     in via `attach://` references for you.
 * A plain string in a file field is always treated as a `file_id` or URL.
 *
 * Run: BOT_TOKEN=123:abc CHAT_ID=12345 bun examples/08-uploads.ts
 */
import { Api, InputFile, MediaGroup } from "node-telegram-bot-api";
import { fromPath } from "node-telegram-bot-api/node";

const api = new Api(process.env.BOT_TOKEN!);
const chatId = Number(process.env.CHAT_ID ?? "0");

if (chatId !== 0) {
  // 1) In-memory bytes → a tiny text document.
  const bytes = new TextEncoder().encode("hello from a Uint8Array\n");
  await api.sendDocument({
    chat_id: chatId,
    document: new InputFile(bytes, { filename: "hello.txt", contentType: "text/plain" }),
    caption: "Sent from memory",
  });

  // 2) A photo by URL (a plain string is a file_id or URL, sent as-is).
  await api.sendPhoto({
    chat_id: chatId,
    photo: "https://picsum.photos/seed/ntba/600/400",
    caption: "Sent by URL",
  });

  // 3) A file from disk via `fromPath` (uncomment once you have a real path):
  //    const local = await fromPath("./avatar.png");
  //    await api.sendPhoto({ chat_id: chatId, photo: local });
  void fromPath; // referenced so the import is exercised in the example

  // 4) An album. `new MediaGroup().build()` mints attach:// refs for any InputFile.
  const album = new MediaGroup()
    .photo("https://picsum.photos/seed/a/400", { caption: "First" })
    .photo("https://picsum.photos/seed/b/400")
    .photo(new InputFile(bytes, { filename: "note.txt" })) // mixes uploads + URLs freely
    .build();
  await api.sendMediaGroup({ chat_id: chatId, media: album });

  console.log("Uploads sent.");
} else {
  console.log("Set CHAT_ID to run the uploads.");
}
