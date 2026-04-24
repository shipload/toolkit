import { type Action, Name } from "@wharfkit/antelope";
import type { Command } from "commander";
import { type EntityTypeName, parseEntityType, parseUint64 } from "../../lib/args";
import { getShipload } from "../../lib/client";
import { transact } from "../../lib/session";

export interface ResolveOpts {
	entityType: EntityTypeName;
	entityId: bigint;
	count?: bigint;
}

export async function buildAction(opts: ResolveOpts): Promise<Action> {
	const shipload = await getShipload();
	return shipload.actions.resolve(opts.entityId, Name.from(opts.entityType), opts.count);
}

export function register(program: Command): void {
	program
		.command("resolve")
		.description("Resolve completed tasks for an entity")
		.addHelpText("before", "Requires: entity with completed tasks.\n")
		.argument("<entity-type>", "entity type (ship/container/warehouse)", parseEntityType)
		.argument("<id>", "entity id", parseUint64)
		.option("--count <n>", "number of tasks to resolve (default: all completed)", parseUint64)
		.action(
			async (entityType: EntityTypeName, entityId: bigint, options: { count?: bigint }) => {
				const action = await buildAction({ entityType, entityId, count: options.count });
				await transact({ action }, { description: `Resolving ${entityType} ${entityId}` });
			},
		);
}
