# Research — how Go & Rust Telegram libraries implement ADR-001 & ADR-002

**Date:** 2026-06-15
**Question:** How do mature Go and Rust Bot-API libraries solve the two decisions we made in [`ARCHITECTURE.md`](./ARCHITECTURE.md)?
- **ADR-001** — the method surface (generated concrete classes / `Api extends RawApi`, single argument, no `Proxy`).
- **ADR-002** — serialization of structured arguments (self-serializing `Serializable` values, no generic stringify, no `_fix*`).

Libraries examined (primary sources, current as of June 2026): **gotgbot** (Go, code-generated), **go-telegram-bot-api / tgbotapi** (Go, hand-written), **telebot** (Go, ergonomic), **teloxide** (Rust, the dominant framework), **frankenstein** (Rust, thin client).

---

## TL;DR

| Library | ADR-001 — method surface | ADR-002 — structured-arg serialization | File handling |
|---------|--------------------------|-----------------------------------------|---------------|
| **gotgbot** (Go) | **Code-generated concrete methods** on a `Bot` struct; required args positional + one `*Opts` struct. No reflection/proxy. | **Generated per-field**: each method body marshals its structured fields with `json.Marshal` into a `map[string]string`. | `InputFile` interface; generated per-method. |
| **tgbotapi** (Go) | Hand-written `Chattable`/`Fileable` config structs; one dynamic entry `bot.Send(Chattable)`. | **Generic**: `ReplyMarkup interface{}` JSON-marshaled in a shared `BaseChat.params()`. | `Fileable` interface adds file params. |
| **telebot** (Go) | Ergonomic `bot.Send(to, Sendable, …opts)` + low-level `bot.Raw(method, params)`. | **Self-serializing objects**: each type implements `Sendable.Send`, builds its own `map[string]string`, `json.Marshal`s its structured bits; `embedSendOptions` centralizes markup/entities. | per-`Sendable` + a files map. |
| **teloxide** (Rust) | `Requester` **trait** = the method set; implemented by `Bot` **and stackable adaptors**; each method returns a per-method **payload builder**. Required args positional + setter methods. | **serde derive** — the payload struct serializes itself; **whole payload sent as a JSON body** (`JsonRequest`) when no file. | `MultipartRequest` + `InputFile` (its own `Serialize`) → `attach://`. |
| **frankenstein** (Rust) | `TelegramApi` **trait** (sync + async variants); one `*Params` struct per method (single argument). | **serde derive** on the `*Params` struct. | `InputFile`/multipart. |

Two headlines for our design:
1. **Nobody uses a Proxy/reflection for the method surface** — the spectrum is hand-written ↔ code-generated concrete methods (Go) and trait + per-method types (Rust). Our generated-concrete-classes decision (ADR-001 option C) is exactly what gotgbot does.
2. **teloxide sends a JSON body for file-less calls**, which means structured fields need *no* per-field serialization at all — they're just nested JSON. This is a real alternative to our per-field `Serializable` approach (ADR-002) and is discussed in §4.

---

## 1. Go

### 1.1 gotgbot — code generation (closest to our ADR-001)

gotgbot is "a code-generated wrapper for the telegram bot api… All the telegram types and methods are generated from a bot api spec… generated in the `gen_*.go` files," regenerated with `go generate`. Stated design goals: "**Type safe; no weird `interface{}` logic**, all types match the bot API docs" and "no third party library bloat; only uses standard library."

- **ADR-001:** the generator emits one **concrete method per API method** onto the `Bot` struct (in `gen_methods.go`), with required parameters positional and a single trailing `*Opts` struct for optional ones (e.g. `AddStickerToSetOpts`, each carrying a `RequestOpts` for per-call timeouts). This is our ADR-001 decision C — generated concrete methods, no Proxy — realized in Go.
- **ADR-002:** there is no marker interface; each generated method body **marshals its own structured fields**. The standard shape is to build a `map[string]string` (`v`), set scalars directly, and for structured fields do `bs, _ := json.Marshal(opts.ReplyMarkup); v["reply_markup"] = string(bs)`. Files are handled through a dedicated `InputFile` interface. The "self-serialization" knowledge lives in *generated code per field*, not in the value's type.

**Relevance:** strongest precedent for "generate concrete methods, don't reflect." But its serialization is the generated-per-field model (our rejected option B, just emitted as code rather than a data map).

### 1.2 go-telegram-bot-api (tgbotapi) — hand-written, generic marshal

The classic library. Requests are **config structs** implementing a `Chattable` interface (`params() (Params, error)`, `method() string`); file-bearing configs implement `Fileable` (adds `files()`). You call `bot.Send(c Chattable)` / `bot.Request(c Chattable)` — a single dynamic entry point.

- **ADR-001:** one `Send(Chattable)` funnel + many config structs. The closest thing to a "dynamic" surface, but it's interface dispatch, not a proxy; method names live in each config's `method()`.
- **ADR-002:** the **generic** approach we rejected (option A). `BaseChat` holds `ReplyMarkup interface{}`, and the shared `params()` does `data, _ := json.Marshal(chat.ReplyMarkup); params["reply_markup"] = string(data)` — any markup type is accepted and blindly JSON-marshaled. Flexible, but `interface{}` gives up compile-time safety (exactly the downside our ADR-002 table notes for option A).

### 1.3 telebot — self-serializing objects (closest to our ADR-002 spirit)

telebot's headline abstraction is the **`Sendable` interface**: "any object that can send itself… lets bots implement custom Sendables for complex kinds of media or chat objects spanning across multiple messages."

```go
type Sendable interface {
    Send(*Bot, Recipient, *SendOptions) (*Message, error)
}
```

Each media type (`Photo`, `Audio`, `Document`, `Poll`, …) implements `Send`, building its **own** `map[string]string` params, and JSON-marshaling its structured parts (e.g. `opts, _ := json.Marshal(p.Options); params["options"] = string(opts)`). Cross-cutting fields (reply markup, entities, parse mode) are centralized in `bot.embedSendOptions(params, opt)`. Underneath sits a low-level `bot.Raw(method, params)`.

- **ADR-001:** an ergonomic high-level (`Send`) over a raw low-level (`Raw`) — the same two-tier split as our `Api`/`RawApi`, but selected by interface rather than inheritance.
- **ADR-002:** **the value serializes itself** — philosophically our `Serializable`, but applied at the *whole-message* granularity (a `Photo` knows how to send itself) rather than the *field* granularity (an `InlineKeyboard` knows how to serialize itself). Our per-field `Serializable` is a finer-grained variant of the same idea.

---

## 2. Rust

### 2.1 teloxide — trait + payloads + serde (the reference implementation)

teloxide splits a method into **three** pieces (from its user guide):

- **Payload** — a plain struct of the parameters (`SendMessage { chat_id, text, parse_mode: Option<…>, reply_markup: Option<ReplyMarkup>, … }`) implementing `Payload` (`const NAME`, `type Output`). Optional params are `Option<_>` with generated `*Setters` builder traits.
- **Request** — payload + token; implements `Request` with `async fn send()`. Lazy: methods return a builder you `.await`.
- **Requester** — the **trait** holding all ~90 methods (`fn send_message(&self, chat_id, text) -> Self::SendMessage`). Implemented by `Bot` **and by adaptors**.

- **ADR-001:** the method set is a **trait**, not concrete methods on one type. Crucially, the *layering* we get from `Api extends RawApi` is done in teloxide by **adaptors that also implement `Requester`** and wrap a base `Bot` (throttling, `cache_me`, `trace`, auto-`send`). Rust has no inheritance, so it composes decorators behind the same trait. This is a more flexible version of our subclass idea — see §3.
- **ADR-002:** **serde derive**. Each payload `#[derive(Serialize)]`s itself; structured fields are just nested types that serde knows how to encode. No `_fix*`, no field map, no marker interface — *the type system + derive macro carry the serialization*. For file-less methods teloxide uses **`JsonRequest`** (the whole payload is sent as one `application/json` body); for file methods it uses **`MultipartRequest`** with a serde-based multipart serializer, and `InputFile` has its own `Serialize` impl that emits `attach://…`/URL/`file_id`.

### 2.2 frankenstein — trait + params structs + serde

frankenstein is a thinner client: a `TelegramApi` trait (with `trait-sync` and `trait-async` variants) whose methods each take **one `*Params` struct** (`SendMessageParams`, `GetChatMemberParams`, …), structs mapped 1:1 to the docs and serialized with **serde derive**.

- **ADR-001:** trait + **single params-struct argument** per method — the cleanest precedent for our "single argument" rule.
- **ADR-002:** serde derive again — declarative, type-driven, no per-field handling.

---

## 3. Cross-cutting findings for ADR-001 (method surface)

- **A `Proxy`/reflection surface is used by none of them.** Validates our rejection of the Proxy. The real-world spectrum is: hand-written configs (tgbotapi), **code-generated concrete methods** (gotgbot — exactly our choice), or a trait + per-method types (teloxide, frankenstein). Generated-concrete is the type-safe, debuggable middle that our ADR-001 picks.
- **Single-argument params struct** is well-precedented (frankenstein; the newer go-telegram/bot family). gotgbot and teloxide instead use *required-positional + options*; our "single object everywhere" is the most uniform of these and reads cleanly with the `Serializable` builders.
- **The `Api`/`RawApi` layering has two idiomatic shapes.** Go libraries expose ergonomic + `Raw` on one type (telebot). teloxide uses **decorators behind a shared trait** (`Throttle<Bot>`, `CacheMe<Bot>`, … all `Requester`) — these *stack*. Our `Api extends RawApi` (inheritance) gives one fixed ergonomic layer; if we later want stackable cross-cutting concerns (throttling, auto-retry, tracing) the teloxide adaptor model is worth borrowing — composition over a small interface rather than a deepening subclass. Worth noting as a possible refinement (see §5).

## 4. Cross-cutting findings for ADR-002 (serialization)

The four observed strategies, from least to most type-safe:

1. **Generic marshal of `interface{}`** (tgbotapi) — our rejected option A; flexible, unsafe.
2. **Generated per-field marshal** (gotgbot) — our rejected option B, emitted as code.
3. **Self-serializing values** (telebot's `Sendable`; our `Serializable`) — the knowledge lives on the value/type.
4. **Declarative derive** (teloxide, frankenstein via serde) — the *type system* serializes the whole payload; structured fields are just nested types.

Two important nuances the research surfaces:

- **The Rust libraries get "self-serializing values" essentially for free** because serde derive turns any annotated struct into something that serializes itself. Our hand-written `Serializable.serialize()` is the manual TypeScript equivalent of what `#[derive(Serialize)]` does automatically. TypeScript has no universal derive, so a per-value `serialize()` (or a builder that produces one) is a reasonable stand-in — but note we're hand-rolling what serde gives declaratively.

- **teloxide sends a whole-payload JSON body for file-less requests.** Telegram's Bot API accepts four request encodings — URL query, `application/x-www-form-urlencoded`, **`application/json`** (everything except file uploads), and `multipart/form-data` (for uploads). teloxide's `JsonRequest` uses the `application/json` path: the entire payload is one JSON object, so **structured fields need no per-field serialization at all** — `reply_markup` is just a nested object in the body. Per-field serialization (our `Serializable`, gotgbot's per-field `json.Marshal`, `_fix*`) is only forced by choosing form-urlencoded/multipart, where every field must be a string. For the file case, multipart still requires JSON-encoding nested structures and pulling files out to `attach://` parts — which teloxide does with a serde multipart serializer.

## 5. Implications for our v2

- **ADR-001 stands and is well-precedented.** "Generate concrete methods, no Proxy" = gotgbot. Single-argument params = frankenstein. Keep it.
- **Consider an adaptor/decorator option for the `Api`/`RawApi` layering.** Inheritance gives exactly one ergonomic layer; teloxide's "wrap a base behind a small interface, and let wrappers stack" is more extensible for throttling/retry/caching/tracing. We could keep `Api extends RawApi` for the default ergonomic layer *and* allow wrapping a `RawApi` with adaptors. Worth a follow-up note in ADR-001.
- **Reconsider the transport encoding in ADR-002 — this is the biggest finding.** If v2's no-file path sends an `application/json` body (like teloxide's `JsonRequest`) instead of `x-www-form-urlencoded`, then **structured arguments don't need per-field serialization at all** for the common case. That would reframe `Serializable`:
  - It stops being a *serialization necessity* and becomes an *optional ergonomic builder* (`InlineKeyboard`, `fmt()`/`EntityList`) that produces the right nested object.
  - The mandatory serialization work shrinks to the **multipart/file path only**, where (like teloxide) we JSON-encode nested fields and extract `InputFile`s to `attach://` parts.
  - This keeps the DX win (builders) while removing the "every structured field must be a Serializable or it throws" strictness from the common path.
- **`InputFile` → `attach://` + a request-type split (JSON vs multipart)** is the universal pattern (teloxide explicitly; everyone effectively). Our `encodeForm` already switches on file presence; aligning the no-file branch to a JSON body (not urlencoded) matches the strongest library and simplifies ADR-002.

Recommended next step: a short ADR-010 ("Request encoding: JSON body for file-less calls, multipart for uploads") and a revision note on ADR-002 demoting `Serializable` from "required wrapper" to "ergonomic builder over a JSON body."

---

## Sources

- gotgbot (Go, code-generated): [repo](https://github.com/PaulSonOfLars/gotgbot), [README v2](https://github.com/PaulSonOfLars/gotgbot/blob/v2/README.md), [gen_methods.go](https://github.com/PaulSonOfLars/gotgbot/blob/v2/gen_methods.go), [pkg.go.dev](https://pkg.go.dev/github.com/PaulSonOfLars/gotgbot/v2)
- go-telegram-bot-api / tgbotapi (Go): [configs.go](https://github.com/go-telegram-bot-api/telegram-bot-api/blob/v5/configs.go), [pkg.go.dev v5](https://pkg.go.dev/github.com/go-telegram-bot-api/telegram-bot-api/v5)
- telebot (Go): [sendable.go (v4)](https://github.com/tucnak/telebot/blob/v4/sendable.go), [repo](https://github.com/tucnak/telebot)
- teloxide (Rust): [Sending requests guide](https://teloxide.github.io/book/ch-04-sending-requests.html), [Bot adaptors guide](https://teloxide.github.io/book/ch-05-bot-adaptors.html), [`Requester` trait](https://docs.rs/teloxide/latest/teloxide/requests/trait.Requester.html), [`Payload` trait](https://docs.rs/teloxide/latest/teloxide/requests/trait.Payload.html), [`JsonRequest`](https://docs.rs/teloxide-core/latest/teloxide_core/requests/struct.JsonRequest.html), [`InputFile`](https://docs.rs/teloxide/latest/teloxide/types/struct.InputFile.html)
- frankenstein (Rust): [`TelegramApi` trait](https://docs.rs/frankenstein/latest/frankenstein/api_traits/telegram_api/trait.TelegramApi.html), [repo](https://github.com/ayrat555/frankenstein)
- Telegram Bot API — [Making requests / encodings](https://core.telegram.org/bots/api#making-requests)
