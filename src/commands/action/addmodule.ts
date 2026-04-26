import { type Action, Name } from "@wharfkit/antelope";
import { Command } from "commander";
import { type EntityTypeName, parseUint32, parseUint64 } from "../../lib/args";
import { getShipload } from "../../lib/client";
import type { EntityContext, EntitySubcommand } from "../../lib/entity-scope";
import { withValidation } from "../../lib/errors";
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

interface AddModuleCliOptions {
	target?: bigint;
	autoResolve?: boolean;
}

export async function runAddModule(
	ctx: EntityContext,
	moduleIndex: number,
	moduleCargoId: bigint,
	options: AddModuleCliOptions,
): Promise<void> {
	const addOpts: AddModuleOpts = {
		entityType: ctx.entityType,
		entityId: ctx.entityId,
		moduleIndex,
		moduleCargoId,
		targetCargoId: options.target ?? 0n,
	};
	await withValidation(async () => {
		await checkResolveEntity(ctx.entityType, ctx.entityId, Boolean(options.autoResolve));
		await preflightAddModule(addOpts);
	});
	const action = await buildAction(addOpts);
	await transact(
		{ action },
		{
			description: `Adding module ${moduleCargoId} to ${ctx.entityType}:${ctx.entityId} slot ${moduleIndex}`,
		},
	);
}

export const SUBCOMMAND: EntitySubcommand = {
	name: "addmodule",
	description: "Attach a module cargo to the ship",
	appliesTo: ["ship"],
	build: (ctx) =>
		new Command("addmodule")
			.description("Attach a module cargo to the ship")
			.addHelpText("before", "Requires: ship idle; module cargo present in cargo.\n")
			.argument("<module-index>", "module slot index", parseUint32)
			.argument("<module-cargo-id>", "module cargo id", parseUint64)
			.option(
				"--target <id>",
				"target cargo id (for modules on cargo NFTs; default 0)",
				parseUint64,
			)
			.option("--auto-resolve", "resolve completed tasks on the target entity before acting")
			.action(
				async (moduleIndex: number, moduleCargoId: bigint, opts: AddModuleCliOptions) => {
					await runAddModule(ctx, moduleIndex, moduleCargoId, opts);
				},
			),
};
