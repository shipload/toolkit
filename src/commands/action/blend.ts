import { type Action, Name } from "@wharfkit/antelope";
import { Command } from "commander";
import { Types as ServerTypes } from "../../contracts/server";
import { appendCargoInput, type EntityTypeName } from "../../lib/args";
import {
	type ParsedCargoInput,
	type ResolvedCargoInput,
	resolveCargoInputs,
} from "../../lib/cargo-resolve";
import { getShipload } from "../../lib/client";
import type { EntityContext, EntitySubcommand } from "../../lib/entity-scope";
import { assertNotBoth, withValidation } from "../../lib/errors";
import { renderEstimate } from "../../lib/render-estimate";
import { checkResolveEntity } from "../../lib/resolve-prompt";
import { transact } from "../../lib/session";
import { getEntitySnapshot } from "../../lib/snapshot";

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

export async function runBlend(
	ctx: EntityContext,
	opts: {
		input: ParsedCargoInput[];
		autoResolve?: boolean;
		estimate?: boolean;
		wait?: boolean;
	},
): Promise<void> {
	assertNotBoth(opts, ["estimate", "wait"]);
	if (opts.estimate) {
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
	await withValidation(async () => {
		await checkResolveEntity(ctx.entityType, ctx.entityId, Boolean(opts.autoResolve));
		const snap = await getEntitySnapshot(ctx.entityType, ctx.entityId);
		const resolved = resolveCargoInputs(
			opts.input,
			snap.cargo as unknown as ServerTypes.cargo_item[],
		);
		const action = await buildAction({
			entityType: ctx.entityType,
			entityId: ctx.entityId,
			inputs: resolved,
		});
		await transact(
			{ action },
			{ description: `Blending on ${ctx.entityType} ${ctx.entityId}` },
		);
		if (opts.wait) {
			console.log("blend is instantaneous; --wait is a no-op");
		}
	});
}

export const SUBCOMMAND: EntitySubcommand = {
	name: "blend",
	description: "Blend inputs into outputs",
	appliesTo: ["ship"],
	build: (ctx) =>
		new Command("blend")
			.description("Blend inputs into outputs")
			.addHelpText(
				"before",
				"Requires: multiple stacks of the same item in cargo; entity idle.\n",
			)
			.option(
				"--input <val>",
				"cargo input item:qty:stats (repeatable; explicit stats almost always required for blend)",
				appendCargoInput,
				[] as ParsedCargoInput[],
			)
			.option("--auto-resolve", "resolve completed tasks on the target entity before acting")
			.option("--estimate", "print duration/energy/cargo estimate without submitting")
			.option("--wait", "no-op for blend (instantaneous); accepted for consistency")
			.action(
				async (opts: {
					input: ParsedCargoInput[];
					autoResolve?: boolean;
					estimate?: boolean;
					wait?: boolean;
				}) => {
					await runBlend(ctx, opts);
				},
			),
};
