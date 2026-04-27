import { expect, test } from "bun:test";
import { render } from "../../../src/commands/query/epoch";

test("epoch shows seed, started, and computed timing", () => {
	const now = new Date("2026-04-21T14:32:10Z");
	const started = new Date("2026-04-20T00:00:00Z");
	const out = render(
		{
			seed: "abc123",
			epoch: 7,
			started,
			epochTimeSeconds: 446400,
			now,
		},
		false,
	);
	expect(out).toContain("abc123");
	expect(out).toContain("7");
	expect(out).toContain("2026-04-20");
	expect(out).toMatch(/Remaining:/);
	expect(out).toMatch(/Elapsed:/);
});

test("epoch --raw emits JSON", () => {
	const out = render(
		{
			seed: "abc",
			epoch: 1,
			started: new Date("2026-01-01T00:00:00Z"),
			epochTimeSeconds: 60,
			now: new Date("2026-01-01T00:00:30Z"),
		},
		true,
	);
	const parsed = JSON.parse(out);
	expect(parsed.seed).toBe("abc");
	expect(parsed.elapsed_seconds).toBe(30);
	expect(parsed.remaining_seconds).toBe(30);
});
