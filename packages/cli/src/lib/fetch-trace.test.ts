import { describe, expect, test } from "bun:test";
import { createTracedFetch } from "./fetch-trace";

function socketClosed(): Error {
	const err = new Error("The socket connection was closed unexpectedly.");
	(err as Error & { code: string }).code = "ConnectionClosed";
	return err;
}

describe("createTracedFetch", () => {
	test("logs the idle gap since the previous request settled", async () => {
		let clock = 1_000;
		const lines: string[] = [];
		let fail = false;
		const traced = createTracedFetch(
			async () => {
				clock += 5;
				if (fail) throw socketClosed();
				return new Response("{}", { status: 200 });
			},
			(line) => lines.push(line),
			() => clock,
		);

		await traced("https://api.example.test/v1/chain/get_info", { method: "POST" });
		clock += 10_000;
		fail = true;
		await expect(traced("https://api.example.test/v1/chain/get_table_rows", { method: "POST" })).rejects.toThrow();

		expect(lines).toEqual([
			"fetch failed: POST api.example.test/v1/chain/get_table_rows during headers after 5ms, idle 10.00s, 0 concurrent, name=Error code=ConnectionClosed",
		]);
	});

	test("reports a body-read failure and the first request on an origin", async () => {
		const lines: string[] = [];
		const traced = createTracedFetch(
			async () =>
				new Response(
					new ReadableStream({
						pull(controller) {
							controller.error(socketClosed());
						},
					}),
				),
			(line) => lines.push(line),
			() => 0,
		);

		await expect(traced("https://api.example.test/v1/chain/get_info")).rejects.toThrow();

		expect(lines[0]).toContain("GET api.example.test/v1/chain/get_info during body");
		expect(lines[0]).toContain("first request");
	});

	test("returns the response body intact", async () => {
		const traced = createTracedFetch(
			async () => new Response('{"ok":true}', { status: 202, headers: { "x-test": "1" } }),
			() => {},
		);

		const res = await traced("https://api.example.test/v1/chain/get_info");

		expect(res.status).toBe(202);
		expect(res.headers.get("x-test")).toBe("1");
		expect(await res.json()).toEqual({ ok: true });
	});
});
