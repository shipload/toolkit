import { type Action, Name } from "@wharfkit/antelope";
import type { Command } from "commander";
import { type EntityRef, parseEntityRefList, parseInt64 } from "../../lib/args";
import { getShipload } from "../../lib/client";
import { assertNotBoth, printError } from "../../lib/errors";
import { estimateGroupTravel } from "../../lib/estimate";
import { renderEstimate } from "../../lib/render-estimate";
import { checkResolveEntity } from "../../lib/resolve-prompt";
import { transact } from "../../lib/session";
import { ValidationError } from "../../lib/validate";
import { maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION } from "../../lib/wait";

export interface GroupTravelOpts {
	entities: EntityRef[];
	x: bigint;
	y: bigint;
	recharge: boolean;
}

export async function buildAction(opts: GroupTravelOpts): Promise<Action> {
	const shipload = await getShipload();
	const refs = opts.entities.map((e) => ({
		entityType: Name.from(e.entityType),
		entityId: e.entityId,
	}));
	return shipload.actions.grouptravel(refs, { x: opts.x, y: opts.y }, opts.recharge);
}

export function register(program: Command): void {
	program
		.command("grouptravel")
		.description("Travel multiple entities together (e.g., ship:1,container:2)")
		.addHelpText(
			"before",
			"Requires: all participants idle and at the same origin; lead ship has enough thrust for combined mass.\n",
		)
		.argument("<entities>", "comma-separated entity refs (type:id)", parseEntityRefList)
		.argument("<x>", "destination x", parseInt64)
		.argument("<y>", "destination y", parseInt64)
		.option(
			"--recharge",
			"chain a recharge task before travel via the contract's recharge:bool parameter",
		)
		.option("--auto-resolve", "resolve completed tasks on each entity before acting")
		.option("--estimate", "print duration/energy/cargo estimate without submitting")
		.addOption(WAIT_OPTION)
		.addOption(TRACK_OPTION)
		.action(
			async (
				entities: EntityRef[],
				x: bigint,
				y: bigint,
				options: {
					recharge?: boolean;
					autoResolve?: boolean;
					estimate?: boolean;
					wait?: boolean;
					track?: boolean;
				},
			) => {
				assertNotBoth(options, ["estimate", "wait"], ["estimate", "track"]);
				if (options.estimate) {
					try {
						const est = await estimateGroupTravel({
							entities,
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
				try {
					for (const e of entities) {
						await checkResolveEntity(
							e.entityType,
							e.entityId,
							Boolean(options.autoResolve),
						);
					}
				} catch (err) {
					if (err instanceof ValidationError) {
						process.exit(printError(err));
					}
					throw err;
				}
				const action = await buildAction({
					entities,
					x,
					y,
					recharge: Boolean(options.recharge),
				});
				const result = await transact(
					{ action },
					{ description: `Group travel to (${x}, ${y})` },
				);
				await maybeAwaitAndPrint(
					entities[0].entityType,
					entities[0].entityId,
					options,
					result,
				);
			},
		);
}
