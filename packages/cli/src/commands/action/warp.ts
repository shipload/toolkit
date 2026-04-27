import { type Action, Name } from "@wharfkit/antelope";
import { Command } from "commander";
import { type EntityTypeName, parseInt64 } from "../../lib/args";
import { getShipload } from "../../lib/client";
import type { EntityContext, EntitySubcommand } from "../../lib/entity-scope";
import { withValidation } from "../../lib/errors";
import { checkResolveEntity } from "../../lib/resolve-prompt";
import { transact } from "../../lib/session";
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

interface WarpCliOptions {
	autoResolve?: boolean;
	wait?: boolean;
	track?: boolean;
}

export async function runWarp(
	ctx: EntityContext,
	x: bigint,
	y: bigint,
	options: WarpCliOptions,
): Promise<void> {
	await withValidation(() =>
		checkResolveEntity(ctx.entityType, ctx.entityId, Boolean(options.autoResolve)),
	);
	const action = await buildAction({
		entityType: ctx.entityType,
		entityId: ctx.entityId,
		x,
		y,
	});
	const result = await transact(
		{ action },
		{
			description: `Warping ${ctx.entityType} ${ctx.entityId} to (${x}, ${y})`,
		},
	);
	await maybeAwaitAndPrint(ctx.entityType, ctx.entityId, options, result);
}

export const SUBCOMMAND: EntitySubcommand = {
	name: "warp",
	description: "Warp the ship to coordinates",
	appliesTo: ["ship"],
	build: (ctx) =>
		new Command("warp")
			.description("Warp the ship to coordinates")
			.addHelpText(
				"before",
				"Requires: warp module installed; full energy; ship idle and cargo-empty.\n",
			)
			.argument("<x>", "destination x", parseInt64)
			.argument("<y>", "destination y", parseInt64)
			.option("--auto-resolve", "resolve completed tasks on the target entity before acting")
			.addOption(WAIT_OPTION)
			.addOption(TRACK_OPTION)
			.action(async (x: bigint, y: bigint, opts: WarpCliOptions) => {
				await runWarp(ctx, x, y, opts);
			}),
};
