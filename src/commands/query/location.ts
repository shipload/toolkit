import type { Command } from "commander";
import { type EntityRef, parseEntityRef, parseInt64 } from "../../lib/args";
import { getGameSeed, server } from "../../lib/client";
import { formatLocation, formatOutput } from "../../lib/format";
import { resolveReach } from "../../lib/reach";

export function parseCoords(xStr: string, yStr: string): { x: bigint; y: bigint } {
	return { x: parseInt64(xStr), y: parseInt64(yStr) };
}

export function register(program: Command): void {
	program
		.command("location")
		.description("Show location info for given coordinates")
		.argument("<x>", "x coordinate", parseInt64)
		.argument("<y>", "y coordinate", parseInt64)
		.option(
			"--entity <ref>",
			"scope the summary to the entity's gatherer depth",
			parseEntityRef,
		)
		.option("--all", "with --entity, append Top overall block")
		.option("--json", "emit JSON instead of formatted text")
		.action(
			async (
				x: bigint,
				y: bigint,
				opts: { entity?: EntityRef; all?: boolean; json?: boolean },
			) => {
				// biome-ignore lint/suspicious/noExplicitAny: getlocation readonly return is any
				const location = (await server.readonly("getlocation", { x, y })) as any;
				const gameSeed = await getGameSeed();
				// biome-ignore lint/suspicious/noExplicitAny: server.table state row
				const state = (await server.table("state").get()) as any;
				const epochSeed = state?.seed;
				const reach = opts.entity
					? {
							depth: (await resolveReach(opts.entity)).gatherer.depth,
							showAll: Boolean(opts.all),
						}
					: undefined;
				console.log(
					formatOutput(location, { json: Boolean(opts.json) }, (d) =>
						formatLocation(d, gameSeed, epochSeed, reach),
					),
				);
			},
		);
}
