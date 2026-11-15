/**
 * 08 - Uploading files.
 *
 * Ways to supply file bytes (all stream into the request - memory stays flat
 * no matter the file size):
 *   - `new InputFile(bytes, { filename })` - wrap in-memory bytes (Blob / Uint8Array).
 *     Web-standard, works on every runtime.
 *   - `new InputFile(stream)` / `new InputFile(() => stream)` - stream without buffering.
 *     A bare ReadableStream is one-shot (a failure surfaces instead of retrying); a
 *     factory opens a fresh stream per attempt, so the upload stays retryable.
 *   - `fromPath("./pic.jpg")` - stream a local file from disk (from the `/node` subpath).
 *   - `new MediaGroupBuilder()` - build a `sendMediaGroup` payload; uploaded files are wired
 *     in via `attach://` references for you.
 *   - `sendLivePhoto` - a still photo plus a short clip, each uploaded (or a file_id),
 *     never a URL.
 * A plain string in a file field is always treated as a `file_id` or URL.
 *
 * Run: BOT_TOKEN=123:abc CHAT_ID=12345 bun examples/08-uploads.ts
 */
import { Bot, InputFile, MediaGroupBuilder } from "node-telegram-bot-api";
import { fromPath } from "node-telegram-bot-api/node";

const bot = new Bot(process.env.BOT_TOKEN!);
const chatId = Number(process.env.CHAT_ID ?? "0");

if (chatId !== 0) {
  // 1) In-memory bytes → a tiny text document.
  const bytes = new TextEncoder().encode("hello from a Uint8Array\n");
  await bot.api.sendDocument({
    chat_id: chatId,
    document: new InputFile(bytes, { filename: "hello.txt", contentType: "text/plain" }),
    caption: "Sent from memory",
  });

  // 2) Proxy a remote file: fetch it and stream the response body straight
  //    into the upload - the bytes are never buffered, and because it is a
  //    factory, a transport retry simply re-fetches the source. (For a public
  //    URL you can also just pass the string, like the photo below; proxy the
  //    bytes yourself when the source needs auth headers or exceeds Telegram's
  //    URL-download size limits.)
  const remoteVideo = async () => {
    const res = await fetch("https://telegram.org/example/video.mp4");
    if (!res.ok || !res.body) throw new Error(`source fetch failed: ${res.status}`);
    return res.body;
  };
  await bot.api.sendVideo({
    chat_id: chatId,
    video: new InputFile(remoteVideo, { filename: "video.mp4", contentType: "video/mp4" }),
    caption: "Fetched and streamed through",
  });

  // 3) A replayable streaming upload from any source: the factory opens a
  //    fresh stream per attempt, so transport retries still work - use it for
  //    any large source you can re-read (disk, object storage, ...).
  const openStream = () =>
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("hello from a stream factory\n"));
        controller.close();
      },
    });
  await bot.api.sendDocument({
    chat_id: chatId,
    document: new InputFile(openStream, { filename: "streamed.txt", contentType: "text/plain" }),
    caption: "Streamed via a factory",
  });

  // 4) A photo by URL (a plain string is a file_id or URL, sent as-is).
  await bot.api.sendPhoto({
    chat_id: chatId,
    photo: "https://telegram.org/example/photo.jpg",
    caption: "Sent by URL",
  });

  // 5) A file from disk via `fromPath` (uncomment once you have a real path):
  //    const local = await fromPath("./avatar.png");
  //    await bot.api.sendPhoto({ chat_id: chatId, photo: local });
  void fromPath; // referenced so the import is exercised in the example

  // 6) An album. `new MediaGroupBuilder().build()` mints attach:// refs for any InputFile.
  const logo = await fetch("https://telegram.org/img/t_logo.png");
  const album = new MediaGroupBuilder()
    .photo({ media: "https://telegram.org/example/photo.jpg", caption: "First" })
    .video({ media: "https://telegram.org/example/video.mp4" })
    .photo({ media: new InputFile(logo.body!, { filename: "logo.png" }) }) // mixes uploads + URLs freely
    .build();
  await bot.api.sendMediaGroup({ chat_id: chatId, media: album });

  // 7) A live photo: a still (`photo`) plus a short clip (`live_photo`).
  //    - The clip must be at most 10 s and 10 MB; it is uploaded or passed by
  //      file_id (Telegram does not fetch live photo videos by URL).
  //    - Upload the still too: sent by URL, clients show a plain photo.
  //    Here both come from telegram.org's samples (same scene, 16:9). The 5 s
  //    sample GIF has to become an MP4 first, so let Telegram convert it:
  //    send it as an animation, download the MP4 via getFile, then delete
  //    the helper message. With your own clip, just upload it directly.
  //    Telegram reuses an identical still it already has, so a client may
  //    replay a clip that still was paired with earlier until its cache refreshes.
  const gifMsg = await bot.api.sendAnimation({
    chat_id: chatId,
    animation: "https://telegram.org/example/animation.gif",
  });
  if (!gifMsg.animation) throw new Error("expected an animation");
  const gifFile = await bot.api.getFile({ file_id: gifMsg.animation.file_id });
  await bot.api.deleteMessage({ chat_id: chatId, message_id: gifMsg.message_id });
  const clip = await fetch(
    `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${gifFile.file_path}`,
  );
  const still = await fetch("https://telegram.org/example/photo.jpg");
  await bot.api.sendLivePhoto({
    chat_id: chatId,
    live_photo: new InputFile(await clip.blob(), { filename: "live.mp4", contentType: "video/mp4" }),
    photo: new InputFile(await still.blob(), { filename: "still.jpg", contentType: "image/jpeg" }),
    caption: "Live photo: video + still",
  });

  console.log("Uploads sent.");
} else {
  console.log("Set CHAT_ID to run the uploads.");
}
