import type { Command } from "commander";
import { type EntityTypeName, parseEntityType, parseUint64 } from "../../lib/args";
import { server } from "../../lib/client";
import { formatOutput, formatTaskType } from "../../lib/format";

const CANCEL_NAMES = ["never", "before-start", "always"];

interface Task {
	type: number;
	duration: number;
	cancelable: number;
	entitygroup?: number;
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

export function render(view: TasksView): string {
	const header = `Entity: ${view.type} ${view.id}  (now: ${iso(view.now)})`;
	if (!view.schedule || view.schedule.tasks.length === 0) {
		return [header, "No tasks scheduled."].join("\n");
	}
	const lines = [
		header,
		`Schedule started: ${iso(view.schedule.started)}`,
		`Tasks (${view.schedule.tasks.length}):`,
	];
	let cursor = view.schedule.started.getTime();
	for (let i = 0; i < view.schedule.tasks.length; i++) {
		const t = view.schedule.tasks[i];
		const start = new Date(cursor);
		const end = new Date(cursor + t.duration * 1000);
		cursor = end.getTime();
		const status = view.now >= end ? "done" : view.now >= start ? "active" : "pending";
		const cancel = CANCEL_NAMES[t.cancelable] ?? `?${t.cancelable}`;
		const group = t.entitygroup ? `  group #${t.entitygroup}` : "";
		lines.push(
			`  [${i}] ${formatTaskType(t.type).padEnd(8)} ${status.padEnd(7)}  ` +
				`start ${iso(start)}  end ${iso(end)}  cancel: ${cancel}${group}`,
		);
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
		.description("Show scheduled + pending tasks for an entity")
		.argument("<entity-type>", "entity type", parseEntityType)
		.argument("<id>", "entity id", parseUint64)
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
