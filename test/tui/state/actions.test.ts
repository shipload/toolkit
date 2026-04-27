import { beforeEach, describe, expect, test } from "bun:test";
import { ActionDispatcher, type ActionResult } from "../../../src/tui/state/actions";

describe("ActionDispatcher", () => {
	let calls: number;
	let resolveNext: (() => void) | null;

	beforeEach(() => {
		calls = 0;
		resolveNext = null;
	});

	function action(): Promise<void> {
		calls++;
		return new Promise<void>((r) => {
			resolveNext = r;
		});
	}

	test("returns ok when the action resolves", async () => {
		const d = new ActionDispatcher({ timeoutMs: 1000 });
		const p: Promise<ActionResult> = d.run("resolve", action);
		expect(d.isBusy()).toBe(true);
		resolveNext?.();
		const result = await p;
		expect(result.ok).toBe(true);
		expect(d.isBusy()).toBe(false);
	});

	test("rejects re-entry while an action is in flight", async () => {
		const d = new ActionDispatcher({ timeoutMs: 1000 });
		const p1 = d.run("resolve", action);
		const p2 = await d.run("resolve", action);
		expect(p2.ok).toBe(false);
		if (!p2.ok) expect(p2.error).toMatch(/in flight/);
		resolveNext?.();
		await p1;
		expect(calls).toBe(1);
	});

	test("returns err on action throw", async () => {
		const d = new ActionDispatcher({ timeoutMs: 1000 });
		const result = await d.run("resolve", async () => {
			throw new Error("nope");
		});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain("nope");
	});

	test("times out hung actions", async () => {
		const d = new ActionDispatcher({ timeoutMs: 5 });
		const result = await d.run("resolve", () => new Promise<void>(() => {}));
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/timed out/i);
	});
});
