import type { Command } from "commander";
import { type EntityTypeName, parseEntityType, parseUint64 } from "../../lib/args";
import { printError } from "../../lib/errors";
import { ValidationError } from "../../lib/validate";
import { awaitAndPrint } from "../../lib/wait";

export function register(program: Command): void {
	program
		.command("wait")
		.description(
			"Block until the entity's active task ends; auto-resolve completed tasks; print post-state",
		)
		.argument("<entity-type>", "entity type", parseEntityType)
		.argument("<entity-id>", "entity id", parseUint64)
		.option("--timeout <s>", "timeout in seconds", (v) => Number(v) * 1000)
		.action(
			async (entityType: EntityTypeName, entityId: bigint, opts: { timeout?: number }) => {
				try {
					await awaitAndPrint(entityType, entityId, { timeoutMs: opts.timeout });
				} catch (err) {
					if (err instanceof ValidationError) {
						process.exit(printError(err));
					}
					throw err;
				}
			},
		);
}
