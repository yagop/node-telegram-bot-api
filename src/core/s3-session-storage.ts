/**
 * `S3SessionStorage` - a durable, cross-instance `SessionStore` backed by any
 * S3-compatible object store (AWS S3, Cloudflare R2, MinIO, DigitalOcean
 * Spaces, ...), speaking the S3 REST API directly over `fetch` with AWS
 * Signature V4 request signing.
 *
 * It lives in core and uses only web-standard APIs - `fetch`, `TextEncoder` and
 * the `SubtleCrypto` of the global `crypto` - so it runs unchanged on Node 19+,
 * Bun, Deno, Cloudflare Workers and Vercel/Deno Edge. Both are injectable
 * (`options.fetch`, `options.crypto`) so tests pass fakes instead of patching
 * globals, and so Node 18 - which exposes a global `crypto` only behind
 * `--experimental-global-webcrypto` - can supply one:
 *
 * ```ts
 * import { webcrypto } from "node:crypto"; // Node 18 only; 19+/Bun/edge have it global
 * const store = new S3SessionStorage({
 *   bucket: "my-bot", region: "eu-west-1",
 *   credentials: { accessKeyId, secretAccessKey },
 *   crypto: webcrypto as Crypto,
 * });
 * ```
 *
 * Each session key maps to one object at `<prefix><key>`; `read` is a GET
 * (a 404 means "no session" -> `undefined`), `write` a PUT, `delete` a DELETE.
 *
 * TTL: S3 has no per-object expiry, so this store ignores `ttlSeconds` and
 * implements no `touch`. Expire idle sessions with a bucket lifecycle rule on
 * the prefix instead (whole-day granularity, measured from the last write) -
 * since the middleware skips the write when nothing changed, keep the rule
 * generous (30+ days) so an active-but-unchanged chat is not reaped.
 *
 * Concurrency is last-writer-wins across instances, like the Redis / SQL stores
 * (within one process the middleware's per-key lock already serializes updates).
 */

import { NetworkError, TelegramBotError } from "./errors.js";
import type { SessionStore } from "./session.js";

/** Static S3 credentials. `sessionToken` is required for temporary (STS / role) credentials. */
export type S3Credentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

/** Supplies credentials per request, so rotating / STS credentials stay fresh. */
export type S3CredentialsProvider = () => S3Credentials | Promise<S3Credentials>;

export type S3SessionStorageOptions = {
  /** Bucket name. */
  bucket: string;
  /** Region, e.g. `"us-east-1"`. Part of the SigV4 scope; use `"auto"` for R2. */
  region: string;
  /** Static credentials, or a function returning them (awaited) per request. */
  credentials: S3Credentials | S3CredentialsProvider;
  /**
   * Custom endpoint for an S3-compatible service (R2, MinIO, Spaces). Omit for
   * AWS S3, which is derived from `region`. When set, path-style addressing is
   * used unless `forcePathStyle` is explicitly `false`.
   */
  endpoint?: string;
  /**
   * Put the bucket in the path (`<endpoint>/<bucket>/<key>`) instead of the host
   * (`<bucket>.<host>/<key>`). Defaults to `true` when `endpoint` is set, `false`
   * for AWS S3. MinIO and most self-hosted gateways need `true`.
   */
  forcePathStyle?: boolean;
  /** Key prefix for every object. Default `"sessions/"`. */
  prefix?: string;
  /** Injected `fetch`. Default `globalThis.fetch`. */
  fetch?: typeof fetch;
  /** Injected WebCrypto. Default `globalThis.crypto`; pass `node:crypto`'s `webcrypto` on Node 18. */
  crypto?: Crypto;
  /** Clock, for deterministic signing in tests. Default `() => new Date()`. */
  now?: () => Date;
};

const SERVICE = "s3";
const ALGORITHM = "AWS4-HMAC-SHA256";
const encoder = new TextEncoder();

/** SHA-256 of an empty body, the payload hash for GET / DELETE. */
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    out += b.toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * RFC 3986 percent-encoding as SigV4 requires: everything but the unreserved
 * set `A-Za-z0-9-_.~` is escaped. `encodeURIComponent` leaves `!*'()` unescaped,
 * so finish those by hand.
 */
function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!*'()]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

/** Encode an object key into a URL path, preserving `/` as the segment separator. */
function encodeKeyPath(key: string): string {
  return key.split("/").map(uriEncode).join("/");
}

/** Two-digit zero-pad for the SigV4 date stamps. */
function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** `YYYYMMDDTHHMMSSZ` and `YYYYMMDD` in UTC, the two forms SigV4 needs. */
function amzDates(date: Date): { amzDate: string; dateStamp: string } {
  const y = date.getUTCFullYear();
  const mo = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const mi = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  const dateStamp = `${y}${mo}${d}`;
  return { amzDate: `${dateStamp}T${h}${mi}${s}Z`, dateStamp };
}

/** Inputs for one signed request. Separated from the store so it can be tested against AWS's published vectors. */
export type SignAwsV4Params = {
  method: string;
  /** Full request URL; its (already percent-encoded) path and query are signed verbatim. */
  url: string;
  /** Request headers to sign, alongside the `host` / `x-amz-*` the signer adds. */
  headers?: Record<string, string>;
  /** Request body, for the payload hash. Omit for an empty body. */
  body?: Uint8Array;
  /** Override the payload hash (e.g. a precomputed digest); defaults to SHA-256 of `body`. */
  payloadSha256?: string;
  region: string;
  service: string;
  credentials: S3Credentials;
  date: Date;
  crypto: Crypto;
};

/**
 * Compute the AWS Signature V4 headers for a request. Returns the headers to
 * send (lowercased names): `authorization`, `x-amz-date`, `x-amz-content-sha256`,
 * `host`, and `x-amz-security-token` when the credentials are temporary, merged
 * with the caller's `headers`.
 */
export async function signAwsV4(params: SignAwsV4Params): Promise<Record<string, string>> {
  const { method, url, body, region, service, credentials, date, crypto } = params;
  const subtle = crypto.subtle;
  const { amzDate, dateStamp } = amzDates(date);
  const parsed = new URL(url);

  const payloadHash =
    params.payloadSha256 ?? (body === undefined ? EMPTY_SHA256 : await sha256Hex(subtle, body));

  // Header set to sign: caller headers (lowercased) plus the signer's own.
  const signed: Record<string, string> = {};
  for (const [name, value] of Object.entries(params.headers ?? {})) {
    signed[name.toLowerCase()] = value.trim();
  }
  signed.host = parsed.host;
  signed["x-amz-date"] = amzDate;
  signed["x-amz-content-sha256"] = payloadHash;
  if (credentials.sessionToken !== undefined) {
    signed["x-amz-security-token"] = credentials.sessionToken;
  }

  const sortedNames = Object.keys(signed).sort();
  const canonicalHeaders = sortedNames.map((n) => `${n}:${signed[n]}\n`).join("");
  const signedHeaders = sortedNames.join(";");

  // Canonical query string: params sorted by key, each name/value URI-encoded.
  const queryPairs: Array<[string, string]> = [];
  for (const [k, v] of parsed.searchParams) {
    queryPairs.push([k, v]);
  }
  queryPairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1));
  const canonicalQuery = queryPairs.map(([k, v]) => `${uriEncode(k)}=${uriEncode(v)}`).join("&");

  const canonicalRequest = [
    method,
    parsed.pathname,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    ALGORITHM,
    amzDate,
    scope,
    await sha256Hex(subtle, encoder.encode(canonicalRequest)),
  ].join("\n");

  const signingKey = await deriveSigningKey(
    subtle,
    credentials.secretAccessKey,
    dateStamp,
    region,
    service
  );
  const signature = toHex(await hmac(subtle, signingKey, encoder.encode(stringToSign)));

  const authorization =
    `${ALGORITHM} Credential=${credentials.accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { ...signed, authorization };
}

// WebCrypto's BufferSource params want an ArrayBuffer-backed view; a `TextEncoder`
// result and our own `new Uint8Array(...)` always are, but TS 6 widens the type
// parameter to `ArrayBufferLike`, so narrow it at the call boundary.
type ArrayBufferView8 = Uint8Array<ArrayBuffer>;

async function sha256Hex(subtle: SubtleCrypto, data: Uint8Array): Promise<string> {
  const digest = await subtle.digest("SHA-256", data as ArrayBufferView8);
  return toHex(new Uint8Array(digest));
}

async function hmac(subtle: SubtleCrypto, key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await subtle.importKey(
    "raw",
    key as ArrayBufferView8,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await subtle.sign("HMAC", cryptoKey, data as ArrayBufferView8);
  return new Uint8Array(sig);
}

async function deriveSigningKey(
  subtle: SubtleCrypto,
  secret: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<Uint8Array> {
  const kDate = await hmac(subtle, encoder.encode(`AWS4${secret}`), encoder.encode(dateStamp));
  const kRegion = await hmac(subtle, kDate, encoder.encode(region));
  const kService = await hmac(subtle, kRegion, encoder.encode(service));
  return hmac(subtle, kService, encoder.encode("aws4_request"));
}

export class S3SessionStorage implements SessionStore {
  private readonly bucket: string;
  private readonly region: string;
  private readonly credentials: S3Credentials | S3CredentialsProvider;
  private readonly prefix: string;
  private readonly fetchImpl: typeof fetch;
  private readonly crypto: Crypto;
  private readonly now: () => Date;
  /** Origin (scheme + host[:port]) every object URL is built on. */
  private readonly origin: string;
  /** True when the bucket sits in the path rather than the host. */
  private readonly pathStyle: boolean;

  constructor(options: S3SessionStorageOptions) {
    this.bucket = options.bucket;
    this.region = options.region;
    this.credentials = options.credentials;
    this.prefix = options.prefix ?? "sessions/";
    this.now = options.now ?? (() => new Date());

    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new NetworkError("No fetch implementation available; pass options.fetch");
    }
    this.fetchImpl = fetchImpl;

    const crypto = options.crypto ?? globalThis.crypto;
    if (crypto === undefined || typeof crypto.subtle !== "object") {
      throw new TelegramBotError(
        "No WebCrypto available; pass options.crypto (on Node 18, node:crypto's webcrypto)",
        { code: "ES3" }
      );
    }
    this.crypto = crypto;

    this.pathStyle = options.forcePathStyle ?? options.endpoint !== undefined;
    if (options.endpoint !== undefined) {
      const url = new URL(options.endpoint);
      this.origin = this.pathStyle
        ? `${url.protocol}//${url.host}`
        : `${url.protocol}//${this.bucket}.${url.host}`;
    } else {
      const host = `${this.region}.amazonaws.com`;
      this.origin = this.pathStyle ? `https://s3.${host}` : `https://${this.bucket}.s3.${host}`;
    }
  }

  private urlFor(key: string): string {
    const objectPath = encodeKeyPath(`${this.prefix}${key}`);
    return this.pathStyle
      ? `${this.origin}/${this.bucket}/${objectPath}`
      : `${this.origin}/${objectPath}`;
  }

  private resolveCredentials(): S3Credentials | Promise<S3Credentials> {
    return typeof this.credentials === "function" ? this.credentials() : this.credentials;
  }

  /** Sign and send one request; `body` is the request payload (PUT only). */
  private async send(method: string, url: string, body?: Uint8Array): Promise<Response> {
    const credentials = await this.resolveCredentials();
    const headers = await signAwsV4({
      method,
      url,
      body,
      region: this.region,
      service: SERVICE,
      credentials,
      date: this.now(),
      crypto: this.crypto,
    });
    if (body !== undefined) {
      headers["content-type"] = "application/json";
    }
    // `host` is signed but must not be sent explicitly: `fetch` derives the Host
    // header from the URL (and forbids setting it), and that value matches.
    delete headers.host;
    try {
      return await this.fetchImpl(url, {
        method,
        headers,
        ...(body !== undefined ? { body } : {}),
      });
    } catch (err) {
      throw new NetworkError(`S3 ${method} request failed`, { cause: err });
    }
  }

  private async fail(response: Response, method: string): Promise<never> {
    let detail = "";
    try {
      detail = (await response.text()).slice(0, 512);
    } catch {
      // body already consumed or unreadable; the status is enough
    }
    throw new TelegramBotError(
      `S3 ${method} returned ${response.status} ${response.statusText}${detail ? `: ${detail}` : ""}`,
      { code: "ES3" }
    );
  }

  async read(key: string): Promise<string | undefined> {
    const response = await this.send("GET", this.urlFor(key));
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok) {
      return this.fail(response, "GET");
    }
    return response.text();
  }

  async write(key: string, value: string): Promise<void> {
    const response = await this.send("PUT", this.urlFor(key), encoder.encode(value));
    if (!response.ok) {
      return this.fail(response, "PUT");
    }
  }

  async delete(key: string): Promise<void> {
    const response = await this.send("DELETE", this.urlFor(key));
    // S3 DELETE is idempotent: a missing object still returns 204.
    if (!response.ok && response.status !== 404) {
      return this.fail(response, "DELETE");
    }
  }
}
