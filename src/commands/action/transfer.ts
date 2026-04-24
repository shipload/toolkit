import { type Action, Name } from "@wharfkit/antelope";
import type { Command } from "commander";
import type { Types } from "../../contracts/server";
import { type EntityTypeName, parseEntityType, parseUint64 } from "../../lib/args";
import { getShipload } from "../../lib/client";
import { printError } from "../../lib/errors";
import { formatEntity } from "../../lib/format";
import { checkResolveEntity } from "../../lib/resolve-prompt";
import { transact } from "../../lib/session";
import { getEntitySnapshot } from "../../lib/snapshot";
import { ValidationError } from "../../lib/validate";
import { waitForEntityIdle } from "../../lib/wait";

export interface TransferOpts {
	sourceType: EntityTypeName;
	sourceId: bigint;
	destType: EntityTypeName;
	destId: bigint;
	itemId: bigint;
	stats: bigint;
	quantity: bigint;
}

export async function buildAction(opts: TransferOpts): Promise<Action> {
	const shipload = await getShipload();
	return shipload.actions.transfer(
		Name.from(opts.sourceType),
		opts.sourceId,
		Name.from(opts.destType),
		opts.destId,
		opts.itemId,
		opts.stats,
		opts.quantity,
	);
}

export function register(program: Command): void {
	program
		.command("transfer")
		.description("Transfer cargo between entities of the same owner")
		.addHelpText(
			"before",
			"Requires: source and destination entities owned by caller; source has the cargo; destination has capacity.\n",
		)
		.argument("<src-type>", "source entity type", parseEntityType)
		.argument("<src-id>", "source entity id", parseUint64)
		.argument("<dest-type>", "destination entity type", parseEntityType)
		.argument("<dest-id>", "destination entity id", parseUint64)
		.argument("<item-id>", "item id", parseUint64)
		.argument("<stats>", "cargo stack discriminator (often 0)", parseUint64)
		.argument("<quantity>", "quantity", parseUint64)
		.option("--auto-resolve", "resolve completed tasks on source and destination before acting")
		.option("--wait", "block until scheduled task completes, then print post-state")
		.action(
			async (
				srcType: EntityTypeName,
				srcId: bigint,
				destType: EntityTypeName,
				destId: bigint,
				itemId: bigint,
				stats: bigint,
				quantity: bigint,
				options: { autoResolve?: boolean; wait?: boolean },
			) => {
				try {
					await checkResolveEntity(srcType, srcId, Boolean(options.autoResolve));
					if (destType !== srcType || destId !== srcId) {
						await checkResolveEntity(destType, destId, Boolean(options.autoResolve));
					}
				} catch (err) {
					if (err instanceof ValidationError) {
						process.exit(printError(err));
					}
					throw err;
				}
				const action = await buildAction({
					sourceType: srcType,
					sourceId: srcId,
					destType,
					destId,
					itemId,
					stats,
					quantity,
				});
				await transact(
					{ action },
					{
						description: `Transferred ${quantity} of item ${itemId} from ${srcType}:${srcId} to ${destType}:${destId}`,
					},
				);
				if (options.wait) {
					await waitForEntityIdle({ entityType: srcType, entityId: srcId });
					const snap = await getEntitySnapshot(srcType, srcId);
					console.log(formatEntity(snap as unknown as Types.entity_info));
				}
			},
		);
}
