// Cross-platform integration-test runner.
// Mirrors run-unit.mjs: native `node --test` glob support only landed in v22,
// so we resolve the file list ourselves and forward to `node --test --import tsx`.
// Files run in a single process => sequentially, which keeps us under
// Telegram's per-chat rate limit (parallel files would 429 each other).
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const integrationDir = join(here, "integration");

const files = readdirSync(integrationDir)
  .filter((name) => name.endsWith(".test.ts"))
  .sort()
  .map((name) => join(integrationDir, name));

// Match the bun runner's per-test cap (test:bun:integration uses --timeout 300000).
// node:test defaults to NO timeout, so a flood-limited call would otherwise run
// until the HttpClient exhausts its retries. `--test-timeout` only exists on
// Node >= 20.18 / 22.7 / 23, so gate it to keep older engines working.
const [major, minor] = process.versions.node.split(".").map(Number);
const supportsTestTimeout =
  major >= 23 || (major === 22 && minor >= 7) || (major === 20 && minor >= 18);
const timeoutArgs = supportsTestTimeout ? ["--test-timeout=300000"] : [];

const result = spawnSync(
  process.execPath,
  ["--test", "--test-reporter=spec", ...timeoutArgs, "--import", "tsx", ...files],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
