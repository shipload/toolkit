import { type Action, Name } from "@wharfkit/antelope";
import type { Command } from "commander";
import { type EntityTypeName, parseEntityType, parseUint64 } from "../../lib/args";
import { getShipload } from "../../lib/client";
import { assertNotBoth, printError } from "../../lib/errors";
import { estimateRecharge } from "../../lib/estimate";
import { renderEstimate } from "../../lib/render-estimate";
import { checkResolveEntity } from "../../lib/resolve-prompt";
import { transact } from "../../lib/session";
import { ValidationError } from "../../lib/validate";
import { maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION } from "../../lib/wait";

export interface RechargeOpts {
	entityType: EntityTypeName;
	entityId: bigint;
}

export async function buildAction(opts: RechargeOpts): Promise<Action> {
	const shipload = await getShipload();
	return shipload.actions.recharge(opts.entityId, Name.from(opts.entityType));
}

export function register(program: Command): void {
	program
		.command("recharge")
		.description("Recharge energy for an entity")
		.addHelpText("before", "Requires: entity has a generator; energy below capacity.\n")
		.argument("<entity-type>", "entity type (ship/container/warehouse)", parseEntityType)
		.argument("<id>", "entity id", parseUint64)
		.option("--auto-resolve", "resolve completed tasks on the target entity before acting")
		.option("--estimate", "print duration/energy estimate without submitting")
		.addOption(WAIT_OPTION)
		.addOption(TRACK_OPTION)
		.action(
			async (
				entityType: EntityTypeName,
				entityId: bigint,
				options: {
					autoResolve?: boolean;
					estimate?: boolean;
					wait?: boolean;
					track?: boolean;
				},
			) => {
				assertNotBoth(options, ["estimate", "wait"], ["estimate", "track"]);
				if (options.estimate) {
					try {
						const est = await estimateRecharge({ entityType, entityId });
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
					await checkResolveEntity(entityType, entityId, Boolean(options.autoResolve));
				} catch (err) {
					if (err instanceof ValidationError) {
						process.exit(printError(err));
					}
					throw err;
				}
				const action = await buildAction({ entityType, entityId });
				const result = await transact(
					{ action },
					{ description: `Recharging ${entityType} ${entityId}` },
				);
				await maybeAwaitAndPrint(entityType, entityId, options, result);
			},
		);
}
