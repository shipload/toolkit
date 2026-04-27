import { Command } from "commander";
import { ALL_ENTITY_TYPES } from "../../lib/args";
import type { EntityContext, EntitySubcommand } from "../../lib/entity-scope";
import { withValidation } from "../../lib/errors";
import { AUTO_RESOLVE_OPTION, TIMEOUT_OPTION } from "../../lib/wait";
import { runTrackView } from "../../tui";

const DESCRIPTION =
	"Live full-screen TUI for the entity. Shows location, energy, cargo, and schedule. Press 'r' to resolve completed tasks. Exit with 'q' or Ctrl-C.";

export async function runTrack(
	ctx: EntityContext,
	opts: { timeout?: number; autoResolve?: boolean },
): Promise<void> {
	if (opts.autoResolve) {
		console.error(
			"Note: --auto-resolve is ignored in the track TUI. Use 'r' to resolve manually, or `shiploadcli <entity> <id> wait --auto-resolve`.",
		);
	}
	await withValidation(async () => {
		await runTrackView(ctx, { timeoutMs: opts.timeout });
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
