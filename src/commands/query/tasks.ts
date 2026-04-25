import Table from "cli-table3";
import type { Command } from "commander";
import { type EntityTypeName, parseEntityType, parseUint64 } from "../../lib/args";
import { server } from "../../lib/client";
import { formatDuration, formatOutput, formatTaskType, reltime } from "../../lib/format";

const CANCEL_NAMES = ["never", "before-start", "always"];

interface Task {
	type: number;
	duration: number;
	cancelable: number;
	entitygroup?: number | null;
	coordinates?: { x: number; y: number; z: number | null } | null;
	energy_cost?: number | null;
}

interface TasksView {
	type: string;
	id: bigint;
	schedule: { started: Date; tasks: Task[] } | null;
	pending: Task[];
	now: Date;
}

function fmtCoords(c: { x: number; y: number; z: number | null } | null | undefined): string {
	if (!c) return "—";
	return `(${c.x}, ${c.y})`;
}

export function render(view: TasksView): string {
	const timeStr =
		view.now.toISOString().replace(/.*T/, "").replace(".000Z", "").replace("Z", "") + " UTC";
	const header = `${view.type} ${view.id}  ·  ${timeStr}`;

	if (!view.schedule || view.schedule.tasks.length === 0) {
		return [header, "", "  No scheduled tasks."].join("\n");
	}

	const table = new Table({
		chars: {
			top: "", "top-mid": "", "top-left": "", "top-right": "",
			bottom: "", "bottom-mid": "", "bottom-left": "", "bottom-right": "",
			left: "  ", "left-mid": "", mid: "", "mid-mid": "",
			right: "", "right-mid": "", middle: "  ",
		},
		style: { head: [], border: [] },
		head: ["#", "dest", "type", "status", "duration", "ends"],
		colAligns: ["left", "left", "left", "left", "left", "left"],
	});

	let cursor = view.schedule.started.getTime();
	for (let i = 0; i < view.schedule.tasks.length; i++) {
		const t = view.schedule.tasks[i];
		const start = new Date(cursor);
		const end = new Date(cursor + t.duration * 1000);
		cursor = end.getTime();
		const status = view.now >= end ? "done" : view.now >= start ? "active" : "pending";
		const endsLabel = reltime(end, view.now);
		table.push([String(i), fmtCoords(t.coordinates), formatTaskType(t.type), status, formatDuration(t.duration), endsLabel]);
	}

	return [header, "", table.toString()].join("\n");
}

function viewToJson(view: TasksView): Record<string, unknown> {
	return {
		type: view.type,
		id: view.id,
		schedule: view.schedule
			? {
					started: view.schedule.started.toISOString(),
					tasks: view.schedule.tasks,
				}
			: null,
		pending: view.pending,
		now: view.now.toISOString(),
	};
}

export function register(program: Command): void {
	program
		.command("tasks")
		.description("Show scheduled and pending tasks for an entity")
		.argument("<entity-type>", "entity type (ship/container/warehouse)", parseEntityType)
		.argument("<id>", "numeric entity ID", parseUint64)
		.option("--json", "emit JSON instead of formatted text")
		.action(async (entityType: EntityTypeName, entityId: bigint, opts: { json?: boolean }) => {
			const info = (await server.readonly("getentity", {
				entity_type: entityType,
				entity_id: entityId,
			})) as unknown as {
				schedule?: { started: { toMilliseconds(): number }; tasks: Task[] };
				pending_tasks?: Task[];
			};
			const view: TasksView = {
				type: entityType,
				id: entityId,
				schedule: info.schedule
					? {
							started: new Date(info.schedule.started.toMilliseconds()),
							tasks: info.schedule.tasks ?? [],
						}
					: null,
				pending: info.pending_tasks ?? [],
				now: new Date(),
			};
			if (opts.json) {
				console.log(formatOutput(viewToJson(view), { json: true }, () => ""));
			} else {
				console.log(render(view));
			}
		});
}
