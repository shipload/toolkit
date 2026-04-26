import { Command } from "commander";
import { ALL_ENTITY_TYPES } from "../../lib/args";
import type { EntityContext, EntitySubcommand } from "../../lib/entity-scope";
import { withValidation } from "../../lib/errors";
import { getEntitySnapshot } from "../../lib/snapshot";
import { AUTO_RESOLVE_OPTION, awaitAndPrint, TIMEOUT_OPTION } from "../../lib/wait";

const DESCRIPTION =
	"Live, in-place UI for the entity. Shows location, energy, cargo, and schedule. Refreshes every second; resyncs with the chain every 5s. Stays open across idle/busy transitions — exit with Ctrl-C or --timeout.";

export async function runTrack(
	ctx: EntityContext,
	opts: { timeout?: number; autoResolve?: boolean },
): Promise<void> {
	await withValidation(async () => {
		const snap = await getEntitySnapshot(ctx.entityType, ctx.entityId);
		await awaitAndPrint(ctx.entityType, ctx.entityId, {
			timeoutMs: opts.timeout,
			autoResolve: opts.autoResolve,
			progress: true,
			watch: true,
			initialSnapshot: snap,
		});
	});
}

export const SUBCOMMAND: EntitySubcommand = {
	name: "track",
	description: DESCRIPTION,
	appliesTo: ALL_ENTITY_TYPES,
	build: (ctx) =>
		new Command("track")
			.description(DESCRIPTION)
			.addOption(TIMEOUT_OPTION)
			.addOption(AUTO_RESOLVE_OPTION)
			.action(async (opts: { timeout?: number; autoResolve?: boolean }) => {
				await runTrack(ctx, opts);
			}),
};
