import {
	deriveLocationSize,
	deriveLocationStatic,
	deriveResourceStats,
	deriveStratum,
	encodeStats,
	LocationType,
} from "@shipload/sdk";
import { Checksum256 } from "@wharfkit/antelope";
import type { Command } from "commander";
import { type EntityRef, parseEntityRef, parseInt64, parseUint32 } from "../../lib/args";
import { getGameSeed, server } from "../../lib/client";
import {
	formatItem,
	formatOutput,
	formatReserve,
	formatStats,
	resolveItemCategory,
} from "../../lib/format";
import { isReachable, reachLegend, resolveReach } from "../../lib/reach";

const LOCATION_TYPE_NAMES: Record<LocationType, string> = {
	[LocationType.EMPTY]: "Empty",
	[LocationType.PLANET]: "Planet",
	[LocationType.ASTEROID]: "Asteroid",
	[LocationType.NEBULA]: "Nebula",
};

export interface StrataRow {
	index: number;
	itemId: number;
	reserve: number;
	richness: number;
	stats: bigint;
}

export interface StrataList {
	x: bigint;
	y: bigint;
	locationTypeLabel: string;
	size: number;
	rows: StrataRow[];
}

export function renderDetail(s: any, stats: any, index: number): string {
	const itemId = Number(s.item_id);
	const lines = [
		`Stratum [${index}]:`,
		`  Item:     ${formatItem(itemId)}`,
		`  Reserve:  ${formatReserve(Number(s.reserve), Number(s.reserve_max))}`,
		`  Richness: ${s.richness}`,
		`  Seed:     ${s.seed}`,
	];
	if (stats) {
		const category = resolveItemCategory(itemId);
		const packed = encodeStats([Number(stats.stat1), Number(stats.stat2), Number(stats.stat3)]);
		lines.push(`  Stats:    ${formatStats(packed, category ?? itemId)}`);
	}
	return lines.join("\n");
}

export interface ReachOpts {
	depth: number;
	showAll: boolean;
}

export function renderList(list: StrataList, reach?: ReachOpts): string {
	const header = `Strata at (${list.x}, ${list.y}) — ${list.locationTypeLabel}, max depth ${list.size} strata:`;
	if (list.rows.length === 0) {
		return [header, "  (no non-empty strata)"].join("\n");
	}

	const considered =
		reach && !reach.showAll
			? list.rows.filter((r) => isReachable(r.index, reach.depth))
			: list.rows;

	if (considered.length === 0 && reach) {
		return [
			header,
			"  (no reachable strata)",
			reachLegend(0, list.rows.length, reach.depth),
		].join("\n");
	}

	const lines = [header];
	for (const r of considered) {
		const stats = r.stats === 0n ? "" : `  ${formatStats(r.stats, r.itemId)}`;
		const unreachable = reach && !isReachable(r.index, reach.depth);
		const suffix = unreachable ? "  OOD" : "";
		lines.push(
			`  [${String(r.index).padStart(3)}] ${formatItem(r.itemId).padEnd(28)}  reserve ${String(r.reserve).padStart(6)}  richness ${r.richness}${stats}${suffix}`,
		);
	}

	if (reach) {
		const reachable = list.rows.filter((r) => isReachable(r.index, reach.depth)).length;
		lines.push(reachLegend(reachable, list.rows.length, reach.depth));
		if (reach.showAll) lines.push("OOD = out of depth");
	}

	return lines.join("\n");
}

async function buildStrataList(x: bigint, y: bigint): Promise<StrataList> {
	const gameSeed = await getGameSeed();
	const state = (await server.table("state").get()) as unknown as { seed: string } | null;
	if (!state) throw new Error("Server state row not found");
	const epochSeed = Checksum256.from(state.seed);
	const coord = { x, y };
	const loc = deriveLocationStatic(gameSeed, coord);
	const locType = loc.type.toNumber() as LocationType;
	const subtype = loc.subtype.toNumber();
	const size = deriveLocationSize(loc);
	const rows: StrataRow[] = [];
	for (let i = 0; i < size; i++) {
		const s = deriveStratum(epochSeed, coord, i, locType, subtype, size);
		if (s.reserve === 0) continue;
		const stats = deriveResourceStats(s.seed);
		const packed = encodeStats([stats.stat1, stats.stat2, stats.stat3]);
		rows.push({
			index: i,
			itemId: s.itemId,
			reserve: s.reserve,
			richness: s.richness,
			stats: packed,
		});
	}
	return {
		x,
		y,
		locationTypeLabel: LOCATION_TYPE_NAMES[locType] ?? "Unknown",
		size,
		rows,
	};
}

export interface StratumDetailData {
	stratum: any;
	stats: any;
	index: number;
}

export function register(program: Command): void {
	program
		.command("stratum")
		.description("Show strata at a location (list) or detail for one stratum (with index)")
		.argument("<x>", "x coordinate", parseInt64)
		.argument("<y>", "y coordinate", parseInt64)
		.argument("[index]", "stratum index (omit to list all non-empty)", parseUint32)
		.option("--entity <ref>", "scope listing to the entity's gatherer depth", parseEntityRef)
		.option("--all", "with --entity, show all rows and mark out-of-depth with OOD")
		.option("--json", "emit JSON instead of formatted text")
		.action(
			async (
				x: bigint,
				y: bigint,
				index: number | undefined,
				opts: { entity?: EntityRef; all?: boolean; json?: boolean },
			) => {
				if (index === undefined) {
					const list = await buildStrataList(x, y);
					const reach = opts.entity
						? {
								depth: (await resolveReach(opts.entity)).gatherer.depth,
								showAll: Boolean(opts.all),
							}
						: undefined;
					console.log(
						formatOutput(list, { json: Boolean(opts.json) }, (d) =>
							renderList(d, reach),
						),
					);
					return;
				}
				const result = (await server.readonly("getstratum", {
					x,
					y,
					stratum: index,
				})) as { stratum: any; stats: any };
				const data: StratumDetailData = {
					stratum: result.stratum,
					stats: result.stats,
					index,
				};
				console.log(
					formatOutput(data, { json: Boolean(opts.json) }, (d) =>
						renderDetail(d.stratum, d.stats, d.index),
					),
				);
			},
		);
}
