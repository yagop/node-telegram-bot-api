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

const result = spawnSync(
  process.execPath,
  ["--test", "--test-reporter=spec", "--import", "tsx", ...files],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
