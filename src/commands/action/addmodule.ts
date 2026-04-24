import { type Action, Name } from "@wharfkit/antelope";
import type { Command } from "commander";
import { type EntityTypeName, parseEntityType, parseUint32, parseUint64 } from "../../lib/args";
import { getShipload } from "../../lib/client";
import { printError } from "../../lib/errors";
import { checkResolveEntity } from "../../lib/resolve-prompt";
import { transact } from "../../lib/session";
import { getEntitySnapshot } from "../../lib/snapshot";
import { ValidationError } from "../../lib/validate";

export interface AddModuleOpts {
	entityType: EntityTypeName;
	entityId: bigint;
	moduleIndex: number;
	moduleCargoId: bigint;
	targetCargoId: bigint;
}

async function preflightAddModule(opts: AddModuleOpts): Promise<void> {
	const snap = await getEntitySnapshot(opts.entityType, opts.entityId);
	const target = Number(opts.moduleCargoId.toString());
	const hasModule = snap.cargo.some((c) => {
		const qty = Number(c.quantity.toString());
		const id = Number(c.item_id.toString());
		return id === target && qty > 0;
	});
	if (!hasModule) {
		throw new ValidationError(
			`No module with item id ${opts.moduleCargoId} in ${opts.entityType} ${opts.entityId} cargo.`,
		);
	}
}

export async function buildAction(opts: AddModuleOpts): Promise<Action> {
	const shipload = await getShipload();
	return shipload.actions.addmodule(
		Name.from(opts.entityType),
		opts.entityId,
		opts.moduleIndex,
		opts.moduleCargoId,
		opts.targetCargoId,
	);
}

export function register(program: Command): void {
	program
		.command("addmodule")
		.description("Attach a module cargo to an entity")
		.addHelpText("before", "Requires: entity idle; module cargo present in cargo.\n")
		.argument("<entity-type>", "entity type", parseEntityType)
		.argument("<entity-id>", "entity id", parseUint64)
		.argument("<module-index>", "module slot index", parseUint32)
		.argument("<module-cargo-id>", "module cargo id", parseUint64)
		.option("--target <id>", "target cargo id (for modules on cargo NFTs)", "0")
		.option("--auto-resolve", "resolve completed tasks on the target entity before acting")
		.action(
			async (
				entityType: EntityTypeName,
				entityId: bigint,
				moduleIndex: number,
				moduleCargoId: bigint,
				options: { target: string; autoResolve?: boolean },
			) => {
				const addOpts: AddModuleOpts = {
					entityType,
					entityId,
					moduleIndex,
					moduleCargoId,
					targetCargoId: parseUint64(options.target),
				};
				try {
					await checkResolveEntity(entityType, entityId, Boolean(options.autoResolve));
					await preflightAddModule(addOpts);
				} catch (err) {
					if (err instanceof ValidationError) {
						process.exit(printError(err));
					}
					throw err;
				}
				const action = await buildAction(addOpts);
				await transact(
					{ action },
					{
						description: `Adding module ${moduleCargoId} to ${entityType}:${entityId} slot ${moduleIndex}`,
					},
				);
			},
		);
}
