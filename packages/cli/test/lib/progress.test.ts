import { describe, expect, test } from "bun:test";
import { makeProgressRenderer, type ProgressTick } from "../../src/lib/progress";
import type { EntitySnapshot } from "../../src/lib/snapshot";

class FakeStream {
	isTTY = true;
	chunks: string[] = [];
	write(s: string): boolean {
		this.chunks.push(s);
		return true;
	}
}

function busyTick(remaining_s: number, elapsed_s: number): ProgressTick {
	const snap: EntitySnapshot = {
		type: "ship",
		id: 3n,
		owner: "alice",
		entity_name: "Stardust",
		coordinates: { x: 102, y: 45 },
		cargomass: 312,
		cargo: [],
		capacity: 500,
		energy: 8420,
		generator: { capacity: 10000, recharge: 5 },
		is_idle: false,
		current_task: { type: 1, duration: 60n } as never,
		current_task_elapsed: elapsed_s,
		current_task_remaining: remaining_s,
		pending_tasks: [],
		schedule: { tasks: [{ type: 1, duration: 60n } as never] },
	};
	return {
		snap,
		elapsed_s,
		remaining_s,
		total_s: elapsed_s + remaining_s,
		sinceLastFetch_s: 1,
		fetchInterval_s: 5,
	};
}

function idleTick(completedTasks: number): ProgressTick {
	const snap: EntitySnapshot = {
		type: "ship",
		id: 3n,
		owner: "alice",
		entity_name: "Stardust",
		coordinates: { x: 110, y: 50 },
		cargomass: 312,
		cargo: [],
		capacity: 500,
		energy: 9320,
		generator: { capacity: 10000, recharge: 5 },
		is_idle: true,
		schedule: {
			tasks: new Array(completedTasks).fill({ type: 1, duration: 30n }),
		},
	};
	return {
		snap,
		elapsed_s: 0,
		remaining_s: 0,
		total_s: 0,
		sinceLastFetch_s: 4,
		fetchInterval_s: 5,
	};
}

describe("makeProgressRenderer", () => {
	test("busy tick frame is stable", () => {
		const out = new FakeStream();
		const renderer = makeProgressRenderer(out as unknown as NodeJS.WriteStream);
		renderer.tick(busyTick(42, 18));
		renderer.done();
		expect(out.chunks.join("")).toMatchSnapshot();
	});

	test("idle-with-pending-resolve frame is stable", () => {
		const out = new FakeStream();
		const renderer = makeProgressRenderer(out as unknown as NodeJS.WriteStream);
		renderer.tick(idleTick(3));
		renderer.done();
		expect(out.chunks.join("")).toMatchSnapshot();
	});

	test("non-TTY single-line frame is stable", () => {
		const out = new FakeStream();
		out.isTTY = false;
		const renderer = makeProgressRenderer(out as unknown as NodeJS.WriteStream);
		renderer.tick(busyTick(42, 18));
		renderer.done();
		expect(out.chunks.join("")).toMatchSnapshot();
	});
});
