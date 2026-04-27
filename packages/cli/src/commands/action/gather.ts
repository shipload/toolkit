import { getItem } from "@shipload/sdk";
import { type Action, Checksum256, Name, UInt64 } from "@wharfkit/antelope";
import { Command } from "commander";
import { type EntityTypeName, parseEntityType, parseUint32, parseUint64 } from "../../lib/args";
import { getGameSeed, server } from "../../lib/client";
import type { EntityContext, EntitySubcommand } from "../../lib/entity-scope";
import { assertNotBoth, withValidation } from "../../lib/errors";
import { estimateGather } from "../../lib/estimate";
import { renderIssues } from "../../lib/feasibility";
import { formatItem } from "../../lib/format";
import { resolveReach, shallowestPerItem } from "../../lib/reach";
import { renderEstimate } from "../../lib/render-estimate";
import { checkResolveEntity } from "../../lib/resolve-prompt";
import { transact } from "../../lib/session";
import { getEntitySnapshot } from "../../lib/snapshot";
import { checkCapacity, checkDepth, ValidationError } from "../../lib/validate";
import { maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION } from "../../lib/wait";
import { buildAction as buildRechargeAction } from "./recharge";

export interface GatherOpts {
	source: { entityType: EntityTypeName; entityId: bigint };
	destination: { entityType: EntityTypeName; entityId: bigint };
	stratum: number;
	quantity: number;
}

export function buildAction(opts: GatherOpts): Action {
	return server.action("gather", {
		source: {
			entity_type: Name.from(opts.source.entityType),
			entity_id: UInt64.from(BigInt(opts.source.entityId.toString())),
		},
		destination: {
			entity_type: Name.from(opts.destination.entityType),
			entity_id: UInt64.from(BigInt(opts.destination.entityId.toString())),
		},
		stratum: opts.stratum,
		quantity: opts.quantity,
	});
}

interface GatherErrorContext {
	sourceType: EntityTypeName;
	sourceId: bigint;
	stratum: number;
}

async function preflightGather(opts: GatherOpts): Promise<void> {
	const src = await getEntitySnapshot(opts.source.entityType, opts.source.entityId);
	const depth = src.gatherer ? Number(src.gatherer.depth.toString()) : 0;
	checkDepth(depth, opts.stratum);

	const coords = {
		x: BigInt(src.coordinates.x.toString()),
		y: BigInt(src.coordinates.y.toString()),
	};
	const stratumData = (await server.readonly("getstratum", {
		x: coords.x,
		y: coords.y,
		stratum: opts.stratum,
	})) as unknown as {
		stratum: {
			item_id: number | bigint | { toString(): string };
			reserve: number | bigint | { toString(): string };
		};
	};
	const itemIdRaw = stratumData?.stratum?.item_id;
	if (itemIdRaw === undefined || itemIdRaw === null) {
		throw new ValidationError(`Stratum ${opts.stratum} not present at current location.`);
	}
	const itemId = Number(itemIdRaw.toString());
	if (itemId === 0) {
		throw new ValidationError(`Stratum ${opts.stratum} has no resource at this location.`);
	}

	const dest =
		opts.destination.entityType === opts.source.entityType &&
		opts.destination.entityId === opts.source.entityId
			? src
			: await getEntitySnapshot(opts.destination.entityType, opts.destination.entityId);

	const item = getItem(itemId);
	const itemMass = item.mass;
	const capacity = Number((dest.capacity ?? 0).toString());
	const currentMass = Number(dest.cargomass.toString());
	checkCapacity(capacity, currentMass, itemMass, opts.quantity);
}

async function enrichGatherError(err: unknown, ctx: GatherErrorContext): Promise<string> {
	const msg = err instanceof Error ? err.message : String(err);
	const raw = String(err);

	if (
		msg.includes("stratum exceeds gatherer depth") ||
		raw.includes("stratum exceeds gatherer depth")
	) {
		try {
			const [reach, gameSeed, stateRaw] = await Promise.all([
				resolveReach({ entityType: ctx.sourceType, entityId: ctx.sourceId }),
				getGameSeed(),
				server.table("state").get(),
			]);
			const depth = reach.gatherer.depth;
			const coord = { x: Number(reach.coords.x), y: Number(reach.coords.y) };
			// biome-ignore lint/suspicious/noExplicitAny: state row shape varies by contract version
			const state = stateRaw as any;
			const epochSeed = state?.seed ? Checksum256.from(state.seed) : undefined;

			const lines = [
				`✗ Cannot gather: stratum ${ctx.stratum} is out of depth.`,
				`   ${ctx.sourceType}:${ctx.sourceId} gatherer depth: ${depth}`,
			];

			if (epochSeed) {
				const leads = shallowestPerItem(gameSeed, epochSeed, coord);
				const reachable = leads.filter((l) => l.index <= depth);
				if (reachable.length > 0) {
					const top = reachable[0];
					lines.push(
						`   Shallowest reachable at (${coord.x}, ${coord.y}): [${top.index}] ${formatItem(top.itemId)}, reserve ${top.reserve} — use that instead`,
					);
				} else if (leads.length > 0) {
					const top = leads[0];
					lines.push(
						`   Shallowest at (${coord.x}, ${coord.y}): [${top.index}] ${formatItem(top.itemId)}, reserve ${top.reserve}  (still out of depth)`,
					);
				} else {
					lines.push(`   No resources present at (${coord.x}, ${coord.y}).`);
				}
			}

			return lines.join("\n");
		} catch {
			return msg;
		}
	}

	if (msg.includes("insufficient energy") || raw.includes("insufficient energy")) {
		return `✗ Cannot gather: insufficient energy on ${ctx.sourceType}:${ctx.sourceId}. Run "shiploadcli ${ctx.sourceType} ${ctx.sourceId}" to inspect.`;
	}

	if (msg.includes("cargo exceeds capacity") || raw.includes("cargo exceeds capacity")) {
		return `✗ Cannot gather: destination cargo would exceed capacity.`;
	}

	return msg;
}

type GatherCliOptions = {
	autoResolve?: boolean;
	estimate?: boolean;
	wait?: boolean;
	track?: boolean;
	force?: boolean;
	recharge?: boolean;
};

export async function runGather(
	ctx: EntityContext,
	destType: EntityTypeName,
	destId: bigint,
	stratum: number,
	quantity: number,
	options: GatherCliOptions,
): Promise<void> {
	const gatherOpts: GatherOpts = {
		source: { entityType: ctx.entityType, entityId: ctx.entityId },
		destination: { entityType: destType, entityId: destId },
		stratum,
		quantity,
	};
	assertNotBoth(options, ["estimate", "wait"], ["estimate", "track"]);
	const est = await withValidation(() =>
		estimateGather({
			entityType: ctx.entityType,
			entityId: ctx.entityId,
			stratum,
			quantity,
			recharge: Boolean(options.recharge),
		}),
	);
	if (options.estimate) {
		console.log(renderEstimate(est));
		return;
	}
	await withValidation(async () => {
		await checkResolveEntity(ctx.entityType, ctx.entityId, Boolean(options.autoResolve));
		if (destType !== ctx.entityType || destId !== ctx.entityId) {
			await checkResolveEntity(destType, destId, Boolean(options.autoResolve));
		}
		await preflightGather(gatherOpts);
	});
	if (!est.feasibility.ok) {
		console.error(renderIssues(est.feasibility.issues));
		if (!options.force) process.exit(1);
	}
	const action = buildAction(gatherOpts);
	try {
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
					{
						description: `Recharge + gather ${quantity} from stratum ${stratum}`,
					},
				)
			: await transact(
					{ action },
					{
						description: `Gathering ${quantity} from stratum ${stratum}`,
					},
				);
		await maybeAwaitAndPrint(ctx.entityType, ctx.entityId, options, result);
	} catch (err) {
		const enriched = await enrichGatherError(err, {
			sourceType: ctx.entityType,
			sourceId: ctx.entityId,
			stratum,
		});
		console.error(enriched);
		process.exit(1);
	}
}

export const SUBCOMMAND: EntitySubcommand = {
	name: "gather",
	description: "Gather resources from a stratum into a destination entity",
	appliesTo: ["ship"],
	build: (ctx) =>
		new Command("gather")
			.description("Gather resources from a stratum into a destination entity")
			.addHelpText(
				"before",
				"Requires: idle source ship; gatherer module installed; stratum within gatherer depth; cargo capacity available.\n",
			)
			.argument("<dest-type>", "destination entity type", parseEntityType)
			.argument("<dest-id>", "destination entity id", parseUint64)
			.argument("<stratum>", "stratum index", parseUint32)
			.argument("<quantity>", "quantity to gather", parseUint32)
			.option("--auto-resolve", "resolve completed tasks on the source entity before acting")
			.option("--estimate", "print duration/energy/cargo estimate without submitting")
			.addOption(WAIT_OPTION)
			.addOption(TRACK_OPTION)
			.option("--force", "submit despite failed feasibility checks (advanced)")
			.option(
				"--recharge",
				"prepend a recharge action to the same signed transaction (recharges to full)",
			)
			.action(
				async (
					destType: EntityTypeName,
					destId: bigint,
					stratum: number,
					quantity: number,
					opts: GatherCliOptions,
				) => {
					await runGather(ctx, destType, destId, stratum, quantity, opts);
				},
			),
};
