import type { Action } from "@wharfkit/antelope";
import type { Command } from "commander";
import { type EntityTypeName, parseEntityType, parseInt64, parseUint64 } from "../../lib/args";
import { getShipload } from "../../lib/client";
import { assertNotBoth, printError } from "../../lib/errors";
import { type EstimateResult, estimateTravel } from "../../lib/estimate";
import { renderIssues } from "../../lib/feasibility";
import { renderEstimate } from "../../lib/render-estimate";
import { transact } from "../../lib/session";
import { ValidationError } from "../../lib/validate";
import { awaitAndPrint, WAIT_OPTION } from "../../lib/wait";

export interface TravelOpts {
	shipId: bigint;
	x: bigint;
	y: bigint;
	recharge: boolean;
}

export async function buildAction(opts: TravelOpts): Promise<Action> {
	const shipload = await getShipload();
	return shipload.actions.travel(opts.shipId, { x: opts.x, y: opts.y }, opts.recharge);
}

export function register(program: Command): void {
	program
		.command("travel")
		.description("Travel an entity to coordinates")
		.addHelpText(
			"before",
			"Requires: idle source entity; sufficient energy for flight; destination within map bounds.\n",
		)
		.argument("<entity-type>", "entity type (currently only ship)", parseEntityType)
		.argument("<id>", "entity id", parseUint64)
		.argument("<x>", "destination x", parseInt64)
		.argument("<y>", "destination y", parseInt64)
		.option(
			"--recharge",
			"chain a recharge task before travel via the contract's recharge:bool parameter",
		)
		.option("--estimate", "print duration/energy/cargo estimate without submitting")
		.addOption(WAIT_OPTION)
		.option("--force", "submit despite failed feasibility checks (advanced)")
		.action(
			async (
				entityType: EntityTypeName,
				id: bigint,
				x: bigint,
				y: bigint,
				options: {
					recharge?: boolean;
					estimate?: boolean;
					wait?: boolean;
					force?: boolean;
				},
			) => {
				if (entityType !== "ship") {
					process.exit(
						printError(
							new ValidationError(
								`travel currently supports only ships (got "${entityType}")`,
							),
						),
					);
				}
				assertNotBoth(options, "estimate", "wait");
				let est: EstimateResult;
				try {
					est = await estimateTravel({
						entityType: "ship",
						entityId: id,
						target: { x, y },
						recharge: Boolean(options.recharge),
					});
				} catch (err) {
					if (err instanceof ValidationError) {
						process.exit(printError(err));
					}
					throw err;
				}
				if (options.estimate) {
					console.log(renderEstimate(est));
					return;
				}
				if (!est.feasibility.ok) {
					console.error(renderIssues(est.feasibility.issues));
					if (!options.force) process.exit(1);
				}
				const action = await buildAction({
					shipId: id,
					x,
					y,
					recharge: Boolean(options.recharge),
				});
				await transact({ action }, { description: `Ship ${id} → (${x}, ${y})` });
				if (options.wait) {
					await awaitAndPrint("ship", id);
				}
			},
		);
}
