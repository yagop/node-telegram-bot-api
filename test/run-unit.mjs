// Cross-platform unit-test runner.
// Windows cmd.exe doesn't expand globs, and `node --test` only added native
// glob support in v22 — so on Node 18/20 we resolve the file list ourselves
// and forward to `node --test --import tsx <files>`.
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const unitDir = join(here, "unit");

const files = readdirSync(unitDir)
  .filter((name) => name.endsWith(".test.ts"))
  .map((name) => join(unitDir, name));

const result = spawnSync(
  process.execPath,
  ["--test", "--test-reporter=spec", "--import", "tsx", ...files],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
