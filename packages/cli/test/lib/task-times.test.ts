import { describe, expect, test } from "bun:test";
import { TimePoint } from "@wharfkit/antelope";
import type { ServerTypes } from "@shipload/sdk";
import { computeTaskCompletionTimes } from "../../src/lib/task-times";

function mkTask(durationS: number): ServerTypes.task {
	return { type: 0, duration: BigInt(durationS), cancelable: 0, cargo: [] } as never;
}

describe("computeTaskCompletionTimes", () => {
	const started = TimePoint.from("2026-05-10T22:00:00.000");

	test("done tasks anchor to schedule.started + cumulative duration", () => {
		const schedule = {
			started,
			tasks: [mkTask(60), mkTask(120), mkTask(30)],
		} as never as ServerTypes.schedule;
		const now = new Date(Date.UTC(2026, 4, 10, 22, 5, 0));
		const times = computeTaskCompletionTimes(schedule, {
			now,
			activeIndex: 2,
			remainingS: 10,
		});
		expect(times[0].toISOString()).toBe("2026-05-10T22:01:00.000Z");
		expect(times[1].toISOString()).toBe("2026-05-10T22:03:00.000Z");
	});

	test("active task uses now + remaining", () => {
		const schedule = {
			started,
			tasks: [mkTask(60), mkTask(120), mkTask(30)],
		} as never as ServerTypes.schedule;
		const now = new Date(Date.UTC(2026, 4, 10, 22, 4, 0));
		const times = computeTaskCompletionTimes(schedule, {
			now,
			activeIndex: 1,
			remainingS: 80,
		});
		expect(times[1].toISOString()).toBe("2026-05-10T22:05:20.000Z");
	});

	test("pending tasks chain off the active task's completion", () => {
		const schedule = {
			started,
			tasks: [mkTask(60), mkTask(120), mkTask(30), mkTask(45)],
		} as never as ServerTypes.schedule;
		const now = new Date(Date.UTC(2026, 4, 10, 22, 4, 0));
		const times = computeTaskCompletionTimes(schedule, {
			now,
			activeIndex: 1,
			remainingS: 80,
		});
		expect(times[1].toISOString()).toBe("2026-05-10T22:05:20.000Z");
		expect(times[2].toISOString()).toBe("2026-05-10T22:05:50.000Z");
		expect(times[3].toISOString()).toBe("2026-05-10T22:06:35.000Z");
	});

	test("idle / no-active uses schedule.started as anchor for all tasks", () => {
		const schedule = {
			started,
			tasks: [mkTask(60), mkTask(120)],
		} as never as ServerTypes.schedule;
		const now = new Date(Date.UTC(2026, 4, 10, 22, 10, 0));
		const times = computeTaskCompletionTimes(schedule, {
			now,
			activeIndex: null,
			remainingS: 0,
		});
		expect(times[0].toISOString()).toBe("2026-05-10T22:01:00.000Z");
		expect(times[1].toISOString()).toBe("2026-05-10T22:03:00.000Z");
	});

	test("empty schedule returns empty array", () => {
		const schedule = { started, tasks: [] } as never as ServerTypes.schedule;
		const now = new Date();
		expect(
			computeTaskCompletionTimes(schedule, { now, activeIndex: null, remainingS: 0 }),
		).toEqual([]);
	});

	test("schedule with no started returns empty array (defensive)", () => {
		const schedule = { tasks: [mkTask(60)] } as never as ServerTypes.schedule;
		const now = new Date();
		expect(
			computeTaskCompletionTimes(schedule, { now, activeIndex: null, remainingS: 0 }),
		).toEqual([]);
	});

	test("accepts Date as schedule.started", () => {
		const schedule = {
			started: new Date(Date.UTC(2026, 4, 10, 22, 0, 0)),
			tasks: [mkTask(60)],
		} as never as ServerTypes.schedule;
		const times = computeTaskCompletionTimes(schedule, {
			now: new Date(Date.UTC(2026, 4, 10, 22, 5, 0)),
			activeIndex: null,
			remainingS: 0,
		});
		expect(times[0].toISOString()).toBe("2026-05-10T22:01:00.000Z");
	});
});
