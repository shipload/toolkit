import type { Action } from "@wharfkit/antelope";
import { Command } from "commander";
import { parseInt64 } from "../../lib/args";
import { getShipload } from "../../lib/client";
import { assertNotBoth, withValidation } from "../../lib/errors";
import type { EntityContext, EntitySubcommand } from "../../lib/entity-scope";
import { estimateTravel } from "../../lib/estimate";
import { renderIssues } from "../../lib/feasibility";
import { renderEstimate, renderTravelSummary } from "../../lib/render-estimate";
import { transact } from "../../lib/session";
import { maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION } from "../../lib/wait";

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

type TravelCliOptions = {
	recharge?: boolean;
	estimate?: boolean;
	wait?: boolean;
	track?: boolean;
	force?: boolean;
};

export async function runTravel(
	ctx: EntityContext,
	x: bigint,
	y: bigint,
	options: TravelCliOptions,
): Promise<void> {
	assertNotBoth(options, ["estimate", "wait"], ["estimate", "track"]);
	const est = await withValidation(() =>
		estimateTravel({
			entityType: "ship",
			entityId: ctx.entityId,
			target: { x, y },
			recharge: Boolean(options.recharge),
		}),
	);
	const summary = est.travel ? renderTravelSummary(est.travel, ctx.entityId) : null;
	if (options.estimate) {
		const body = summary ?? renderEstimate(est);
		const issues = est.feasibility.issues;
		console.log(issues.length > 0 ? `${renderIssues(issues)}\n${body}` : body);
		return;
	}
	if (!est.feasibility.ok) {
		console.error(renderIssues(est.feasibility.issues));
		if (!options.force) process.exit(1);
	}
	const action = await buildAction({
		shipId: ctx.entityId,
		x,
		y,
		recharge: Boolean(options.recharge),
	});
	const result = await transact(
		{ action },
		{ description: summary ?? `Ship ${ctx.entityId} → (${x}, ${y})` },
	);
	if (!result.txid) return;
	await maybeAwaitAndPrint("ship", ctx.entityId, options, result);
}

export const SUBCOMMAND: EntitySubcommand = {
	name: "travel",
	description: "Travel the ship to coordinates",
	appliesTo: ["ship"],
	build: (ctx) =>
		new Command("travel")
			.description("Travel the ship to coordinates")
			.addHelpText(
				"before",
				"Requires: idle ship; sufficient energy for flight; destination within map bounds.\n",
			)
			.argument("<x>", "destination x", parseInt64)
			.argument("<y>", "destination y", parseInt64)
			.option(
				"--recharge",
				"chain a recharge task before travel via the contract's recharge:bool parameter",
			)
			.option("--estimate", "print duration/energy/cargo estimate without submitting")
			.addOption(WAIT_OPTION)
			.addOption(TRACK_OPTION)
			.option("--force", "submit despite failed feasibility checks (advanced)")
			.action(async (x: bigint, y: bigint, opts: TravelCliOptions) => {
				await runTravel(ctx, x, y, opts);
			}),
};
