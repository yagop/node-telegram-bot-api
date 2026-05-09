/**
 * Minimal MIME lookup. Replaces the legacy `mime` dependency for the small
 * subset of types the Telegram Bot API actually cares about.
 *
 * For unknown extensions, callers should fall back to
 * `application/octet-stream`.
 */

const MIME_BY_EXT: Record<string, string> = {
  // Audio
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  wav: "audio/wav",
  flac: "audio/flac",
  // Video
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  // Image
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  tiff: "image/tiff",
  // Documents
  pdf: "application/pdf",
  zip: "application/zip",
  json: "application/json",
  txt: "text/plain",
  csv: "text/csv",
  html: "text/html",
  htm: "text/html",
  xml: "application/xml",
  // Telegram-specific
  tgs: "application/x-tgsticker",
  // Stream / fallback
  bin: "application/octet-stream",
  pem: "application/x-pem-file",
  crt: "application/x-x509-ca-cert",
};

export function lookupMime(filename: string): string | null {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return null;
  const ext = filename.slice(dot + 1).toLowerCase();
  return MIME_BY_EXT[ext] ?? null;
}
