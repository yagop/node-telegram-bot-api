# Actionables — adversarial review of `ARCHITECTURE.md`

**Source:** balanced red-team audit of `redesign/ARCHITECTURE.md` (2026-06-15), grounded in the v2 implementation.
**Legend:** `[x]` done · severity **H/M/L** · each item names the finding, the concrete change, and a done-when.

> **Status — all 15 items executed (2026-06-15).** A1 decision: **keep model E and document the justification** (added a "Why E over D" subsection; no serialization-model switch). Code fixes (A2, M2, M3, M5, M6) implemented; docs (A1, A3, A4, M1, M4, L1–L5) updated. Verified by `npm run check`: `tsc --strict` + Node-isolation lint (now also globals) + edge-bundle gate + 62 unit tests, all green.

---

## High

- [x] **A1 — Re-decide ADR-002 (E vs D); fix the DX regression.** (finding 1)
  The decision table rates option D (objects/builders accepted; one `JSON.stringify` in the encoder) above the chosen E on every axis except "pipeline purity." Either switch the default to D, or document an explicit, evidence-backed reason E wins despite its own table.
  *Action:* prototype D — let `encodeForm` accept builder instances / plain objects for structured fields and stringify once; keep `Json<T>`/`.build()` as an optional fast path. Compare call-site ergonomics on 5 real handlers.
  *Done when:* ADR-002 either flips to D or adds a "Why E over D" subsection that doesn't contradict its own scoring; structured call sites no longer require `.build()` on every field (if D).

- [x] **A2 — Resolve the `Json<T>` "always a string" vs `mediaGroup()` contradiction.** (finding 2)
  `media.ts:146` returns a `FormPart` object cast to a `Json<T>` string; ADR-002 says `Json<T>` is "still a string at runtime."
  *Action:* pick one — (a) give file-bearing composites their own param type (e.g. `MediaGroupInput`) instead of laundering a `FormPart` through `Json<T>`, so the string invariant holds; or (b) explicitly redefine `Json<T>` in ADR-002 as "string **or** form-part composite" and document the encoder's `isFormPart`-before-string ordering as a contract.
  *Done when:* no value typed `Json<T>` is a non-string at runtime, **or** the doc + types acknowledge the composite case; a test asserts the chosen invariant.

- [x] **A3 — Remove the false "tree-shake per method" claim (ADR-001 §6.1).** (finding 3)
  An instantiated 180-method class does not tree-shake per method.
  *Action:* delete the claim; if per-method dead-code-elimination is actually wanted, evaluate a free-function-per-method surface (`sendMessage(client, params)`) as an alternative and record the trade-off. Otherwise state plainly that the whole client ships regardless of methods used.
  *Done when:* §6.1 no longer lists per-method tree-shaking as a benefit of the class; bundle-size expectations are stated honestly.

- [x] **A4 — Reconcile the "single argument" hard constraint with cancellation (ADR-001 / §2).** (finding 4)
  Methods actually take `(params, signal?)`; §2 says "single argument."
  *Action:* amend the constraint to "a single **params** argument plus an optional trailing `AbortSignal`," and show the real signature in §6.1. Or move cancellation into `params` (`{ signal }`) if strict single-arg is non-negotiable.
  *Done when:* doc signatures match `src/core/api.ts`; the constraint text is satisfiable.

---

## Medium

- [x] **M1 — Fix the `AbortSignal.any` runtime-floor mismatch (§6.8).** (finding 5)
  Named API lands in Node 18.17/20.3; floor is "Node 18."
  *Action:* update §6.8 to describe the actual mechanism (`combineSignals` fallback + `AbortSignal.timeout`), or raise the documented floor to 18.17. Add a one-line runtime-support matrix (Node 18.17+, Bun, Deno, Workers) and the minimum each web API needs.
  *Done when:* the doc names only APIs available at the stated floor; matrix present.

- [x] **M2 — Design the long-poll error policy + retry strategy (ADR-004).** (finding 6a/6c)
  `longpoll.ts:47` rethrows on any non-429 error, killing the loop; ADR-004 promised an "explicit opt-in error policy" that doesn't exist.
  *Action:* specify and implement backoff-with-resume for transient network/5xx errors in `longPoll` (configurable: max retries, base delay, jitter, fatal-vs-transient classification); extend transport retry beyond 429 to network/5xx.
  *Done when:* a simulated transient fetch failure does not terminate a polling bot; policy is documented and unit-tested.

- [x] **M3 — Add proactive flood/rate-limit control (finding 6b).**
  Only reactive 429 retry exists; v1's throttling was dropped.
  *Action:* provide an opt-in rate-limit middleware or transport queue (global ~30 msg/s + per-chat), referenced from §10's concurrency open question.
  *Done when:* a documented opt-in throttle exists with a test; §10 updated.

- [x] **M4 — Correct ADR-010's rationale (finding 7).**
  "File uploads are common" mis-frames the majority traffic (text/keyboard/inline/notification bots rarely upload).
  *Action:* rewrite the rationale to acknowledge the file-less common case; tie the uniform-encoding choice to ADR-002's outcome rather than to upload frequency. (Largely moot if A1 lands.)
  *Done when:* ADR-010 no longer rests on the inverted premise.

- [x] **M5 — Close the gap between the CI lint and the edge-safety guarantee (ADR-009).** (finding 8)
  Lint catches `node:` specifiers but not transitive Node-only deps or bare Node globals; no runtime proof.
  *Action:* (a) extend the gate to flag `Buffer`/`process`/`global` usage and scan production deps for Node-only packages; (b) restore phase-7 edge validation — bundle `src/core` for a Worker in CI and assert zero Node polyfills + a live `getMe`.
  *Done when:* CI includes an edge-bundle build/smoke check; ADR-009's guarantee is mechanically backed.

- [x] **M6 — Add an early-ACK webhook path + harden secrets (finding 9).**
  `webhookCallback` blocks on `handleUpdate` before 200; secret compared with `!==`.
  *Action:* expose a fast-ACK option (return 200 immediately, run the handler via a `waitUntil`-style hook); use a constant-time secret comparison; document update-dedup guidance.
  *Done when:* a slow handler can't trip Telegram's webhook timeout; secret compare is constant-time; tests cover both.

---

## Low / nits

- [x] **L1 — Drop or qualify "the library serializes nothing" (finding 10).** Builders `JSON.stringify` and the encoder `String()`-coerces (`encode.ts:44`); state "serialization happens at the call site, not in the pipeline." (Subsumed by A1.)
- [x] **L2 — Tighten `json()` typing or document the gap (finding 11).** For all-optional target shapes the brand accepts wrong objects; note the limitation, or constrain `json<T>` so the field type drives `T`.
- [x] **L3 — Note the `Update` union caveats (finding 12).** It doesn't enforce exactly-one payload key; flag the TS error-message/perf cost of the 25-member union in the generator notes.
- [x] **L4 — Fix the dangling `RESEARCH-go-rust-clients.md` reference (finding 13).** Add the note to `redesign/`, or remove the citations in ADR-001/ADR-010 (lines 152, 300, 375) so the precedent arguments are verifiable.
- [x] **L5 — Strengthen the migration story (finding 14).** ESM-only + no CJS + no shim + same package name is a large blast radius; either add a CJS build / interop note or explicitly document the breaking-rename decision and why the name is retained.

---

## Suggested order

1. **A1** (unblocks A2, M4, L1) → **A2** → **A3, A4** (doc-truth, cheap).
2. **M2, M3, M6** (operational resilience) → **M5** (edge proof) → **M1, M4**.
3. **L1–L5** (doc hygiene) alongside the above.
