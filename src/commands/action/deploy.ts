import { type Action, Name } from "@wharfkit/antelope";
import type { Command } from "commander";
import type { Types as ServerTypes } from "../../contracts/server";
import { type EntityTypeName, parseEntityType, parseUint32, parseUint64 } from "../../lib/args";
import { type ParsedCargoInput, resolveCargoInputs } from "../../lib/cargo-resolve";
import { getShipload } from "../../lib/client";
import { printError } from "../../lib/errors";
import { formatEntity } from "../../lib/format";
import { checkResolveEntity } from "../../lib/resolve-prompt";
import { transact } from "../../lib/session";
import { getEntitySnapshot } from "../../lib/snapshot";
import { ValidationError } from "../../lib/validate";
import { waitForEntityIdle } from "../../lib/wait";

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

export function register(program: Command): void {
	program
		.command("deploy")
		.description("Deploy an entity from a packed cargo NFT")
		.addHelpText("before", "Requires: packed-entity NFT in cargo; deploy location valid.\n")
		.argument("<entity-type>", "source entity type", parseEntityType)
		.argument("<entity-id>", "source entity id", parseUint64)
		.argument("<packed-item-id>", "packed item id", parseUint32)
		.option(
			"--stats <n>",
			"cargo stack stats (packed uint; omit to auto-match the single cargo stack for this item)",
		)
		.option("--auto-resolve", "resolve completed tasks on the source entity before acting")
		.option("--wait", "block until scheduled task completes, then print post-state")
		.action(
			async (
				entityType: EntityTypeName,
				entityId: bigint,
				packedItemId: number,
				options: { stats?: string; autoResolve?: boolean; wait?: boolean },
			) => {
				try {
					await checkResolveEntity(entityType, entityId, Boolean(options.autoResolve));
					const snap = await getEntitySnapshot(entityType, entityId);
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
						entityType,
						entityId,
						packedItemId,
						stats: resolved.stats,
					});
					await transact(
						{ action },
						{ description: `Deploying from ${entityType}:${entityId}` },
					);
					if (options.wait) {
						await waitForEntityIdle({ entityType, entityId });
						const postSnap = await getEntitySnapshot(entityType, entityId);
						console.log(formatEntity(postSnap as unknown as ServerTypes.entity_info));
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
