import { Checksum256 } from "@wharfkit/antelope";
import type { Command } from "commander";
import { parseUint64 } from "../../lib/args";
import { getGameSeed, server } from "../../lib/client";
import { formatNearby, formatOutput } from "../../lib/format";
import { resolveReach } from "../../lib/reach";

export interface NearbyOpts {
	shipId: bigint;
	recharge?: boolean;
}

export function buildQuery(opts: NearbyOpts): {
	entity_type: string;
	entity_id: bigint;
	recharge: boolean;
} {
	return {
		entity_type: "ship",
		entity_id: opts.shipId,
		recharge: opts.recharge !== false,
	};
}

export function register(program: Command): void {
	program
		.command("nearby")
		.description("Show nearby systems reachable from a ship")
		.argument("<ship-id>", "ship id", parseUint64)
		.option("--no-recharge", "disable recharge projection")
		.option("--all", "expand each cell to list every resource (bypasses depth filter)")
		.option("--json", "emit JSON instead of formatted text")
		.action(
			async (
				shipId: bigint,
				options: { recharge: boolean; all?: boolean; json?: boolean },
			) => {
				const nearbyRaw = await server.readonly("getnearby", {
					entity_type: "ship",
					entity_id: shipId,
					recharge: options.recharge !== false,
				});
				// biome-ignore lint/suspicious/noExplicitAny: getnearby readonly return shape
				const nearby = nearbyRaw as any;
				const gameSeed = await getGameSeed();
				// biome-ignore lint/suspicious/noExplicitAny: state row shape
				const state = (await server.table("state").get()) as any;
				const epochSeed = state?.seed ? Checksum256.from(state.seed) : undefined;

				let reach: { depth: number } | undefined;
				try {
					const r = await resolveReach({ entityType: "ship", entityId: shipId });
					reach = { depth: r.gatherer.depth };
				} catch {
					reach = undefined;
				}

				console.log(
					formatOutput(nearby, { json: Boolean(options.json) }, (d) =>
						formatNearby(d, {
							gameSeed,
							epochSeed,
							reach,
							showAll: Boolean(options.all),
						}),
					),
				);
			},
		);
}
