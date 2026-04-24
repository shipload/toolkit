import { type Action, Name } from "@wharfkit/antelope";
import type { Command } from "commander";
import { type EntityTypeName, parseEntityType, parseUint32, parseUint64 } from "../../lib/args";
import { getShipload } from "../../lib/client";
import { printError } from "../../lib/errors";
import { checkResolveEntity } from "../../lib/resolve-prompt";
import { transact } from "../../lib/session";
import { ValidationError } from "../../lib/validate";

export interface RmModuleOpts {
	entityType: EntityTypeName;
	entityId: bigint;
	moduleIndex: number;
	targetCargoId: bigint;
}

export async function buildAction(opts: RmModuleOpts): Promise<Action> {
	const shipload = await getShipload();
	return shipload.actions.rmmodule(
		Name.from(opts.entityType),
		opts.entityId,
		opts.moduleIndex,
		opts.targetCargoId,
	);
}

export function register(program: Command): void {
	program
		.command("rmmodule")
		.description("Remove a module from an entity")
		.addHelpText("before", "Requires: entity idle; module slot occupied.\n")
		.argument("<entity-type>", "entity type", parseEntityType)
		.argument("<entity-id>", "entity id", parseUint64)
		.argument("<module-index>", "module slot index", parseUint32)
		.option("--target <id>", "target cargo id (for modules on cargo NFTs)", "0")
		.option("--auto-resolve", "resolve completed tasks on the target entity before acting")
		.action(
			async (
				entityType: EntityTypeName,
				entityId: bigint,
				moduleIndex: number,
				options: { target: string; autoResolve?: boolean },
			) => {
				try {
					await checkResolveEntity(entityType, entityId, Boolean(options.autoResolve));
				} catch (err) {
					if (err instanceof ValidationError) {
						process.exit(printError(err));
					}
					throw err;
				}
				const action = await buildAction({
					entityType,
					entityId,
					moduleIndex,
					targetCargoId: parseUint64(options.target),
				});
				await transact(
					{ action },
					{
						description: `Removing module from ${entityType}:${entityId} slot ${moduleIndex}`,
					},
				);
			},
		);
}
