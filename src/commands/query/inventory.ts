import type { Command } from "commander";
import { type EntityTypeName, parseEntityType, parseUint64 } from "../../lib/args";
import { server } from "../../lib/client";
import { formatCargo, formatOutput } from "../../lib/format";

export interface InventoryData {
	entityType: string;
	id: bigint;
	cargo: any[];
}

export function render(entityType: string, id: bigint, cargo: any[]): string {
	const header = `Inventory for ${entityType} ${id}:`;
	if (cargo.length === 0) return `${header}\n  (empty)`;
	const lines = formatCargo(cargo)
		.split("\n")
		.map((l) => `  ${l}`);
	return [header, ...lines].join("\n");
}

export function register(program: Command): void {
	program
		.command("inventory")
		.description("Show cargo inventory for an entity")
		.argument("<entity-type>", "entity type (ship/warehouse/container)", parseEntityType)
		.argument("<id>", "entity id", parseUint64)
		.option("--json", "emit JSON instead of formatted text")
		.action(async (entityType: EntityTypeName, id: bigint, opts: { json?: boolean }) => {
			const info = (await server.readonly("getentity", {
				entity_type: entityType,
				entity_id: id,
			})) as any;
			const data: InventoryData = { entityType, id, cargo: info.cargo ?? [] };
			console.log(
				formatOutput(data, { json: Boolean(opts.json) }, (d) =>
					render(d.entityType, d.id, d.cargo),
				),
			);
		});
}
