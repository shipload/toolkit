import { describe, expect, test } from "bun:test";
import { ServerContract } from "@shipload/sdk";
import { composeBlock, makeProgressRenderer, type ProgressTick } from "../../src/lib/progress";
import { entityInfoToSnapshot } from "../../src/lib/snapshot";

class FakeStream {
	isTTY = true;
	chunks: string[] = [];
	write(s: string): boolean {
		this.chunks.push(s);
		return true;
	}
}

function busyTick(remaining_s: number, elapsed_s: number): ProgressTick {
	const now = new Date();
	const started = new Date(now.getTime() - elapsed_s * 1000).toISOString().slice(0, 23);
	const ei = ServerContract.Types.entity_info.from({
		type: "ship",
		id: 3,
		owner: "alice",
		entity_name: "Stardust",
		coordinates: { x: 102, y: 45, z: 800 },
		item_id: 0,
		cargomass: 312,
		cargo: [],
		modules: [],
		capacity: 500,
		energy: 8420,
		generator: { capacity: 10000, recharge: 5 },
		is_idle: false,
		current_task_elapsed: elapsed_s,
		current_task_remaining: remaining_s,
		pending_tasks: [],
		gatherer_lanes: [],
		crafter_lanes: [],
		loader_lanes: [],
		lanes: [
			{
				lane_key: 0,
				schedule: {
					started,
					tasks: [{ type: 1, duration: 60, cancelable: 0, cargo: [] }],
				},
			},
		],
		holds: [],
	});
	const snap = entityInfoToSnapshot(ei);
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
	const secAgo = completedTasks * 30 + 10;
	const started = new Date(Date.now() - secAgo * 1000).toISOString().slice(0, 23);
	const tasks = new Array(completedTasks).fill(null).map(() => ({
		type: 1,
		duration: 30,
		cancelable: 0,
		cargo: [],
	}));
	const ei = ServerContract.Types.entity_info.from({
		type: "ship",
		id: 3,
		owner: "alice",
		entity_name: "Stardust",
		coordinates: { x: 110, y: 50, z: 800 },
		item_id: 0,
		cargomass: 312,
		cargo: [],
		modules: [],
		capacity: 500,
		energy: 9320,
		generator: { capacity: 10000, recharge: 5 },
		is_idle: true,
		current_task_elapsed: 0,
		current_task_remaining: 0,
		pending_tasks: [],
		gatherer_lanes: [],
		crafter_lanes: [],
		loader_lanes: [],
		lanes: completedTasks > 0
			? [{ lane_key: 0, schedule: { started, tasks } }]
			: [],
		holds: [],
	});
	const snap = entityInfoToSnapshot(ei);
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

describe("composeBlock multi-lane", () => {
	test("busy tick with mobility travel done and worker gather+craft renders lane tags", () => {
		const at = new Date();
		const ei = ServerContract.Types.entity_info.from({
			type: "ship",
			id: 7,
			owner: "bob",
			entity_name: "Freighter",
			coordinates: { x: 3, y: 9, z: 800 },
			item_id: 0,
			cargomass: 0,
			cargo: [],
			modules: [],
			is_idle: false,
			current_task_elapsed: 0,
			current_task_remaining: 0,
			pending_tasks: [],
			gatherer_lanes: [],
			crafter_lanes: [],
			loader_lanes: [],
			lanes: [
				{
					lane_key: 0,
					schedule: {
						started: new Date(at.getTime() - 120_000).toISOString().slice(0, 23),
						tasks: [{ type: 1, duration: 60, cancelable: 0, coordinates: { x: 3, y: 9, z: 800 }, cargo: [] }],
					},
				},
				{
					lane_key: 3,
					schedule: {
						started: new Date(at.getTime() - 60_000).toISOString().slice(0, 23),
						tasks: [
							{ type: 5, duration: 300, cancelable: 0, cargo: [] },
							{ type: 7, duration: 540, cancelable: 2, cargo: [] },
						],
					},
				},
			],
			holds: [],
		});
		const snap = entityInfoToSnapshot(ei);
		const tick: ProgressTick = {
			snap,
			elapsed_s: 60,
			remaining_s: 240,
			total_s: 300,
			sinceLastFetch_s: 1,
			fetchInterval_s: 5,
		};
		const output = composeBlock(tick).join("\n");
		expect(output).toContain("L3");
		expect(output).toContain("Gather");
		expect(output).toContain("Craft");
		expect(output).toContain("▶");
	});
});
