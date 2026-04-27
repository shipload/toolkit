import { describe, expect, test } from "bun:test";
import { type SnapshotTick, streamEntitySnapshot } from "../../src/lib/snapshot-stream";
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
			autoResolve: true,
			fetchSnapshot: async () => snapshots[Math.min(calls++, snapshots.length - 1)],
			sleep: async () => {},
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
		const busy = makeSnapshot({ is_idle: false, remaining: 1000 });
		const promise = waitForEntityIdle({
			entityType: "ship",
			entityId: 1n,
			timeoutMs: 50,
			fetchSnapshot: async () => busy,
			sleep: async () => {},
			resolveFn: async () => {},
		});
		await expect(promise).rejects.toThrow(/Timed out/);
	});
});

describe("streamEntitySnapshot", () => {
	test("yields ticks until consumer breaks", async () => {
		const snapshots = [
			makeSnapshot({ is_idle: false, remaining: 10 }),
			makeSnapshot({ is_idle: false, remaining: 5 }),
			makeSnapshot({ is_idle: true, tasks: 0 }),
		];
		let calls = 0;
		const ticks: SnapshotTick[] = [];
		for await (const tick of streamEntitySnapshot({
			entityType: "ship",
			entityId: 1n,
			fetchSnapshot: async () => snapshots[Math.min(calls++, snapshots.length - 1)],
			sleep: async () => {},
		})) {
			ticks.push(tick);
			if (tick.snap.is_idle) break;
		}
		expect(ticks.length).toBeGreaterThanOrEqual(3);
		expect(ticks[ticks.length - 1].snap.is_idle).toBe(true);
	});

	test("interpolates remaining_s between fetches", async () => {
		const snap = makeSnapshot({ is_idle: false, remaining: 10 });
		let calls = 0;
		const ticks: SnapshotTick[] = [];
		for await (const tick of streamEntitySnapshot({
			entityType: "ship",
			entityId: 1n,
			renderIntervalMs: 1000,
			fetchIntervalMs: 5000,
			fetchSnapshot: async () => {
				calls++;
				return snap;
			},
			sleep: async () => {},
		})) {
			ticks.push(tick);
			if (ticks.length >= 4) break;
		}
		expect(ticks[0].remaining_s).toBeCloseTo(10, 0);
		expect(ticks[1].remaining_s).toBeCloseTo(9, 0);
		expect(ticks[2].remaining_s).toBeCloseTo(8, 0);
		expect(calls).toBe(1);
	});

	test("smooths refetch when chain value is within tolerance of interpolation", async () => {
		// 10s task. Each fetch keeps total=10 (same task) but reports remaining
		// values that drift slightly from our interpolation (simulates block-time
		// vs wall-clock skew). Stream should keep counting down smoothly without
		// jumping back up.
		const responses = [
			{ ...makeSnapshot({ is_idle: false, remaining: 10 }), current_task_elapsed: 0 },
			{ ...makeSnapshot({ is_idle: false, remaining: 6 }), current_task_elapsed: 4 },
			{ ...makeSnapshot({ is_idle: false, remaining: 2 }), current_task_elapsed: 8 },
		];
		let calls = 0;
		const ticks: SnapshotTick[] = [];
		for await (const tick of streamEntitySnapshot({
			entityType: "ship",
			entityId: 1n,
			renderIntervalMs: 1000,
			fetchIntervalMs: 5000,
			fetchSnapshot: async () => responses[Math.min(calls++, responses.length - 1)],
			sleep: async () => {},
		})) {
			ticks.push(tick);
			if (ticks.length >= 11) break;
		}
		for (let i = 1; i < ticks.length; i++) {
			expect(ticks[i].remaining_s).toBeLessThanOrEqual(ticks[i - 1].remaining_s + 0.001);
		}
	});

	test("snaps when chain value diverges (new task)", async () => {
		const responses = [
			{ ...makeSnapshot({ is_idle: false, remaining: 10 }), current_task_elapsed: 0 },
			// New task starts: total duration changes drastically
			{ ...makeSnapshot({ is_idle: false, remaining: 100 }), current_task_elapsed: 0 },
		];
		let calls = 0;
		const ticks: SnapshotTick[] = [];
		for await (const tick of streamEntitySnapshot({
			entityType: "ship",
			entityId: 1n,
			renderIntervalMs: 1000,
			fetchIntervalMs: 5000,
			fetchSnapshot: async () => responses[Math.min(calls++, responses.length - 1)],
			sleep: async () => {},
		})) {
			ticks.push(tick);
			if (ticks.length >= 7) break;
		}
		// After refetch, remaining should jump up to the new task's value.
		const last = ticks[ticks.length - 1];
		expect(last.remaining_s).toBeGreaterThan(50);
	});

	test("swallows fetch errors and keeps emitting", async () => {
		const good = makeSnapshot({ is_idle: false, remaining: 10 });
		let calls = 0;
		const ticks: SnapshotTick[] = [];
		for await (const tick of streamEntitySnapshot({
			entityType: "ship",
			entityId: 1n,
			renderIntervalMs: 1,
			fetchIntervalMs: 1,
			fetchSnapshot: async () => {
				calls++;
				if (calls === 2) throw new Error("network");
				return good;
			},
			sleep: async () => {},
		})) {
			ticks.push(tick);
			if (ticks.length >= 5) break;
		}
		expect(ticks.length).toBe(5);
	});
});
