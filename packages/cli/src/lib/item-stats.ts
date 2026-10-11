import {
	computeModuleCapabilities,
	decodeCraftedItemStats,
	decodeStat,
	FIGURE_SECTION_LABELS,
	formatMass,
	getItem,
	getStatDefinitions,
	isModuleItem,
	MODULE_FIGURE_SECTION,
	resolveItem,
	resolveItemCategory,
	type ResourceCategory,
} from "@shipload/sdk";
import { formatModuleFigures, formatModuleRaw } from "./figures";

export interface ItemStatsOptions {
	raw?: boolean;
}

const ALL_STAT_KEY_TO_ABBR: Map<string, string> = (() => {
	const map = new Map<string, string>();
	for (const cat of ["ore", "crystal", "gas", "regolith", "biomass"] as ResourceCategory[]) {
		for (const def of getStatDefinitions(cat)) {
			if (!map.has(def.key)) map.set(def.key, def.abbreviation);
		}
	}
	return map;
})();

function abbreviateKey(key: string): string {
	return ALL_STAT_KEY_TO_ABBR.get(key) ?? key.slice(0, 3).toUpperCase();
}

function statPair(label: string, value: number): string {
	return `${label} ${String(value).padStart(3, " ")}`;
}

function formatResourceStats(itemId: number, stats: bigint): string {
	if (stats === 0n) return "";
	const cat = resolveItemCategory(itemId);
	if (!cat) return "";
	const defs = getStatDefinitions(cat);
	const values = [decodeStat(stats, 0), decodeStat(stats, 1), decodeStat(stats, 2)];
	return values.map((v, i) => statPair(defs[i].abbreviation, v)).join(" / ");
}

function formatComponentStats(itemId: number, stats: bigint): string {
	if (stats === 0n) return "";
	const decoded = decodeCraftedItemStats(itemId, stats);
	const parts: string[] = [];
	for (const [key, value] of Object.entries(decoded)) {
		if (value === 0) continue;
		parts.push(statPair(abbreviateKey(key), value));
	}
	return parts.join(" / ");
}

function formatModuleCapability(itemId: number, stats: bigint, raw: boolean): string {
	if (!raw) return formatModuleFigures(itemId, stats) || formatComponentStats(itemId, stats);
	const caps = computeModuleCapabilities(itemId, stats);
	if (!caps) return formatComponentStats(itemId, stats);
	return `${FIGURE_SECTION_LABELS[MODULE_FIGURE_SECTION[caps.kind]]}: ${formatModuleRaw(itemId, stats)}`;
}

function formatEntityStats(itemId: number, stats: bigint): string {
	if (stats === 0n) return "";
	try {
		const resolved = resolveItem(itemId, stats);
		const hull = resolved.attributes?.find((g) => g.capability === "Hull");
		if (!hull) return formatComponentStats(itemId, stats);
		const parts = hull.attributes.map((a) => {
			if (a.label === "Mass") return `mass ${formatMass(a.value)}`;
			if (a.label === "Capacity") return `cap ${formatMass(a.value)}`;
			return `${a.label.toLowerCase()} ${a.value}`;
		});
		return `Hull: ${parts.join(" · ")}`;
	} catch {
		return formatComponentStats(itemId, stats);
	}
}

export function formatItemStats(
	itemId: number,
	stats: bigint,
	opts: ItemStatsOptions = {},
): string {
	if (stats === 0n) return "";
	let item: ReturnType<typeof getItem> | undefined;
	try {
		item = getItem(itemId);
	} catch {
		return formatComponentStats(itemId, stats);
	}
	if (item.type === "module" || isModuleItem(itemId)) {
		return formatModuleCapability(itemId, stats, Boolean(opts.raw));
	}
	switch (item.type) {
		case "resource":
			return formatResourceStats(itemId, stats);
		case "component":
			return formatComponentStats(itemId, stats);
		case "entity":
			return formatEntityStats(itemId, stats);
		default:
			return formatComponentStats(itemId, stats);
	}
}
