import { type Action, Name } from "@wharfkit/antelope";
import { Command } from "commander";
import { type EntityTypeName, parseUint32, parseUint64 } from "../../lib/args";
import { getShipload } from "../../lib/client";
import type { EntityContext, EntitySubcommand } from "../../lib/entity-scope";
import { withValidation } from "../../lib/errors";
import { checkResolveEntity } from "../../lib/resolve-prompt";
import { transact } from "../../lib/session";

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

interface RmModuleCliOptions {
	target?: bigint;
	autoResolve?: boolean;
}

export async function runRmModule(
	ctx: EntityContext,
	moduleIndex: number,
	options: RmModuleCliOptions,
): Promise<void> {
	await withValidation(() =>
		checkResolveEntity(ctx.entityType, ctx.entityId, Boolean(options.autoResolve)),
	);
	const action = await buildAction({
		entityType: ctx.entityType,
		entityId: ctx.entityId,
		moduleIndex,
		targetCargoId: options.target ?? 0n,
	});
	await transact(
		{ action },
		{
			description: `Removing module from ${ctx.entityType}:${ctx.entityId} slot ${moduleIndex}`,
		},
	);
}

export const SUBCOMMAND: EntitySubcommand = {
	name: "rmmodule",
	description: "Remove a module from the ship",
	appliesTo: ["ship"],
	build: (ctx) =>
		new Command("rmmodule")
			.description("Remove a module from the ship")
			.addHelpText("before", "Requires: ship idle; module slot occupied.\n")
			.argument("<module-index>", "module slot index", parseUint32)
			.option(
				"--target <id>",
				"target cargo id (for modules on cargo NFTs; default 0)",
				parseUint64,
			)
			.option("--auto-resolve", "resolve completed tasks on the target entity before acting")
			.action(async (moduleIndex: number, opts: RmModuleCliOptions) => {
				await runRmModule(ctx, moduleIndex, opts);
			}),
};
