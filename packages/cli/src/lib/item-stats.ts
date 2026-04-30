import {
	computeCrafterCapabilities,
	computeEngineCapabilities,
	computeGathererCapabilities,
	computeGeneratorCapabilities,
	computeHaulerCapabilities,
	computeLoaderCapabilities,
	decodeCraftedItemStats,
	decodeStat,
	formatMass,
	getItem,
	getModuleCapabilityType,
	getStatDefinitions,
	isModuleItem,
	MODULE_CRAFTER,
	MODULE_ENGINE,
	MODULE_GATHERER,
	MODULE_GENERATOR,
	MODULE_HAULER,
	MODULE_LOADER,
	MODULE_STORAGE,
	MODULE_WARP,
	resolveItem,
	resolveItemCategory,
	type ResourceCategory,
} from "@shipload/sdk";

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

function formatModuleCapability(itemId: number, stats: bigint): string {
	const decoded = decodeCraftedItemStats(itemId, stats);
	const type = getModuleCapabilityType(itemId);
	switch (type) {
		case MODULE_ENGINE: {
			const c = computeEngineCapabilities(decoded);
			return `Engine: thrust ${c.thrust} · ${c.drain} energy/step`;
		}
		case MODULE_GENERATOR: {
			const c = computeGeneratorCapabilities(decoded);
			return `Generator: capacity ${c.capacity} · recharge ${c.recharge}/s`;
		}
		case MODULE_GATHERER: {
			const c = computeGathererCapabilities(decoded);
			return `Gatherer: depth ${c.depth} · yield ${c.yield} · speed ${c.speed} · ${c.drain} energy/s`;
		}
		case MODULE_HAULER: {
			const c = computeHaulerCapabilities(decoded);
			return `Hauler: capacity ${c.capacity} · efficiency ${c.efficiency} · ${c.drain} energy/load`;
		}
		case MODULE_CRAFTER: {
			const c = computeCrafterCapabilities(decoded);
			return `Crafter: speed ${c.speed} · ${c.drain} energy/craft`;
		}
		case MODULE_LOADER: {
			const c = computeLoaderCapabilities(decoded);
			return `Loader: ${formatMass(c.mass)} each · thrust ${c.thrust} · ×${c.quantity}`;
		}
		case MODULE_STORAGE: {
			const str = decoded.strength ?? 500;
			const hrd = decoded.hardness ?? 500;
			const sat = decoded.saturation ?? 500;
			const pct = 10 + Math.floor(((str + hrd + sat) * 10) / 2997);
			return `Storage: +${pct}% capacity`;
		}
		case MODULE_WARP: {
			const stat = decodeStat(stats, 0);
			return `Warp: range ${100 + stat * 3}`;
		}
		default:
			return formatComponentStats(itemId, stats);
	}
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

export function formatItemStats(itemId: number, stats: bigint): string {
	if (stats === 0n) return "";
	let item: ReturnType<typeof getItem> | undefined;
	try {
		item = getItem(itemId);
	} catch {
		return formatComponentStats(itemId, stats);
	}
	if (item.type === "module" || isModuleItem(itemId)) {
		return formatModuleCapability(itemId, stats);
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
