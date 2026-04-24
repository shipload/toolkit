import { type Action, Name } from "@wharfkit/antelope";
import type { Command } from "commander";
import { type EntityTypeName, parseEntityType, parseUint64 } from "../../lib/args";
import { getShipload } from "../../lib/client";
import { transact } from "../../lib/session";

export interface CancelOpts {
	entityType: EntityTypeName;
	entityId: bigint;
	count: bigint;
}

export async function buildAction(opts: CancelOpts): Promise<Action> {
	const shipload = await getShipload();
	return shipload.actions.cancel(opts.entityId, opts.count, Name.from(opts.entityType));
}

export function register(program: Command): void {
	program
		.command("cancel")
		.description("Cancel pending tasks for an entity (count required)")
		.addHelpText("before", "Requires: pending task that is cancelable.\n")
		.argument("<entity-type>", "entity type (ship/container/warehouse)", parseEntityType)
		.argument("<id>", "entity id", parseUint64)
		.argument("<count>", "number of tasks to cancel", parseUint64)
		.action(async (entityType: EntityTypeName, entityId: bigint, count: bigint) => {
			const action = await buildAction({ entityType, entityId, count });
			await transact(
				{ action },
				{ description: `Cancelling ${count} task(s) for ${entityType} ${entityId}` },
			);
		});
}
