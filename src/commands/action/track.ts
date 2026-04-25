import type { Command } from "commander";
import { type EntityTypeName, parseEntityType, parseUint64 } from "../../lib/args";
import { printError } from "../../lib/errors";
import { getEntitySnapshot } from "../../lib/snapshot";
import { ValidationError } from "../../lib/validate";
import { AUTO_RESOLVE_OPTION, awaitAndPrint, TIMEOUT_OPTION } from "../../lib/wait";

export function register(program: Command): void {
	program
		.command("track")
		.description(
			"Block until the entity's active task ends, showing a live progress display, then print post-state",
		)
		.argument("<entity-type>", "entity type", parseEntityType)
		.argument("<entity-id>", "entity id", parseUint64)
		.addOption(TIMEOUT_OPTION)
		.addOption(AUTO_RESOLVE_OPTION)
		.action(
			async (
				entityType: EntityTypeName,
				entityId: bigint,
				opts: { timeout?: number; autoResolve?: boolean },
			) => {
				try {
					const snap = await getEntitySnapshot(entityType, entityId);
					if (snap.is_idle) {
						console.log(`${entityType} ${entityId} is idle — nothing to track`);
						return;
					}
					await awaitAndPrint(entityType, entityId, {
						timeoutMs: opts.timeout,
						autoResolve: opts.autoResolve,
						progress: true,
						initialSnapshot: snap,
					});
				} catch (err) {
					if (err instanceof ValidationError) {
						process.exit(printError(err));
					}
					throw err;
				}
			},
		);
}
