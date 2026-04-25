import { type Action, Name } from "@wharfkit/antelope";
import type { Command } from "commander";
import { Types as ServerTypes } from "../../contracts/server";
import { type EntityTypeName, parseCargoInput, parseEntityType, parseUint64 } from "../../lib/args";
import {
	type ParsedCargoInput,
	type ResolvedCargoInput,
	resolveCargoInputs,
} from "../../lib/cargo-resolve";
import { getShipload } from "../../lib/client";
import { assertNotBoth, printError } from "../../lib/errors";
import { renderEstimate } from "../../lib/render-estimate";
import { checkResolveEntity } from "../../lib/resolve-prompt";
import { transact } from "../../lib/session";
import { getEntitySnapshot } from "../../lib/snapshot";
import { ValidationError } from "../../lib/validate";

export interface BlendOpts {
	entityType: EntityTypeName;
	entityId: bigint;
	inputs: ResolvedCargoInput[];
}

export async function buildAction(opts: BlendOpts): Promise<Action> {
	const shipload = await getShipload();
	const cargoInputs = opts.inputs.map((i) =>
		ServerTypes.cargo_item.from({
			item_id: i.itemId,
			quantity: i.quantity,
			stats: i.stats,
			modules: [],
		}),
	);
	return shipload.actions.blend(Name.from(opts.entityType), opts.entityId, cargoInputs);
}

export function register(program: Command): void {
	program
		.command("blend")
		.description("Blend inputs into outputs")
		.addHelpText(
			"before",
			"Requires: multiple stacks of the same item in cargo; entity idle.\n",
		)
		.argument("<entity-type>", "entity type", parseEntityType)
		.argument("<entity-id>", "entity id", parseUint64)
		.option(
			"--input <val>",
			"cargo input item:qty:stats (repeatable; explicit stats almost always required for blend)",
			(val: string, acc: ParsedCargoInput[] = []) => {
				acc.push(parseCargoInput(val));
				return acc;
			},
			[] as ParsedCargoInput[],
		)
		.option("--auto-resolve", "resolve completed tasks on the target entity before acting")
		.option("--estimate", "print duration/energy/cargo estimate without submitting")
		.option("--wait", "no-op for blend (instantaneous); accepted for consistency")
		.action(
			async (
				entityType: EntityTypeName,
				entityId: bigint,
				options: {
					input: ParsedCargoInput[];
					autoResolve?: boolean;
					estimate?: boolean;
					wait?: boolean;
				},
			) => {
				assertNotBoth(options, ["estimate", "wait"]);
				if (options.estimate) {
					console.log(
						renderEstimate({
							duration_s: 0,
							energy_cost: 0,
							cargo_delta: {},
							feasibility: { ok: true, issues: [] },
						}),
					);
					return;
				}
				try {
					await checkResolveEntity(entityType, entityId, Boolean(options.autoResolve));
					const snap = await getEntitySnapshot(entityType, entityId);
					const resolved = resolveCargoInputs(
						options.input,
						snap.cargo as unknown as ServerTypes.cargo_item[],
					);
					const action = await buildAction({
						entityType,
						entityId,
						inputs: resolved,
					});
					await transact(
						{ action },
						{ description: `Blending on ${entityType} ${entityId}` },
					);
					if (options.wait) {
						console.log("blend is instantaneous; --wait is a no-op");
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
