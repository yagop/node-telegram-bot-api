# v2 implementation status (`feat/v2-core`)

Executes the [ARCHITECTURE.md](./ARCHITECTURE.md) plan on a clean branch. Built with multi-agent orchestration (one foundation + five parallel sub-agents, integrated and verified centrally).

## Status: green

```
npm run typecheck   # tsc --noEmit over src → 0 errors
npm run build       # tsc -p tsconfig.build.json → dist/{core,node,types}
bun test test/unit  # 15 pass / 0 fail
```

Toolchain: `bun` + `typescript` installed locally as devDeps. Node ≥18.

## What's implemented

| Area | Files | Notes |
|------|-------|-------|
| Foundation | `src/core/{errors,json,files}.ts` | `Json<T>` brand, `InputFile`/`FormPart`/`FormSink`, error hierarchy |
| Transport + client | `src/core/{transport,encode,client}.ts` | single `Api` class (ADR-001), `encodeForm` 3-branch (ADR-002/010/011), 429 retry, injectable `fetch` |
| Builders | `src/core/{markup,entities,media}.ts` | `InlineKeyboard`, `fmt()`/`EntityBuilder`, `mediaGroup()` → `FormPart` |
| Dispatch | `src/core/{compose,context,sources,bot,webhook}.ts` | middleware, `Context`, `longPoll` generator, `webhookCallback` |
| Adapters | `src/core/server.ts`, `src/node/*` | Express/Next mounts (web-standard); `fromPath`, `createWebhookServer` (Node) |
| Packaging | `package.json` exports, `tsconfig*` | subpath exports `.` / `./node` / `./types` (ADR-009) |
| Types | `src/types/v2.ts` | curated, hand-authored excerpt (9 methods) — the active wired surface |
| Generator (bonus) | `scripts/schemas-to-v2.ts`, `src/types/generated-v2.ts` | **180 methods**, 25-variant discriminated `Update`, structural `Json<T>` wrapping — produced offline from `schemas.ts` (network to core.telegram.org is blocked in this env) |
| Examples | `examples/v2/*` | polling, Cloudflare Worker, Express + fs upload |
| Tests | `test/unit/*.test.ts` | encode/attach, builders, Api round-trip + error mapping, longPoll, dispatch, webhook, node subpath |

## Decisions exercised by the build

- **ADR-001** single `Api` class, concrete single-arg methods, no Proxy.
- **ADR-002** structured args are branded `Json<T>` from builders/`json()`; the pipeline serializes nothing (`encodeForm` only attaches files + writes strings) — asserted by tests.
- **ADR-010/011** uniform form encoding; `InputFile` → multipart part; `mediaGroup` → `attach://` refs + parts — asserted by tests.
- **ADR-005/009** zero `node:*` in `src/core`; Node-only code isolated under `src/node`.

## Remaining (per plan §9)

- **Wire the full surface:** `generated-v2.ts` holds all 180 methods; swap the curated `v2.ts` for it and generate the concrete `Api` methods (currently 9 are hand-written; `api.call(method, params)` already covers any method generically).
- **Generator online path:** when core.telegram.org is reachable, extend `api-parser.ts` to emit the v2 shapes directly (the offline `schemas-to-v2.ts` is the fallback).
- **CI lint** forbidding `node:` under `src/core`; bundle-size check; edge deploy validation; live integration suite; v1→v2 migration cheatsheet.
- The legacy `examples/*` (v1) and `src/types/schemas.ts` are retained for reference/generation and are not part of the v2 build.
