import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
	S3SessionStorage,
	signAwsV4,
	type S3Credentials,
} from "../../src/core/s3-session-storage.js";

// The store speaks the S3 REST API over an injected `fetch` with AWS Signature
// V4 signing, using an injected WebCrypto so these run deterministically on the
// Node 22/24/26 matrix (and Bun) with a fixed clock.

const crypto = globalThis.crypto;

// AWS's published "GET Object" example (Signature Version 4 docs): fixed
// credentials, date and request produce a known signature, so this pins the
// whole canonical-request -> string-to-sign -> signing-key -> signature chain.
const AWS_EXAMPLE_CREDS: S3Credentials = {
	accessKeyId: "AKIAIOSFODNN7EXAMPLE",
	secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
};

describe("signAwsV4 (AWS published vector)", () => {
	test("GET Object example matches AWS's documented signature", async () => {
		const headers = await signAwsV4({
			method: "GET",
			url: "https://examplebucket.s3.amazonaws.com/test.txt",
			headers: { Range: "bytes=0-9" },
			region: "us-east-1",
			service: "s3",
			credentials: AWS_EXAMPLE_CREDS,
			date: new Date(Date.UTC(2013, 4, 24, 0, 0, 0)),
			crypto,
		});
		assert.strictEqual(
			headers.authorization,
			"AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, " +
				"SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, " +
				"Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
		);
		assert.strictEqual(
			headers["x-amz-content-sha256"],
			"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		);
		assert.strictEqual(headers["x-amz-date"], "20130524T000000Z");
	});

	test("temporary credentials add x-amz-security-token to the signed headers", async () => {
		const headers = await signAwsV4({
			method: "GET",
			url: "https://b.s3.us-east-1.amazonaws.com/k",
			region: "us-east-1",
			service: "s3",
			credentials: { ...AWS_EXAMPLE_CREDS, sessionToken: "TOKEN123" },
			date: new Date(Date.UTC(2024, 0, 1, 0, 0, 0)),
			crypto,
		});
		assert.strictEqual(headers["x-amz-security-token"], "TOKEN123");
		assert.match(
			headers.authorization ?? "",
			/SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token/,
		);
	});

	test("internal whitespace in a header value is collapsed before signing", async () => {
		// SigV4 canonicalizes "two  spaces" to "two spaces", so the two must sign
		// identically; otherwise S3 recomputes over the collapsed form and 403s.
		const base = {
			method: "GET",
			url: "https://b.s3.us-east-1.amazonaws.com/k",
			region: "us-east-1",
			service: "s3",
			credentials: AWS_EXAMPLE_CREDS,
			date: new Date(Date.UTC(2024, 0, 1, 0, 0, 0)),
			crypto,
		} as const;
		const doubled = await signAwsV4({
			...base,
			headers: { "x-amz-meta-note": "two  spaces" },
		});
		const single = await signAwsV4({
			...base,
			headers: { "x-amz-meta-note": "two spaces" },
		});
		assert.strictEqual(doubled.authorization, single.authorization);
	});

	test("canonical query is order-independent and deterministic", async () => {
		// Parameters are sorted into canonical order, so declaration order cannot
		// change the signature - and the signer handles a query at all.
		const base = {
			method: "GET",
			region: "us-east-1",
			service: "s3",
			credentials: AWS_EXAMPLE_CREDS,
			date: new Date(Date.UTC(2024, 0, 1, 0, 0, 0)),
			crypto,
		} as const;
		const a = await signAwsV4({
			...base,
			url: "https://b.s3.us-east-1.amazonaws.com/k?a-=1&a%2F=2",
		});
		const b = await signAwsV4({
			...base,
			url: "https://b.s3.us-east-1.amazonaws.com/k?a%2F=2&a-=1",
		});
		assert.strictEqual(a.authorization, b.authorization);
		assert.match(a.authorization ?? "", /Signature=[0-9a-f]{64}$/);
	});
});

/** A fetch fake that records the last request and replays a queued response. */
function fakeFetch(responder: (url: string, init: RequestInit) => Response) {
	const calls: Array<{ url: string; init: RequestInit }> = [];
	const fn = ((input: string | URL, init?: RequestInit) => {
		const url = String(input);
		const rec = init ?? {};
		calls.push({ url, init: rec });
		return Promise.resolve(responder(url, rec));
	}) as typeof fetch;
	return { fn, calls };
}

function store(fetchImpl: typeof fetch, extra: Record<string, unknown> = {}) {
	return new S3SessionStorage({
		bucket: "my-bot",
		region: "eu-west-1",
		credentials: AWS_EXAMPLE_CREDS,
		fetch: fetchImpl,
		crypto,
		now: () => new Date(Date.UTC(2024, 0, 2, 3, 4, 5)),
		...extra,
	});
}

describe("S3SessionStorage", () => {
	test("read: GET the virtual-hosted URL, sign it, return the body", async () => {
		const { fn, calls } = fakeFetch(
			() => new Response("payload", { status: 200 }),
		);
		const s = store(fn);
		const value = await s.read("chat:123");
		assert.strictEqual(value, "payload");
		assert.strictEqual(calls.length, 1);
		// `:` in the key is percent-encoded in the path.
		assert.strictEqual(
			calls[0]?.url,
			"https://my-bot.s3.eu-west-1.amazonaws.com/sessions/chat%3A123",
		);
		assert.strictEqual(calls[0]?.init.method, "GET");
		const headers = calls[0]?.init.headers as Record<string, string>;
		assert.match(
			headers.authorization ?? "",
			/^AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE\/20240102\/eu-west-1\/s3\//,
		);
		// `host` is signed (it appears in SignedHeaders) but not sent explicitly - fetch derives it from the URL.
		assert.match(headers.authorization ?? "", /SignedHeaders=host;/);
		assert.strictEqual(headers.host, undefined);
	});

	test("read: a 404 is 'no session', not an error", async () => {
		const { fn } = fakeFetch(
			() => new Response("<Error>NoSuchKey</Error>", { status: 404 }),
		);
		assert.strictEqual(await store(fn).read("missing"), undefined);
	});

	test("read: a non-404 error status throws with the status and body", async () => {
		const { fn } = fakeFetch(
			() =>
				new Response("<Error>AccessDenied</Error>", {
					status: 403,
					statusText: "Forbidden",
				}),
		);
		await assert.rejects(
			store(fn).read("k"),
			/S3 GET returned 403 Forbidden.*AccessDenied/s,
		);
	});

	test("write: PUT the value as the body with a JSON content type", async () => {
		const { fn, calls } = fakeFetch(() => new Response(null, { status: 200 }));
		await store(fn).write("chat:7", '{"count":1}');
		assert.strictEqual(calls[0]?.init.method, "PUT");
		assert.strictEqual(
			new TextDecoder().decode(calls[0]?.init.body as Uint8Array),
			'{"count":1}',
		);
		const headers = calls[0]?.init.headers as Record<string, string>;
		assert.strictEqual(headers["content-type"], "application/json");
		// payload hash is the SHA-256 of the body, not the empty-body constant.
		assert.notStrictEqual(
			headers["x-amz-content-sha256"],
			"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		);
	});

	test("delete: a 404 is tolerated (idempotent), other errors throw", async () => {
		const { fn: ok } = fakeFetch(() => new Response(null, { status: 204 }));
		await store(ok).delete("k"); // resolves
		const { fn: gone } = fakeFetch(() => new Response(null, { status: 404 }));
		await store(gone).delete("k"); // resolves
		const { fn: bad } = fakeFetch(
			() => new Response("boom", { status: 500, statusText: "Server Error" }),
		);
		await assert.rejects(store(bad).delete("k"), /S3 DELETE returned 500/);
	});

	test("forcePathStyle + custom endpoint builds a path-style URL (MinIO / R2)", async () => {
		const { fn, calls } = fakeFetch(() => new Response("x", { status: 200 }));
		const s = store(fn, {
			endpoint: "http://localhost:9000",
			region: "us-east-1",
		});
		await s.read("k");
		assert.strictEqual(
			calls[0]?.url,
			"http://localhost:9000/my-bot/sessions/k",
		);
	});

	test("a key with a path-traversal segment is rejected (cannot escape the prefix)", async () => {
		const { fn } = fakeFetch(() => new Response("x", { status: 200 }));
		const s = store(fn);
		await assert.rejects(
			s.read("../secret"),
			/path segment, which would escape/,
		);
		await assert.rejects(
			s.write("a/../../b", "v"),
			/path segment, which would escape/,
		);
		// A literal dot inside a segment is fine - only "." / ".." whole segments are blocked.
		await assert.doesNotReject(s.read("chat.1"));
	});

	test("a custom prefix is applied to the object key", async () => {
		const { fn, calls } = fakeFetch(() => new Response("x", { status: 200 }));
		await store(fn, { prefix: "bots/42/" }).read("chat:1");
		assert.strictEqual(
			calls[0]?.url,
			"https://my-bot.s3.eu-west-1.amazonaws.com/bots/42/chat%3A1",
		);
	});

	test("a credentials provider is awaited per request", async () => {
		let calls = 0;
		const { fn } = fakeFetch(() => new Response("x", { status: 200 }));
		const s = store(fn, {
			credentials: async () => {
				calls += 1;
				return AWS_EXAMPLE_CREDS;
			},
		});
		await s.read("a");
		await s.read("b");
		assert.strictEqual(calls, 2);
	});

	test("constructing without WebCrypto throws a clear error", () => {
		assert.throws(
			() =>
				new S3SessionStorage({
					bucket: "b",
					region: "us-east-1",
					credentials: AWS_EXAMPLE_CREDS,
					fetch: (() => {}) as unknown as typeof fetch,
					// An object with no `subtle` - the guard rejects it (and `?? globalThis.crypto`
					// would otherwise mask a bare `undefined` on runtimes that have a global crypto).
					crypto: {} as unknown as Crypto,
				}),
			/No WebCrypto available/,
		);
	});
});
