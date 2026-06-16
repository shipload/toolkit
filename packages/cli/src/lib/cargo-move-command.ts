import { cargoItem, type ServerTypes, type Shipload } from "@shipload/sdk";
import type { Action } from "@wharfkit/antelope";
import { Command, Option } from "commander";
import {
	ALL_ENTITY_TYPES,
	type EntityTypeName,
	parseCargoInput,
	parseEntityType,
	parseUint64,
} from "./args";
import { parseModulesJson } from "./cargo-build";
import type { ParsedCargoInput } from "./cargo-resolve";
import { formatCargoRef } from "./cargo-table";
import { getShipload } from "./client";
import type { EntityContext, EntitySubcommand } from "./entity-scope";
import { transact } from "./session";
import { maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION } from "./wait";

export interface CargoMoveOpts {
	entityId: bigint;
	otherId: bigint;
	itemId: bigint;
	stackId: bigint;
	quantity: bigint;
	modules?: ServerTypes.module_entry[];
}

interface CargoMoveCliOptions {
	wait?: boolean;
	track?: boolean;
	modules?: string;
}

export interface CargoMoveSpec {
	name: "load" | "unload";
	summary: string;
	requires: string;
	counterpartTypeArg: [name: string, description: string];
	counterpartIdArg: [name: string, description: string];
	cargoArgHint: string;
	example: string;
	act(
		sl: Shipload,
		entityId: bigint,
		otherId: bigint,
		items: ReturnType<typeof cargoItem>[],
	): Action;
	describe(
		input: ParsedCargoInput,
		ctx: EntityContext,
		otherType: EntityTypeName,
		otherId: bigint,
	): string;
}

export async function buildCargoMoveAction(
	spec: CargoMoveSpec,
	opts: CargoMoveOpts,
	shipload?: Shipload,
): Promise<Action> {
	const sl = shipload ?? (await getShipload());
	const item = cargoItem(
		{
			item_id: Number(opts.itemId),
			stats: opts.stackId,
			modules: opts.modules ?? [],
		},
		opts.quantity,
	);
	return spec.act(sl, opts.entityId, opts.otherId, [item]);
}

async function runCargoMove(
	spec: CargoMoveSpec,
	ctx: EntityContext,
	otherType: EntityTypeName,
	otherId: bigint,
	input: ParsedCargoInput,
	options: CargoMoveCliOptions,
): Promise<void> {
	const action = await buildCargoMoveAction(spec, {
		entityId: ctx.entityId,
		otherId,
		itemId: BigInt(input.itemId),
		stackId: input.stackId,
		quantity: BigInt(input.quantity),
		modules: parseModulesJson(options.modules),
	});
	const result = await transact(
		{ action },
		{
			description: spec.describe(input, ctx, otherType, otherId),
			errorHint: (msg) => {
				if (
					msg.includes("missing cargo") ||
					msg.includes("insufficient cargo") ||
					msg.includes("Invalid cargo specified") ||
					msg.includes("cargo capacity would be exceeded")
				) {
					return `tried to ${spec.name} ${input.quantity}× ${formatCargoRef(Number(input.itemId), input.stackId)}`;
				}
				return undefined;
			},
		},
	);
	await maybeAwaitAndPrint(ctx.entityId, options, result);
}

export function cargoMoveSubcommand(spec: CargoMoveSpec): EntitySubcommand {
	return {
		name: spec.name,
		description: spec.summary,
		appliesTo: ALL_ENTITY_TYPES,
		build: (ctx) =>
			new Command(spec.name)
				.description(spec.summary)
				.addHelpText(
					"before",
					`${spec.requires}\nCargo is identified by <item-id>:<stack-id>:<qty> — packed-entity stacks may also need --modules.\n`,
				)
				.addHelpText("after", spec.example)
				.argument(spec.counterpartTypeArg[0], spec.counterpartTypeArg[1], parseEntityType)
				.argument(spec.counterpartIdArg[0], spec.counterpartIdArg[1], parseUint64)
				.argument("<input>", spec.cargoArgHint, parseCargoInput)
				.addOption(
					new Option(
						"--modules <json>",
						"modules vector for packed entities (JSON array, default [])",
					),
				)
				.addOption(WAIT_OPTION)
				.addOption(TRACK_OPTION)
				.action(
					async (
						otherType: EntityTypeName,
						otherId: bigint,
						input: ParsedCargoInput,
						opts: CargoMoveCliOptions,
					) => {
						await runCargoMove(spec, ctx, otherType, otherId, input, opts);
					},
				),
	};
}
