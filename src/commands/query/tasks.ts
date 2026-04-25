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

function iso(d: Date): string {
	return d.toISOString().replace(".000", "");
}

function fmtCoords(c: { x: number; y: number; z: number | null } | null | undefined): string {
	if (!c) return "—";
	return `(${c.x}, ${c.y})`;
}

export function render(view: TasksView): string {
	const timeStr = view.now.toISOString().replace(/.*T/, "").replace(".000Z", "").replace("Z", "") + " UTC";
	const header = `${view.type} ${view.id}  ·  ${timeStr}`;
	const lines: string[] = [header, ""];

	if (!view.schedule || view.schedule.tasks.length === 0) {
		lines.push("  No scheduled tasks.");
		return lines.join("\n");
	}

	const COL_DEST = 10;
	const COL_TYPE = 10;
	const COL_STATUS = 9;
	const COL_DUR = 10;

	lines.push(
		`  ${"#".padEnd(3)}${"dest".padEnd(COL_DEST)}${"type".padEnd(COL_TYPE)}${"status".padEnd(COL_STATUS)}${"duration".padEnd(COL_DUR)}ends`,
	);

	let cursor = view.schedule.started.getTime();
	for (let i = 0; i < view.schedule.tasks.length; i++) {
		const t = view.schedule.tasks[i];
		const start = new Date(cursor);
		const end = new Date(cursor + t.duration * 1000);
		cursor = end.getTime();
		const status = view.now >= end ? "done" : view.now >= start ? "active" : "pending";
		const timeLabel =
			status === "done" ? reltime(end, view.now) : reltime(end, view.now);
		const dest = fmtCoords(t.coordinates);
		const row =
			`  ${String(i).padEnd(3)}` +
			`${dest.padEnd(COL_DEST)}` +
			`${formatTaskType(t.type).padEnd(COL_TYPE)}` +
			`${status.padEnd(COL_STATUS)}` +
			`${formatDuration(t.duration).padEnd(COL_DUR)}` +
			timeLabel;
		lines.push(row);
	}

	return lines.join("\n");
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
