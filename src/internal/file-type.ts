/**
 * Magic-byte sniffer for the file types Telegram bots most commonly upload.
 * Replaces the legacy `file-type` dependency. Best-effort; returns `null` if
 * the format isn't recognised.
 */

export interface DetectedType {
  ext: string;
  mime: string;
}

function startsWith(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buf[offset + i] !== bytes[i]) return false;
  }
  return true;
}

export function detectFileType(buf: Buffer): DetectedType | null {
  if (!buf || buf.length < 4) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47])) return { ext: "png", mime: "image/png" };
  // JPEG: FF D8 FF
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { ext: "jpg", mime: "image/jpeg" };
  // GIF: 47 49 46 38
  if (startsWith(buf, [0x47, 0x49, 0x46, 0x38])) return { ext: "gif", mime: "image/gif" };
  // WEBP: RIFF....WEBP
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && buf.length >= 12 && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8))
    return { ext: "webp", mime: "image/webp" };
  // BMP: 42 4D
  if (startsWith(buf, [0x42, 0x4d])) return { ext: "bmp", mime: "image/bmp" };
  // PDF: 25 50 44 46 2D
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { ext: "pdf", mime: "application/pdf" };
  // ZIP: 50 4B 03 04 (also docx/xlsx/pptx/odt etc.)
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) return { ext: "zip", mime: "application/zip" };
  // ID3 / MP3: 49 44 33 or FF FB
  if (startsWith(buf, [0x49, 0x44, 0x33]) || startsWith(buf, [0xff, 0xfb]))
    return { ext: "mp3", mime: "audio/mpeg" };
  // OGG: 4F 67 67 53
  if (startsWith(buf, [0x4f, 0x67, 0x67, 0x53])) return { ext: "ogg", mime: "audio/ogg" };
  // FLAC: 66 4C 61 43
  if (startsWith(buf, [0x66, 0x4c, 0x61, 0x43])) return { ext: "flac", mime: "audio/flac" };
  // WAV: RIFF....WAVE
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && buf.length >= 12 && startsWith(buf, [0x57, 0x41, 0x56, 0x45], 8))
    return { ext: "wav", mime: "audio/wav" };
  // MP4 / M4A / MOV: ....ftyp
  if (buf.length >= 12 && startsWith(buf, [0x66, 0x74, 0x79, 0x70], 4)) {
    const major = buf.slice(8, 12).toString("ascii");
    if (major.startsWith("M4A")) return { ext: "m4a", mime: "audio/mp4" };
    if (major.startsWith("qt")) return { ext: "mov", mime: "video/quicktime" };
    return { ext: "mp4", mime: "video/mp4" };
  }
  // WEBM / Matroska: 1A 45 DF A3
  if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) return { ext: "webm", mime: "video/webm" };

  return null;
}
