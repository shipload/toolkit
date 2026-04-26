import { type Action, Name } from "@wharfkit/antelope";
import { Command } from "commander";
import type { Types as ServerTypes } from "../../contracts/server";
import { type EntityTypeName, parseUint32 } from "../../lib/args";
import { type ParsedCargoInput, resolveCargoInputs } from "../../lib/cargo-resolve";
import { getShipload } from "../../lib/client";
import type { EntityContext, EntitySubcommand } from "../../lib/entity-scope";
import { withValidation } from "../../lib/errors";
import { checkResolveEntity } from "../../lib/resolve-prompt";
import { transact } from "../../lib/session";
import { getEntitySnapshot } from "../../lib/snapshot";
import { maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION } from "../../lib/wait";

export interface DeployOpts {
	entityType: EntityTypeName;
	entityId: bigint;
	packedItemId: number;
	stats: bigint;
}

export async function buildAction(opts: DeployOpts): Promise<Action> {
	const shipload = await getShipload();
	return shipload.actions.deploy(
		Name.from(opts.entityType),
		opts.entityId,
		opts.packedItemId,
		opts.stats,
	);
}

interface DeployCliOptions {
	stats?: string;
	autoResolve?: boolean;
	wait?: boolean;
	track?: boolean;
}

export async function runDeploy(
	ctx: EntityContext,
	packedItemId: number,
	options: DeployCliOptions,
): Promise<void> {
	await withValidation(async () => {
		await checkResolveEntity(ctx.entityType, ctx.entityId, Boolean(options.autoResolve));
		const snap = await getEntitySnapshot(ctx.entityType, ctx.entityId);
		const parsedInput: ParsedCargoInput = {
			itemId: packedItemId,
			quantity: 1,
			stats: options.stats === undefined ? null : BigInt(options.stats),
		};
		const [resolved] = resolveCargoInputs(
			[parsedInput],
			snap.cargo as unknown as ServerTypes.cargo_item[],
			"stats",
		);
		const action = await buildAction({
			entityType: ctx.entityType,
			entityId: ctx.entityId,
			packedItemId,
			stats: resolved.stats,
		});
		const result = await transact(
			{ action },
			{ description: `Deploying from ${ctx.entityType}:${ctx.entityId}` },
		);
		await maybeAwaitAndPrint(ctx.entityType, ctx.entityId, options, result);
	});
}

export const SUBCOMMAND: EntitySubcommand = {
	name: "deploy",
	description: "Deploy an entity from a packed cargo NFT",
	appliesTo: ["ship"],
	build: (ctx) =>
		new Command("deploy")
			.description("Deploy an entity from a packed cargo NFT")
			.addHelpText("before", "Requires: packed-entity NFT in cargo; deploy location valid.\n")
			.argument("<packed-item-id>", "packed item id", parseUint32)
			.option(
				"--stats <n>",
				"cargo stack stats (packed uint; omit to auto-match the single cargo stack for this item)",
			)
			.option("--auto-resolve", "resolve completed tasks on the source entity before acting")
			.addOption(WAIT_OPTION)
			.addOption(TRACK_OPTION)
			.action(async (packedItemId: number, opts: DeployCliOptions) => {
				await runDeploy(ctx, packedItemId, opts);
			}),
};
