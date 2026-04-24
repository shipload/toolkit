import { type Action, Name } from "@wharfkit/antelope";
import type { Command } from "commander";
import { Types as ServerTypes } from "../../contracts/server";
import {
	type EntityTypeName,
	parseCargoInput,
	parseEntityType,
	parseUint32,
	parseUint64,
} from "../../lib/args";
import {
	type ParsedCargoInput,
	type ResolvedCargoInput,
	resolveCargoInputs,
} from "../../lib/cargo-resolve";
import { getShipload } from "../../lib/client";
import { printError } from "../../lib/errors";
import { estimateCraft } from "../../lib/estimate";
import { renderIssues } from "../../lib/feasibility";
import { formatEntity } from "../../lib/format";
import { renderEstimate } from "../../lib/render-estimate";
import { checkResolveEntity } from "../../lib/resolve-prompt";
import { transact } from "../../lib/session";
import { getEntitySnapshot } from "../../lib/snapshot";
import { ValidationError } from "../../lib/validate";
import { waitForEntityIdle } from "../../lib/wait";
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

export function register(program: Command): void {
	program
		.command("craft")
		.description("Craft items from a recipe")
		.addHelpText(
			"before",
			"Requires: idle crafter entity; all declared inputs in cargo; crafter module installed.\n",
		)
		.argument("<entity-type>", "entity type", parseEntityType)
		.argument("<entity-id>", "entity id", parseUint64)
		.argument("<recipe-id>", "recipe id", parseUint32)
		.argument("<quantity>", "quantity", parseUint32)
		.option(
			"--input <val>",
			"cargo input item:qty (omit stats to auto-match when unambiguous; or item:qty:<packed-uint>, repeatable)",
			(val: string, acc: ParsedCargoInput[] = []) => {
				acc.push(parseCargoInput(val));
				return acc;
			},
			[] as ParsedCargoInput[],
		)
		.option("--auto-resolve", "resolve completed tasks on the target entity before acting")
		.option("--estimate", "print duration/energy/cargo estimate without submitting")
		.option("--wait", "block until scheduled task completes, then print post-state")
		.option("--force", "submit despite failed feasibility checks (advanced)")
		.option(
			"--recharge",
			"prepend a recharge action to the same signed transaction (recharges to full)",
		)
		.action(
			async (
				entityType: EntityTypeName,
				entityId: bigint,
				recipeId: number,
				quantity: number,
				options: {
					input: ParsedCargoInput[];
					autoResolve?: boolean;
					estimate?: boolean;
					wait?: boolean;
					force?: boolean;
					recharge?: boolean;
				},
			) => {
				if (options.estimate && options.wait) {
					process.exit(
						printError(
							new ValidationError("--estimate and --wait are mutually exclusive"),
						),
					);
				}
				try {
					if (!options.estimate) {
						await checkResolveEntity(
							entityType,
							entityId,
							Boolean(options.autoResolve),
						);
					}
					const snap = await getEntitySnapshot(entityType, entityId);
					const resolved = resolveCargoInputs(
						options.input,
						snap.cargo as unknown as ServerTypes.cargo_item[],
					);
					const est = await estimateCraft({
						entityType,
						entityId,
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
						entityType,
						entityId,
						recipeId,
						quantity,
						inputs: resolved,
					});
					if (options.recharge) {
						const rechargeAction = await buildRechargeAction({ entityType, entityId });
						await transact(
							{ actions: [rechargeAction, action] },
							{ description: `Recharge + craft recipe ${recipeId} x${quantity}` },
						);
					} else {
						await transact(
							{ action },
							{ description: `Crafting recipe ${recipeId} x${quantity}` },
						);
					}
					if (options.wait) {
						await waitForEntityIdle({ entityType, entityId });
						const postSnap = await getEntitySnapshot(entityType, entityId);
						console.log(formatEntity(postSnap as unknown as ServerTypes.entity_info));
					}
				} catch (err) {
					if (err instanceof ValidationError) {
						process.exit(printError(err));
					}
					throw err;
				}
			},
		);
}
