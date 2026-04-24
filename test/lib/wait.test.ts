import { describe, expect, test } from "bun:test";
import { nextInterval, waitForEntityIdle } from "../../src/lib/wait";

describe("nextInterval", () => {
	test("near-completion tightens to 1s", () => {
		expect(nextInterval({ remaining_s: 1, attempt: 0 })).toBe(1000);
	});
	test("short-task default is 2s", () => {
		expect(nextInterval({ remaining_s: 10, attempt: 0 })).toBe(2000);
	});
	test("long-task interval backs off to 10s", () => {
		expect(nextInterval({ remaining_s: 3600, attempt: 0 })).toBe(10_000);
	});
});

function makeSnapshot(opts: { is_idle: boolean; remaining?: number; tasks?: number }) {
	return {
		type: "ship",
		id: 1n,
		is_idle: opts.is_idle,
		current_task_remaining: opts.remaining ?? 0,
		schedule:
			(opts.tasks ?? 0) > 0
				? { started: new Date(), tasks: new Array(opts.tasks).fill({ duration: 10 }) }
				: undefined,
	};
}

describe("waitForEntityIdle", () => {
	test("polls until active task ends, then returns", async () => {
		const snapshots = [
			makeSnapshot({ is_idle: false, remaining: 10 }),
			makeSnapshot({ is_idle: false, remaining: 5 }),
			makeSnapshot({ is_idle: true, tasks: 0 }),
		];
		let calls = 0;
		const resolveCalls: unknown[] = [];
		await waitForEntityIdle({
			entityType: "ship",
			entityId: 1n,
			fetchSnapshot: async () => snapshots[Math.min(calls++, snapshots.length - 1)],
			sleep: async () => {},
			now: () => Date.now(),
			resolveFn: async (...args) => {
				resolveCalls.push(args);
			},
		});
		expect(calls).toBeGreaterThanOrEqual(3);
		expect(resolveCalls.length).toBe(0);
	});

	test("auto-resolves completed tasks on return", async () => {
		const snapshots = [
			makeSnapshot({ is_idle: false, remaining: 3 }),
			makeSnapshot({ is_idle: true, tasks: 2 }),
		];
		let calls = 0;
		const resolveCalls: Array<[string, bigint | number, number, boolean]> = [];
		await waitForEntityIdle({
			entityType: "ship",
			entityId: 7n,
			fetchSnapshot: async () => snapshots[Math.min(calls++, snapshots.length - 1)],
			sleep: async () => {},
			now: () => Date.now(),
			resolveFn: async (entityType, entityId, completed, auto) => {
				resolveCalls.push([entityType, entityId, completed, auto]);
			},
		});
		expect(resolveCalls.length).toBe(1);
		expect(resolveCalls[0][0]).toBe("ship");
		expect(resolveCalls[0][1]).toBe(7n);
		expect(resolveCalls[0][2]).toBe(2);
		expect(resolveCalls[0][3]).toBe(true);
	});

	test("honors timeoutMs", async () => {
		let t = 0;
		const busy = makeSnapshot({ is_idle: false, remaining: 1000 });
		const promise = waitForEntityIdle({
			entityType: "ship",
			entityId: 1n,
			timeoutMs: 50,
			fetchSnapshot: async () => busy,
			sleep: async () => {
				t += 100;
			},
			now: () => t,
			resolveFn: async () => {},
		});
		await expect(promise).rejects.toThrow(/Timed out/);
	});
});
