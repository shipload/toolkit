import { describe, expect, test } from "bun:test";
import { createTracedFetch } from "./fetch-trace";

function socketClosed(): Error {
	const err = new Error("The socket connection was closed unexpectedly.");
	(err as Error & { code: string }).code = "ECONNRESET";
	return err;
}

const API = "https://api.example.test";

describe("createTracedFetch", () => {
	test("logs the idle gap and retries a failed read once", async () => {
		let clock = 1_000;
		const lines: string[] = [];
		let failures = 0;
		const traced = createTracedFetch(
			async () => {
				clock += 5;
				if (failures > 0) {
					failures--;
					throw socketClosed();
				}
				return new Response('{"rows":[]}', { status: 200 });
			},
			(line) => lines.push(line),
			() => clock,
		);

		await traced(`${API}/v1/chain/get_info`, { method: "POST" });
		clock += 10_000;
		failures = 1;
		const res = await traced(`${API}/v1/chain/get_table_rows`, { method: "POST", body: "{}" });

		expect(await res.json()).toEqual({ rows: [] });
		expect(lines).toEqual([
			"fetch failed: POST api.example.test/v1/chain/get_table_rows during headers after 5ms, idle 10.00s, 0 concurrent, name=Error code=ECONNRESET, retrying",
		]);
	});

	test("throws when the retried read fails too", async () => {
		const lines: string[] = [];
		const traced = createTracedFetch(
			async () => {
				throw socketClosed();
			},
			(line) => lines.push(line),
			() => 0,
		);

		await expect(traced(`${API}/v1/chain/send_read_only_transaction`, { method: "POST", body: "{}" })).rejects.toThrow();

		expect(lines).toHaveLength(2);
		expect(lines[0]).toEndWith(", retrying");
		expect(lines[1]).toEndWith(", retry failed");
	});

	test("never retries a transaction send", async () => {
		const lines: string[] = [];
		let calls = 0;
		const traced = createTracedFetch(
			async () => {
				calls++;
				throw socketClosed();
			},
			(line) => lines.push(line),
			() => 0,
		);

		await expect(traced(`${API}/v1/chain/send_transaction2`, { method: "POST", body: "{}" })).rejects.toThrow();

		expect(calls).toBe(1);
		expect(lines).toHaveLength(1);
		expect(lines[0]).toEndWith("code=ECONNRESET");
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

		await expect(traced(`${API}/v1/chain/push_transaction`)).rejects.toThrow();

		expect(lines[0]).toContain("GET api.example.test/v1/chain/push_transaction during body");
		expect(lines[0]).toContain("first request");
	});

	test("returns the response body intact", async () => {
		const traced = createTracedFetch(
			async () => new Response('{"ok":true}', { status: 202, headers: { "x-test": "1" } }),
			() => {},
		);

		const res = await traced(`${API}/v1/chain/get_info`);

		expect(res.status).toBe(202);
		expect(res.headers.get("x-test")).toBe("1");
		expect(await res.json()).toEqual({ ok: true });
	});
});
