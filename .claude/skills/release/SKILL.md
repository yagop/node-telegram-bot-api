---
name: release
description: How to cut and publish a release of node-telegram-bot-api (version bump, CHANGELOG, docs, PR to master, npm publish, git tag, GitHub Release, optional Telegram announcement). Use whenever asked to release, publish a new version, bump the version, or "do the X.Y.Z release". Covers the exact step order, the CHANGELOG entry convention, the sanity gate, and the credential gotchas (read-only NPM_TOKEN, missing gh CLI, no create-release MCP tool).
---

# Releasing node-telegram-bot-api

End-to-end release flow. Replace `X.Y.Z` with the target version (example below uses `1.0.0`).
Releases ship from `master`; work happens on a short-lived `version/X.Y.Z` branch.

## 0. Orient first (don't assume)

```bash
git status                                   # must be clean
node -p "require('./package.json').version"  # current version
npm view node-telegram-bot-api dist-tags     # what 'latest' / 'next' point at
```

Decide the new version and whether it should become npm `latest` (a stable release does;
a prerelease like `-rc.0` should publish under a different tag with `--tag next`).

## 1. Branch

```bash
git checkout -b version/X.Y.Z
```

## 2. README + CHANGELOG

- **README** rarely needs changes (the version comes from an npm badge, not hard-coded). Only
  touch it if a documented fact changed.
- **CHANGELOG.md** must have an entry that matches the existing convention exactly. Every
  released version uses:

  ```
  ## [X.Y.Z][X.Y.Z] - YYYY-MM-DD
  ```

  with a matching link-def at the very bottom of the file:

  ```
  [X.Y.Z]:https://github.com/yagop/node-telegram-bot-api/releases/tag/vX.Y.Z
  ```

  and the `[Unreleased]` compare link bumped to the new tag:

  ```
  [Unreleased]:https://github.com/yagop/node-telegram-bot-api/compare/vX.Y.Z...master
  ```

  Use the actual release date (today), `- ` (ASCII hyphen, not an em dash), and keep an empty
  `## [Unreleased][Unreleased]` section at the top.

## 3. Bump version (both files, no git tag yet)

```bash
npm version X.Y.Z --no-git-tag-version
```

This updates `package.json` AND `package-lock.json` (root + `packages[""]`). Verify:

```bash
node -p "require('./package.json').version"
node -p "require('./package-lock.json').version"
```

## 4. Regenerate docs

```bash
bun run generate:docs
git diff --exit-code doc/api.md   # usually no diff if no method signatures changed
```

See the `generate-docs` skill for details. Commit `doc/api.md` only if it actually changed.

## 5. Sanity gate (must pass before publishing)

```bash
npm run typecheck            # src + test, strict
npm run test:bun:unit        # ~91 unit tests, no network/token
npm run build                # this is what `prepare` runs on publish - must succeed
```

`dist/` is gitignored (built on publish via `prepare`), so it is NOT committed.
See the `run-tests` skill for runner details.

## 6. Commit + push

Only three files change: `CHANGELOG.md`, `package.json`, `package-lock.json`. The repo's
release commits use the **bare version** as the message (e.g. `336ae2e 1.0.0-rc.0`):

```bash
git add CHANGELOG.md package.json package-lock.json
git commit -m "X.Y.Z"
git push -u origin version/X.Y.Z
```

## 7. PR to master, wait for green CI, merge

`gh` may not be available here, and the GitHub MCP toolset for this environment is read/list-only. Create/merge the PR via the GitHub web UI (or the GitHub REST API if you have a `GITHUB_TOKEN`).

1. Open a PR head=`version/X.Y.Z` base=`master`, title `X.Y.Z`.
2. Wait for all checks to pass. Expect: Typecheck, Unit tests (Node 20/22/24/26 + Bun), Build (dist); Integration is **skipped** on PRs (no secrets).
3. Merge the PR (merge commit).

## 8. Pull master

```bash
git checkout master && git pull origin master
node -p "require('./package.json').version"   # == X.Y.Z
```

## 9. npm publish

Auth from `NPM_TOKEN` (env). Write it without printing the value, dry-run first, then publish:

```bash
printf '//registry.npmjs.org/:_authToken=%s\n' "$NPM_TOKEN" > "$HOME/.npmrc"
npm whoami                 # should print: yagop
npm publish --dry-run      # inspect the tarball (expect README, LICENSE, dist/, package.json)
npm publish                # stable -> latest; for a prerelease add: --tag next
npm view node-telegram-bot-api version   # confirm == X.Y.Z
```

> ⚠️ **Read-only-token gotcha.** `npm whoami` succeeding does NOT mean the token can publish.
> If `npm publish` returns `E403 ... You may not perform that action with these credentials`
> (and `npm profile get` also 403s), the token is read-only / too narrowly scoped. A 403 is a
> clean failure - nothing was uploaded. Fix: use an npm **Automation** token, or a **Granular**
> token with *Read and write* that includes this package. If you can't get one, the maintainer
> publishes manually with their OTP: `! cd /workspace && npm publish`.

## 10. Tag the release

The CHANGELOG link-def points at `releases/tag/vX.Y.Z`, and every prior release has a matching
**annotated** tag. Tag the released `master` HEAD and push:

```bash
git tag -a vX.Y.Z -m "X.Y.Z" $(git rev-parse master)
git push origin vX.Y.Z
```

## 11. GitHub Release

There is **no create-release path via local tooling**: `gh` isn't installed, and the GitHub MCP
server only exposes **read-only** release tools (`get_latest_release`, `get_release_by_tag`,
`list_releases`) - no create/update. Two options:

- **REST API (needs a token).** If `GITHUB_TOKEN` is in the session env (a PAT with `repo`, or
  fine-grained with *Contents: write*), POST to the releases endpoint. Build the JSON body from
  a notes file so newlines/quotes are escaped safely (see snippet below). Note: setting the var
  in a separate terminal won't reach the session - it must be injected the same way `NPM_TOKEN`
  is. Body = the CHANGELOG `X.Y.Z` section verbatim (it's self-contained, no reference links),
  with a `compare/<prev>...vX.Y.Z` line appended. Use `make_latest: "true"`, `prerelease: false`.
- **Web UI (no token).** `https://github.com/yagop/node-telegram-bot-api/releases/new?tag=vX.Y.Z`
  -> title `X.Y.Z`, paste the notes, check *Set as the latest release*.

REST snippet (run with `node`, token from env, never printed):

```js
// create-release.mjs
import { readFile } from "node:fs/promises";
const token = process.env.GITHUB_TOKEN;
if (!token) { console.error("GITHUB_TOKEN not set"); process.exit(2); }
const body = await readFile(new URL("./RELEASE_NOTES.md", import.meta.url), "utf8");
const res = await fetch("https://api.github.com/repos/yagop/node-telegram-bot-api/releases", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ntba-release-script",
  },
  body: JSON.stringify({ tag_name: "vX.Y.Z", name: "X.Y.Z", body, make_latest: "true", prerelease: false }),
});
console.log(res.status, (await res.json()).html_url ?? "");
```

## 12. (Optional) Announce on Telegram

Draft a short channel post (emojis, Telegram markdown `*bold*` / inline `` `code` ``) with the
few most relevant changes + the migration link + `npm i node-telegram-bot-api`. Keep it short.

## Done-checklist

- [ ] `npm view node-telegram-bot-api version` == X.Y.Z (correct dist-tag)
- [ ] `master` at the release commit, version X.Y.Z
- [ ] annotated tag `vX.Y.Z` pushed (CHANGELOG link resolves)
- [ ] GitHub Release published, marked latest
