/**
 * `FileSessionStorage` - a durable, one-file-per-key `SessionStore` for the
 * `session()` middleware (`./node`, the only folder allowed to import `node:*`).
 *
 * Persists each session envelope as a JSON file under a directory, so state
 * survives a process restart - the point of a durable store on serverless /
 * long-running Node. It is a single-host store (one machine's disk); reach for
 * Redis / DynamoDB across instances. Writes are atomic (temp file + `rename`),
 * so a crash mid-write never leaves a half-written, unparseable file; keys are
 * `encodeURIComponent`-encoded into filenames, which also neutralizes any `/`
 * so a crafted key cannot escape the directory.
 *
 * The store is value-agnostic (it persists whatever JSON the middleware hands
 * it), so it takes no type parameter: `new FileSessionStorage({ path })`.
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SessionStore } from "../core/session.js";

export type FileSessionStorageOptions = {
  /** Directory to hold the per-key JSON files; created (recursively) on first write. */
  path: string;
};

export class FileSessionStorage implements SessionStore {
  private readonly dir: string;
  private ensured?: Promise<unknown>;

  constructor(options: FileSessionStorageOptions) {
    this.dir = options.path;
  }

  private ensureDir(): Promise<unknown> {
    // Memoized so concurrent writes issue one mkdir, not one per call.
    return (this.ensured ??= mkdir(this.dir, { recursive: true }));
  }

  private fileFor(key: string): string {
    return join(this.dir, `${encodeURIComponent(key)}.json`);
  }

  async read<V>(key: string): Promise<V | undefined> {
    let raw: string;
    try {
      raw = await readFile(this.fileFor(key), "utf8");
    } catch (err) {
      if ((err as { code?: string }).code === "ENOENT") return undefined;
      throw err;
    }
    return JSON.parse(raw) as V;
  }

  async write(key: string, value: unknown): Promise<void> {
    await this.ensureDir();
    const file = this.fileFor(key);
    const tmp = `${file}.${randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(value), "utf8");
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
