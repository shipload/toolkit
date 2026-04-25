import { type Action, Name } from "@wharfkit/antelope";

import type { Command } from "commander";
import { type EntityTypeName, parseEntityType, parseInt64, parseUint64 } from "../../lib/args";
import { getShipload } from "../../lib/client";
import { printError } from "../../lib/errors";
import { checkResolveEntity } from "../../lib/resolve-prompt";
import { transact } from "../../lib/session";
import { ValidationError } from "../../lib/validate";
import { maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION } from "../../lib/wait";

export interface WarpOpts {
	entityType: EntityTypeName;
	entityId: bigint;
	x: bigint;
	y: bigint;
}

export async function buildAction(opts: WarpOpts): Promise<Action> {
	const shipload = await getShipload();
	return shipload.actions.warp(
		opts.entityId,
		{ x: opts.x, y: opts.y },
		Name.from(opts.entityType),
	);
}

export function register(program: Command): void {
	program
		.command("warp")
		.description("Warp an entity to coordinates")
		.addHelpText(
			"before",
			"Requires: warp module installed; full energy; ship idle and cargo-empty.\n",
		)
		.argument("<entity-type>", "entity type (ship/container/warehouse)", parseEntityType)
		.argument("<id>", "entity id", parseUint64)
		.argument("<x>", "destination x", parseInt64)
		.argument("<y>", "destination y", parseInt64)
		.option("--auto-resolve", "resolve completed tasks on the target entity before acting")
		.addOption(WAIT_OPTION)
		.addOption(TRACK_OPTION)
		.action(
			async (
				entityType: EntityTypeName,
				entityId: bigint,
				x: bigint,
				y: bigint,
				options: { autoResolve?: boolean; wait?: boolean; track?: boolean },
			) => {
				try {
					await checkResolveEntity(entityType, entityId, Boolean(options.autoResolve));
				} catch (err) {
					if (err instanceof ValidationError) {
						process.exit(printError(err));
					}
					throw err;
				}
				const action = await buildAction({ entityType, entityId, x, y });
				const result = await transact(
					{ action },
					{
						description: `Warping ${entityType} ${entityId} to (${x}, ${y})`,
					},
				);
				await maybeAwaitAndPrint(entityType, entityId, options, result);
			},
		);
}
