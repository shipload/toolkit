import type { Action } from "@wharfkit/antelope";
import type { Command } from "commander";
import type { Types } from "../../contracts/server";
import { parseInt64, parseUint64 } from "../../lib/args";
import { getShipload } from "../../lib/client";
import { printError } from "../../lib/errors";
import { estimateTravel } from "../../lib/estimate";
import { renderIssues } from "../../lib/feasibility";
import { formatEntity } from "../../lib/format";
import { renderEstimate } from "../../lib/render-estimate";
import { transact } from "../../lib/session";
import { getEntitySnapshot } from "../../lib/snapshot";
import { ValidationError } from "../../lib/validate";
import { waitForEntityIdle } from "../../lib/wait";

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
		.description("Travel a ship to coordinates")
		.addHelpText(
			"before",
			"Requires: idle source ship; sufficient energy for flight; destination within map bounds.\n",
		)
		.argument("<ship-id>", "ship id", parseUint64)
		.argument("<x>", "destination x", parseInt64)
		.argument("<y>", "destination y", parseInt64)
		.option(
			"--recharge",
			"chain a recharge task before travel via the contract's recharge:bool parameter",
		)
		.option("--estimate", "print duration/energy/cargo estimate without submitting")
		.option("--wait", "block until scheduled task completes, then print post-state")
		.option("--force", "submit despite failed feasibility checks (advanced)")
		.action(
			async (
				shipId: bigint,
				x: bigint,
				y: bigint,
				options: {
					recharge?: boolean;
					estimate?: boolean;
					wait?: boolean;
					force?: boolean;
				},
			) => {
				if (options.estimate && options.wait) {
					process.exit(
						printError(
							new ValidationError("--estimate and --wait are mutually exclusive"),
						),
					);
				}
				if (options.estimate) {
					try {
						const est = await estimateTravel({
							entityType: "ship",
							entityId: shipId,
							target: { x, y },
							recharge: Boolean(options.recharge),
						});
						console.log(renderEstimate(est));
					} catch (err) {
						if (err instanceof ValidationError) {
							process.exit(printError(err));
						}
						throw err;
					}
					return;
				}
				const feasibilityEstimate = await estimateTravel({
					entityType: "ship",
					entityId: shipId,
					target: { x, y },
					recharge: Boolean(options.recharge),
				});
				if (!feasibilityEstimate.feasibility.ok) {
					console.error(renderIssues(feasibilityEstimate.feasibility.issues));
					if (!options.force) process.exit(1);
				}
				const action = await buildAction({
					shipId,
					x,
					y,
					recharge: Boolean(options.recharge),
				});
				await transact({ action }, { description: `Ship ${shipId} → (${x}, ${y})` });
				if (options.wait) {
					await waitForEntityIdle({ entityType: "ship", entityId: shipId });
					const snap = await getEntitySnapshot("ship", shipId);
					console.log(formatEntity(snap as unknown as Types.entity_info));
				}
			},
		);
}
