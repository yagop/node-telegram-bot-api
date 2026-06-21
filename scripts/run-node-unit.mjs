#!/usr/bin/env node
/**
 * Cross-platform unit-test launcher for the Node runner.
 *
 * Runs `node --test --import tsx` over `test/unit/*.test.ts`, but expands the
 * glob HERE rather than leaning on the shell or Node's `--test` globbing:
 *   - Windows cmd.exe/PowerShell do not expand `*.test.ts` (unlike bash), so a
 *     bare `node --test test/unit/*.test.ts` reaches Node as a literal path.
 *   - Node only learned to glob `--test` arguments in v21, so on Node 20 that
 *     literal path matches nothing ("Could not find ...*.test.ts") and the job
 *     fails - while Node 22 happens to pass. Expanding the glob ourselves and
 *     handing Node explicit file paths works on every supported Node and OS.
 *
 * Plain Node ESM, no dependencies. Exits with the test runner's status.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = new URL("../test/unit/", import.meta.url);
const files = readdirSync(dir)
  .filter((name) => name.endsWith(".test.ts"))
  .sort()
  .map((name) => fileURLToPath(new URL(name, dir)));

if (files.length === 0) {
  console.error("run-node-unit: no *.test.ts files found in test/unit");
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", "--import", "tsx", ...files], { stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
