import { Command } from "commander";
import { ALL_ENTITY_TYPES } from "../../lib/args";
import { server } from "../../lib/client";
import type { EntityContext, EntitySubcommand } from "../../lib/entity-scope";
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

export async function runInventory(
	ctx: EntityContext,
	opts: { json?: boolean },
): Promise<void> {
	const info = (await server.readonly("getentity", {
		entity_type: ctx.entityType,
		entity_id: ctx.entityId,
	})) as any;
	const data: InventoryData = {
		entityType: ctx.entityType,
		id: ctx.entityId,
		cargo: info.cargo ?? [],
	};
	console.log(
		formatOutput(data, { json: Boolean(opts.json) }, (d) => render(d.entityType, d.id, d.cargo)),
	);
}

export const SUBCOMMAND: EntitySubcommand = {
	name: "inventory",
	description: "Show cargo inventory for an entity",
	appliesTo: ALL_ENTITY_TYPES,
	build: (ctx) =>
		new Command("inventory")
			.description("Show cargo inventory for an entity")
			.option("--json", "emit JSON instead of formatted text")
			.action(async (opts: { json?: boolean }) => {
				await runInventory(ctx, opts);
			}),
};
