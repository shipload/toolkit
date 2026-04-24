import type { Command } from "commander";
import { type EntityTypeName, parseEntityType, parseUint64 } from "../../lib/args";
import { server } from "../../lib/client";
import { formatEntity, formatOutput } from "../../lib/format";

export function render(info: any): string {
	return formatEntity(info);
}

export function register(program: Command): void {
	program
		.command("entity")
		.description("Show entity state (via getentity)")
		.argument("<entity-type>", "entity type (ship/warehouse/container)", parseEntityType)
		.argument("<id>", "entity id", parseUint64)
		.option("--json", "emit JSON instead of formatted text")
		.action(async (entityType: EntityTypeName, id: bigint, opts: { json?: boolean }) => {
			const data = await server.readonly("getentity", {
				entity_type: entityType,
				entity_id: id,
			});
			console.log(formatOutput(data, { json: Boolean(opts.json) }, render));
		});
}
