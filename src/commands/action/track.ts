import { Command } from "commander";
import { ALL_ENTITY_TYPES } from "../../lib/args";
import type { EntityContext, EntitySubcommand } from "../../lib/entity-scope";
import { withValidation } from "../../lib/errors";
import { getEntitySnapshot } from "../../lib/snapshot";
import { AUTO_RESOLVE_OPTION, awaitAndPrint, TIMEOUT_OPTION } from "../../lib/wait";

export async function runTrack(
	ctx: EntityContext,
	opts: { timeout?: number; autoResolve?: boolean },
): Promise<void> {
	await withValidation(async () => {
		const snap = await getEntitySnapshot(ctx.entityType, ctx.entityId);
		if (snap.is_idle) {
			console.log(`${ctx.entityType} ${ctx.entityId} is idle — nothing to track`);
			return;
		}
		await awaitAndPrint(ctx.entityType, ctx.entityId, {
			timeoutMs: opts.timeout,
			autoResolve: opts.autoResolve,
			progress: true,
			initialSnapshot: snap,
		});
	});
}

export const SUBCOMMAND: EntitySubcommand = {
	name: "track",
	description:
		"Block until the entity's active task ends, showing a live progress display, then print post-state",
	appliesTo: ALL_ENTITY_TYPES,
	build: (ctx) =>
		new Command("track")
			.description(
				"Block until the entity's active task ends, showing a live progress display, then print post-state",
			)
			.addOption(TIMEOUT_OPTION)
			.addOption(AUTO_RESOLVE_OPTION)
			.action(async (opts: { timeout?: number; autoResolve?: boolean }) => {
				await runTrack(ctx, opts);
			}),
};
