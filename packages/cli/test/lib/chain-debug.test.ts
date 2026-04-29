import { afterEach, describe, expect, test } from "bun:test";
import {
	getRawAbi,
	getRawCodeAndAbi,
	getTableRows,
} from "../../src/lib/chain-debug";

type FetchSpy = {
	calls: { url: string; init?: RequestInit }[];
	response: Response;
};

function installFetch(spy: FetchSpy): () => void {
	const orig = globalThis.fetch;
	globalThis.fetch = ((url: string, init?: RequestInit) => {
		spy.calls.push({ url, init });
		return Promise.resolve(spy.response);
	}) as typeof fetch;
	return () => {
		globalThis.fetch = orig;
	};
}

describe("getTableRows", () => {
	let restore: (() => void) | null = null;
	afterEach(() => {
		restore?.();
		restore = null;
	});

	test("posts to /v1/chain/get_table_rows with json body", async () => {
		const spy: FetchSpy = {
			calls: [],
			response: new Response(
				JSON.stringify({ rows: [{ id: 3 }], more: false }),
				{
					status: 200,
				},
			),
		};
		restore = installFetch(spy);

		const res = await getTableRows({
			chainUrl: "https://chain.example",
			code: "shipload.gm",
			scope: "shipload.gm",
			table: "ship",
			lower_bound: 3,
			upper_bound: 3,
			limit: 1,
		});

		expect(spy.calls).toHaveLength(1);
		expect(spy.calls[0].url).toBe(
			"https://chain.example/v1/chain/get_table_rows",
		);
		expect(spy.calls[0].init?.method).toBe("POST");
		const body = JSON.parse(spy.calls[0].init?.body as string);
		expect(body.json).toBe(true);
		expect(body.code).toBe("shipload.gm");
		expect(body.table).toBe("ship");
		expect(body.lower_bound).toBe(3);
		expect(res.rows).toEqual([{ id: 3 }]);
	});
});

describe("getRawCodeAndAbi", () => {
	let restore: (() => void) | null = null;
	afterEach(() => {
		restore?.();
		restore = null;
	});

	test("posts to /v1/chain/get_raw_code_and_abi", async () => {
		const spy: FetchSpy = {
			calls: [],
			response: new Response(
				JSON.stringify({ wasm: "BASE64WASM", abi: "BASE64ABI" }),
				{
					status: 200,
				},
			),
		};
		restore = installFetch(spy);

		const res = await getRawCodeAndAbi({
			chainUrl: "https://chain.example",
			account_name: "shipload.gm",
		});

		expect(spy.calls[0].url).toBe(
			"https://chain.example/v1/chain/get_raw_code_and_abi",
		);
		const body = JSON.parse(spy.calls[0].init?.body as string);
		expect(body.account_name).toBe("shipload.gm");
		expect(res.wasm).toBe("BASE64WASM");
		expect(res.abi).toBe("BASE64ABI");
	});
});

describe("getRawAbi", () => {
	let restore: (() => void) | null = null;
	afterEach(() => {
		restore?.();
		restore = null;
	});

	test("posts to /v1/chain/get_raw_abi", async () => {
		const spy: FetchSpy = {
			calls: [],
			response: new Response(JSON.stringify({ abi: "BASE64ABI" }), {
				status: 200,
			}),
		};
		restore = installFetch(spy);

		const res = await getRawAbi({
			chainUrl: "https://chain.example",
			account_name: "shipload.gm",
		});

		expect(spy.calls[0].url).toBe("https://chain.example/v1/chain/get_raw_abi");
		expect(res.abi).toBe("BASE64ABI");
	});
});
