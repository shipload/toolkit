import {
	computeCrafterCapabilities,
	computeEngineCapabilities,
	computeGathererCapabilities,
	computeGeneratorCapabilities,
	computeHaulerCapabilities,
	computeLoaderCapabilities,
	decodeCraftedItemStats,
	decodeStat,
	displayName,
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
	type ServerTypes,
} from "@shipload/sdk";
import Table from "cli-table3";

type CargoLike = ServerTypes.cargo_item & {id?: ServerTypes.cargo_view['id'] | bigint | number};

export type CargoColumn =
	| "qty"
	| "item"
	| "itemId"
	| "stats"
	| "each"
	| "mass"
	| "stack"
	| "rowId";

export interface CargoTableOptions {
	indent?: string;
	columns?: CargoColumn[];
}

const DEFAULT_COLUMNS: CargoColumn[] = [
	"item",
	"itemId",
	"stack",
	"qty",
	"each",
	"mass",
	"stats",
];

const COLUMN_HEADERS: Record<CargoColumn, string> = {
	qty: "Qty",
	item: "Item",
	itemId: "Item ID",
	stats: "Stats / Capability",
	each: "Each",
	mass: "Mass",
	stack: "Stack ID",
	rowId: "Row ID",
};

const RIGHT_ALIGNED: Set<CargoColumn> = new Set(["qty", "itemId", "each", "mass", "stack", "rowId"]);

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

function safeItemName(itemId: number, fallback?: string): string {
	try {
		return displayName(resolveItem(itemId));
	} catch {
		return fallback ?? `Item ${itemId}`;
	}
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

function moduleSubRows(
	modules: ServerTypes.module_entry[] | undefined,
	columns: CargoColumn[],
): string[][] {
	if (!modules || modules.length === 0) return [];
	const rows: string[][] = [];
	for (const m of modules) {
		if (!m.installed) continue;
		const modItemId = Number(m.installed.item_id.value.toString());
		const modStats = BigInt(m.installed.stats.toString());
		const name = `  └ ${safeItemName(modItemId)}`;
		const capability = formatItemStats(modItemId, modStats);
		const row: string[] = [];
		for (const col of columns) {
			switch (col) {
				case "qty":
					row.push("");
					break;
				case "item":
					row.push(name);
					break;
				case "itemId":
					row.push(String(modItemId));
					break;
				case "stats":
					row.push(capability);
					break;
				case "each":
					row.push("");
					break;
				case "mass":
					row.push("");
					break;
				case "stack":
					row.push(String(modStats));
					break;
				case "rowId":
					row.push("");
					break;
			}
		}
		rows.push(row);
	}
	return rows;
}

function cargoRow(c: CargoLike, columns: CargoColumn[]): string[] {
	const itemId = Number(c.item_id);
	const qty = Number(c.quantity);
	const stackId = BigInt(c.stats.toString());
	const name = safeItemName(itemId);
	const stats = formatItemStats(itemId, stackId);
	let eachMass = "";
	let totalMass = "";
	try {
		const unitMass = getItem(itemId).mass;
		eachMass = formatMass(unitMass);
		totalMass = formatMass(unitMass * qty);
	} catch {}
	const row: string[] = [];
	for (const col of columns) {
		switch (col) {
			case "qty":
				row.push(String(qty));
				break;
			case "item":
				row.push(name);
				break;
			case "itemId":
				row.push(String(itemId));
				break;
			case "stats":
				row.push(stats);
				break;
			case "each":
				row.push(eachMass);
				break;
			case "mass":
				row.push(totalMass);
				break;
			case "stack":
				row.push(String(stackId));
				break;
			case "rowId": {
				const raw = (c as CargoLike).id;
				const value =
					raw === undefined || raw === null ? 0n : BigInt(raw.toString());
				row.push(value === 0n ? "—" : value.toString());
				break;
			}
		}
	}
	return row;
}

export function formatCargoTable(
	cargo: CargoLike[],
	opts: CargoTableOptions = {},
): string {
	if (cargo.length === 0) return "";
	const columns = opts.columns ?? DEFAULT_COLUMNS;
	const indent = opts.indent ?? "";

	const colAligns = columns.map((c) => (RIGHT_ALIGNED.has(c) ? "right" : "left")) as (
		| "left"
		| "right"
	)[];

	const table = new Table({
		head: columns.map((c) => COLUMN_HEADERS[c]),
		colAligns,
		chars: {
			top: "",
			"top-mid": "",
			"top-left": "",
			"top-right": "",
			bottom: "",
			"bottom-mid": "",
			"bottom-left": "",
			"bottom-right": "",
			left: indent,
			"left-mid": "",
			mid: "",
			"mid-mid": "",
			right: "",
			"right-mid": "",
			middle: "  ",
		},
		style: { head: [], border: [], "padding-left": 0, "padding-right": 0 },
	});

	for (const c of cargo) {
		table.push(cargoRow(c, columns));
		for (const sub of moduleSubRows(c.modules, columns)) {
			table.push(sub);
		}
	}

	return table
		.toString()
		.split("\n")
		.map((line) => line.trimEnd())
		.join("\n");
}
