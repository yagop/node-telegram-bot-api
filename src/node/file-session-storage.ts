/**
 * `FileSessionStorage` - a durable, one-file-per-key `SessionStore` for the
 * session middleware (`./node`, the only folder allowed to import `node:*`).
 *
 * Persists each encoded session envelope as a file under a directory, so state
 * survives a process restart. It stores the string it is given verbatim -
 * encoding lives in the middleware's codec, not here - and is a single-host
 * store (one machine's disk); reach for Redis / Postgres across instances.
 * Writes are atomic (temp file + `rename`), so a crash mid-write never leaves a
 * half-written file; keys are `encodeURIComponent`-encoded into filenames,
 * which also neutralizes any `/` so a crafted key cannot escape the directory.
 * Cross-process writers to the same directory are last-writer-wins; within one
 * process the middleware's per-key lock already serializes updates.
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SessionStore } from "../core/session.js";

export type FileSessionStorageOptions = {
  /** Directory to hold the per-key files; created (recursively) by `init()`. */
  path: string;
};

export class FileSessionStorage implements SessionStore {
  private readonly dir: string;
  private ensured?: Promise<void>;

  constructor(options: FileSessionStorageOptions) {
    this.dir = options.path;
  }

  /**
   * Create the directory. Idempotent and memoized so concurrent writes issue one
   * mkdir; on failure the cache is cleared so a later call retries instead of
   * re-throwing a stale (possibly transient) rejection. `bot.init()` runs it at
   * startup, so a bad path fails at boot rather than on the first update.
   */
  init(): Promise<void> {
    if (this.ensured === undefined) {
      this.ensured = mkdir(this.dir, { recursive: true })
        .then(() => {})
        .catch((err: unknown) => {
          this.ensured = undefined;
          throw err;
        });
    }
    return this.ensured;
  }

  private fileFor(key: string): string {
    return join(this.dir, `${encodeURIComponent(key)}.json`);
  }

  async read(key: string): Promise<string | undefined> {
    try {
      return await readFile(this.fileFor(key), "utf8");
    } catch (err) {
      if ((err as { code?: string }).code === "ENOENT") return undefined;
      throw err;
    }
  }

  async write(key: string, value: string): Promise<void> {
    await this.init();
    const file = this.fileFor(key);
    const tmp = `${file}.${randomUUID()}.tmp`;
    await writeFile(tmp, value, "utf8");
    await rename(tmp, file); // atomic on the same filesystem: readers see old-or-new, never partial
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.fileFor(key));
    } catch (err) {
      if ((err as { code?: string }).code !== "ENOENT") throw err;
    }
  }
}
