/**
 * Live integration test for `S3SessionStorage` against a real S3-compatible
 * server. OFF by default: it runs only when `S3_TEST_ENDPOINT` is set, so it
 * does not touch the network in a normal `test:e2e` run.
 *
 * Point it at any S3-compatible endpoint and it exercises the full session
 * lifecycle (create bucket, miss -> write -> read -> overwrite -> delete ->
 * miss) plus a wrong-secret rejection, which proves the server actually
 * validated our SigV4 signature rather than ignoring it. Verified against
 * MinIO (`RELEASE.2025-09-07T16-13-09Z`, AGPLv3) and RustFS 1.0.4.
 *
 *   # MinIO:  minio server /data --address 127.0.0.1:9000
 *   # RustFS: rustfs server /data --address 127.0.0.1:9000
 *   S3_TEST_ENDPOINT=http://127.0.0.1:9000 \
 *   S3_TEST_ACCESS_KEY=minioadmin S3_TEST_SECRET_KEY=minioadmin \
 *     bun test test/e2e/s3-session-storage.test.ts
 *
 * Env: S3_TEST_ENDPOINT (required to run), S3_TEST_ACCESS_KEY / S3_TEST_SECRET_KEY
 * (default minioadmin), S3_TEST_BUCKET (default ntba-s3-session-test),
 * S3_TEST_REGION (default us-east-1). Against real AWS S3, pre-create the bucket
 * and use a region-correct endpoint.
 */
import { describe, expect, test } from "bun:test";
import {
	S3SessionStorage,
	signAwsV4,
} from "../../src/core/s3-session-storage.js";

const ENDPOINT = process.env.S3_TEST_ENDPOINT?.trim();
const REGION = process.env.S3_TEST_REGION?.trim() || "us-east-1";
const BUCKET = process.env.S3_TEST_BUCKET?.trim() || "ntba-s3-session-test";
const credentials = {
	accessKeyId: process.env.S3_TEST_ACCESS_KEY?.trim() || "minioadmin",
	secretAccessKey: process.env.S3_TEST_SECRET_KEY?.trim() || "minioadmin",
};

// A unique key per run, so repeated runs (and a shared bucket) never collide.
const KEY = `it-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function makeStore(secretOverride?: string): S3SessionStorage {
	return new S3SessionStorage({
		bucket: BUCKET,
		region: REGION,
		endpoint: ENDPOINT,
		forcePathStyle: true,
		credentials:
			secretOverride === undefined
				? credentials
				: { ...credentials, secretAccessKey: secretOverride },
		crypto: globalThis.crypto,
	});
}

/** Create the bucket with a signed PUT; a server that already has it answers 409. */
async function ensureBucket(): Promise<void> {
	const url = `${ENDPOINT}/${BUCKET}`;
	const headers = await signAwsV4({
		method: "PUT",
		url,
		region: REGION,
		service: "s3",
		credentials,
		date: new Date(),
		crypto: globalThis.crypto,
	});
	delete (headers as Record<string, string>).host;
	const res = await fetch(url, { method: "PUT", headers });
	if (!res.ok && res.status !== 409) {
		throw new Error(`create bucket failed: ${res.status} ${await res.text()}`);
	}
}

describe.skipIf(ENDPOINT === undefined)(
	"S3SessionStorage (live S3-compatible server)",
	() => {
		test("full session lifecycle round-trips through the store", async () => {
			await ensureBucket();
			const store = makeStore();

			expect(await store.read(KEY)).toBeUndefined();

			// A non-ASCII char built at runtime (source stays ASCII) to exercise UTF-8 bodies.
			const check = String.fromCharCode(0x2713);
			await store.write(KEY, JSON.stringify({ count: 1, who: `Yago ${check}` }));
			expect(await store.read(KEY)).toBe(`{"count":1,"who":"Yago ${check}"}`);

			await store.write(KEY, '{"count":2}');
			expect(await store.read(KEY)).toBe('{"count":2}');

			await store.delete(KEY);
			expect(await store.read(KEY)).toBeUndefined();

			await store.delete(KEY); // idempotent: deleting a missing object does not throw
		});

		test("the server rejects a wrong secret (SigV4 is actually verified)", async () => {
			await ensureBucket();
			await expect(makeStore("wrong-secret").read(KEY)).rejects.toThrow(
				/S3 GET returned 403/,
			);
		});
	},
);
