import type { Command } from "commander";
import { type EntityTypeName, parseEntityType, parseUint64 } from "../../lib/args";
import { server } from "../../lib/client";
import { formatEntity, formatOutput } from "../../lib/format";

export function render(info: any): string {
	return formatEntity(info);
}

async function runEntity(
	entityType: EntityTypeName,
	id: bigint,
	opts: { json?: boolean },
): Promise<void> {
	const data = await server.readonly("getentity", { entity_type: entityType, entity_id: id });
	console.log(formatOutput(data, { json: Boolean(opts.json) }, render));
}

export function register(program: Command): void {
	program
		.command("entity")
		.description("Show full state for a single entity")
		.argument("<entity-type>", "entity type (ship/container/warehouse)", parseEntityType)
		.argument("<id>", "numeric entity id", parseUint64)
		.option("--json", "emit JSON instead of formatted text")
		.action(async (entityType: EntityTypeName, id: bigint, opts: { json?: boolean }) => {
			await runEntity(entityType, id, opts);
		});

	for (const [name, type] of [
		["ship", "ship"],
		["container", "container"],
		["warehouse", "warehouse"],
	] as [string, EntityTypeName][]) {
		program
			.command(name)
			.description(`Show full state for a ${type} (shorthand for \`entity ${type} <id>\`)`)
			.argument("<id>", `${type} id`, parseUint64)
			.option("--json", "emit JSON instead of formatted text")
			.action(async (id: bigint, opts: { json?: boolean }) => {
				await runEntity(type, id, opts);
			});
	}
}
