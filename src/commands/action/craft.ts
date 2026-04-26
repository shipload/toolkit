import { type Action, Name } from "@wharfkit/antelope";
import { Command } from "commander";
import { Types as ServerTypes } from "../../contracts/server";
import { appendCargoInput, type EntityTypeName, parseUint16, parseUint32 } from "../../lib/args";
import {
	type ParsedCargoInput,
	type ResolvedCargoInput,
	resolveCargoInputs,
} from "../../lib/cargo-resolve";
import { getShipload } from "../../lib/client";
import type { EntityContext, EntitySubcommand } from "../../lib/entity-scope";
import { assertNotBoth, withValidation } from "../../lib/errors";
import { estimateCraft } from "../../lib/estimate";
import { renderIssues } from "../../lib/feasibility";
import { renderEstimate } from "../../lib/render-estimate";
import { checkResolveEntity } from "../../lib/resolve-prompt";
import { transact } from "../../lib/session";
import { getEntitySnapshot } from "../../lib/snapshot";
import { maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION } from "../../lib/wait";
import { buildAction as buildRechargeAction } from "./recharge";

export interface CraftOpts {
	entityType: EntityTypeName;
	entityId: bigint;
	recipeId: number;
	quantity: number;
	inputs: ResolvedCargoInput[];
}

export async function buildAction(opts: CraftOpts): Promise<Action> {
	const shipload = await getShipload();
	const cargoInputs = opts.inputs.map((i) =>
		ServerTypes.cargo_item.from({
			item_id: i.itemId,
			quantity: i.quantity,
			stats: i.stats,
			modules: [],
		}),
	);
	return shipload.actions.craft(
		Name.from(opts.entityType),
		opts.entityId,
		opts.recipeId,
		opts.quantity,
		cargoInputs,
	);
}

type CraftCliOptions = {
	input: ParsedCargoInput[];
	autoResolve?: boolean;
	estimate?: boolean;
	wait?: boolean;
	track?: boolean;
	force?: boolean;
	recharge?: boolean;
};

export async function runCraft(
	ctx: EntityContext,
	recipeId: number,
	quantity: number,
	options: CraftCliOptions,
): Promise<void> {
	assertNotBoth(options, ["estimate", "wait"], ["estimate", "track"]);
	await withValidation(async () => {
		if (!options.estimate) {
			await checkResolveEntity(ctx.entityType, ctx.entityId, Boolean(options.autoResolve));
		}
		const snap = await getEntitySnapshot(ctx.entityType, ctx.entityId);
		const resolved = resolveCargoInputs(
			options.input,
			snap.cargo as unknown as ServerTypes.cargo_item[],
		);
		const est = await estimateCraft({
			entityType: ctx.entityType,
			entityId: ctx.entityId,
			recipeId,
			quantity,
			inputs: resolved,
			snapshot: snap,
			recharge: Boolean(options.recharge),
		});
		if (options.estimate) {
			console.log(renderEstimate(est));
			return;
		}
		if (!est.feasibility.ok) {
			console.error(renderIssues(est.feasibility.issues));
			if (!options.force) process.exit(1);
		}
		const action = await buildAction({
			entityType: ctx.entityType,
			entityId: ctx.entityId,
			recipeId,
			quantity,
			inputs: resolved,
		});
		const result = options.recharge
			? await transact(
					{
						actions: [
							await buildRechargeAction({
								entityType: ctx.entityType,
								entityId: ctx.entityId,
							}),
							action,
						],
					},
					{ description: `Recharge + craft recipe ${recipeId} x${quantity}` },
				)
			: await transact(
					{ action },
					{ description: `Crafting recipe ${recipeId} x${quantity}` },
				);
		await maybeAwaitAndPrint(ctx.entityType, ctx.entityId, options, result);
	});
}

export const SUBCOMMAND: EntitySubcommand = {
	name: "craft",
	description: "Craft items from a recipe",
	appliesTo: ["ship"],
	build: (ctx) =>
		new Command("craft")
			.description("Craft items from a recipe")
			.addHelpText(
				"before",
				"Requires: ship is idle; all inputs are in cargo; Crafter module in a ship slot.\n",
			)
			.argument("<recipe-id>", "output item id from the recipe command", parseUint16)
			.argument("<quantity>", "number of times to run the recipe", parseUint32)
			.option(
				"--input <val>",
				"cargo input as item-id:quantity or item-id:quantity:stats — repeat for each input slot (auto-matches if only one stack available)",
				appendCargoInput,
				[] as ParsedCargoInput[],
			)
			.option("--auto-resolve", "resolve completed tasks on the target entity before acting")
			.option("--estimate", "print duration/energy/cargo estimate without submitting")
			.addOption(WAIT_OPTION)
			.addOption(TRACK_OPTION)
			.option("--force", "submit despite failed feasibility checks (advanced)")
			.option("--recharge", "recharge to full energy before crafting")
			.action(async (recipeId: number, quantity: number, opts: CraftCliOptions) => {
				await runCraft(ctx, recipeId, quantity, opts);
			}),
};
