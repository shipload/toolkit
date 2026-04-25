import { type Action, Name } from "@wharfkit/antelope";
import type { Command } from "commander";
import { type EntityTypeName, parseEntityType, parseUint64 } from "../../lib/args";
import { getShipload } from "../../lib/client";
import { printError } from "../../lib/errors";
import { checkResolveEntity } from "../../lib/resolve-prompt";
import { transact } from "../../lib/session";
import { ValidationError } from "../../lib/validate";
import { awaitAndPrint, WAIT_OPTION } from "../../lib/wait";

export interface WrapOpts {
	owner: string;
	entityType: EntityTypeName;
	entityId: bigint;
	cargoId: bigint;
	quantity: bigint;
}

export async function buildAction(opts: WrapOpts): Promise<Action> {
	const shipload = await getShipload();
	return shipload.actions.wrap(
		opts.owner,
		Name.from(opts.entityType),
		opts.entityId,
		opts.cargoId,
		opts.quantity,
	);
}

export function register(program: Command): void {
	program
		.command("wrap")
		.description("Wrap cargo into an NFT for the specified owner")
		.addHelpText(
			"before",
			"Requires: deployed entity with cargo; deploy target idle; caller owns both entities.\n",
		)
		.argument("<owner>", "recipient account name")
		.argument("<entity-type>", "source entity type", parseEntityType)
		.argument("<entity-id>", "source entity id", parseUint64)
		.argument("<cargo-id>", "source cargo id", parseUint64)
		.argument("<quantity>", "quantity to wrap", parseUint64)
		.option("--auto-resolve", "resolve completed tasks on the source entity before acting")
		.addOption(WAIT_OPTION)
		.action(
			async (
				owner: string,
				entityType: EntityTypeName,
				entityId: bigint,
				cargoId: bigint,
				quantity: bigint,
				options: { autoResolve?: boolean; wait?: boolean },
			) => {
				try {
					await checkResolveEntity(entityType, entityId, Boolean(options.autoResolve));
				} catch (err) {
					if (err instanceof ValidationError) {
						process.exit(printError(err));
					}
					throw err;
				}
				const action = await buildAction({
					owner,
					entityType,
					entityId,
					cargoId,
					quantity,
				});
				await transact(
					{ action },
					{ description: `Wrapping ${quantity} cargo for ${owner}` },
				);
				if (options.wait) {
					await awaitAndPrint(entityType, entityId);
				}
			},
		);
}
