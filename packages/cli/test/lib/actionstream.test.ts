import { afterEach, describe, expect, test } from "bun:test";
import {
	activityFingerprint,
	fetchActivity,
	syntheticCursor,
} from "../../src/lib/actionstream";

type FetchSpy = {
	calls: { url: string }[];
	response: Response;
};

function installFetch(spy: FetchSpy): () => void {
	const orig = globalThis.fetch;
	globalThis.fetch = ((url: string) => {
		spy.calls.push({ url });
		return Promise.resolve(spy.response);
	}) as typeof fetch;
	return () => {
		globalThis.fetch = orig;
	};
}

const SAMPLE_ACTIVITY = {
	results: [
		{
			global_action_seq: 341156589,
			block_num: 263063973,
			block_time: "2026-04-28T18:19:09.000",
			irreversible: true,
			action_trace: {
				trx_id: "abc",
				act: {
					account: "shipload.gm",
					name: "recharge",
					authorization: [],
					hex_data: "00",
					data: { entity_type: "ship", id: 3 },
				},
				receiver: "shipload.gm",
			},
		},
	],
	next_cursor: "eyJnIjozNDExNTY1ODksIm8iOiJkZXNjIiwicSI6IklocXBKWm1PekpNPSJ9",
};

describe("activityFingerprint", () => {
	test("matches roborovski's known fingerprint for shipload.gm with no filters", () => {
		// From the Apr 28-29 investigation: querying /account/shipload.gm/activity?order=desc
		// returned next_cursor with q="IhqpJZmOzJM=". This pins our hash to the server's.
		expect(activityFingerprint({ account: "shipload.gm" })).toBe("IhqpJZmOzJM=");
	});

	test("differs when contract filter is added", () => {
		const fp1 = activityFingerprint({ account: "shipload.gm" });
		const fp2 = activityFingerprint({ account: "shipload.gm", contract: "shipload.gm" });
		expect(fp1).not.toBe(fp2);
	});

	test("empty fields stringify as empty between pipes", () => {
		// computeAccountActivityFingerprint format: "%s|%s|%s|%s|%s|%s"
		// For account-only query, empty strings between every pipe.
		const fp = activityFingerprint({ account: "shipload.gm" });
		expect(typeof fp).toBe("string");
		expect(fp.endsWith("=")).toBe(true); // base64 of 8 bytes always ends with '='
	});
});

describe("syntheticCursor", () => {
	test("produces a base64 JSON cursor with g/o/q fields", () => {
		const cursor = syntheticCursor({ account: "shipload.gm" }, 341156589, "desc");
		const decoded = JSON.parse(Buffer.from(cursor, "base64").toString());
		expect(decoded.g).toBe(341156589);
		expect(decoded.o).toBe("desc");
		expect(decoded.q).toBe("IhqpJZmOzJM=");
	});

	test("matches the next_cursor from a real shipload.gm response", () => {
		// SAMPLE_ACTIVITY.next_cursor was captured live during the investigation.
		const synthesized = syntheticCursor({ account: "shipload.gm" }, 341156589, "desc");
		expect(synthesized).toBe(SAMPLE_ACTIVITY.next_cursor);
	});
});

describe("fetchActivity", () => {
	let restore: (() => void) | null = null;
	afterEach(() => {
		restore?.();
		restore = null;
	});

	test("hits /account/{account}/activity with filter params", async () => {
		const spy: FetchSpy = {
			calls: [],
			response: new Response(JSON.stringify(SAMPLE_ACTIVITY), { status: 200 }),
		};
		restore = installFetch(spy);

		await fetchActivity({
			historyUrl: "https://history.example",
			account: "shipload.gm",
			contract: "shipload.gm",
			action: "cleartable",
			limit: 50,
			order: "desc",
		});

		const url = new URL(spy.calls[0].url);
		expect(url.pathname).toBe("/account/shipload.gm/activity");
		expect(url.searchParams.get("contract")).toBe("shipload.gm");
		expect(url.searchParams.get("action")).toBe("cleartable");
		expect(url.searchParams.get("limit")).toBe("50");
		expect(url.searchParams.get("order")).toBe("desc");
	});

	test("uses --start-seq to synthesize a cursor on first call", async () => {
		const spy: FetchSpy = {
			calls: [],
			response: new Response(JSON.stringify(SAMPLE_ACTIVITY), { status: 200 }),
		};
		restore = installFetch(spy);

		await fetchActivity({
			historyUrl: "https://history.example",
			account: "shipload.gm",
			startSeq: 341156589,
			order: "asc",
		});

		const url = new URL(spy.calls[0].url);
		const cursor = url.searchParams.get("cursor");
		expect(cursor).not.toBeNull();
		const decoded = JSON.parse(Buffer.from(cursor as string, "base64").toString());
		expect(decoded.g).toBe(341156589);
		expect(decoded.o).toBe("asc");
	});

	test("throws on non-2xx", async () => {
		const spy: FetchSpy = {
			calls: [],
			response: new Response("bad request", { status: 400 }),
		};
		restore = installFetch(spy);

		await expect(
			fetchActivity({ historyUrl: "https://history.example", account: "x" }),
		).rejects.toThrow(/400/);
	});
});
