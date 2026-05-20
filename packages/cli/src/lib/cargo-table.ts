import {
	displayName,
	formatMass,
	getItem,
	resolveItem,
	type ServerTypes,
} from "@shipload/sdk";
import Table from "cli-table3";
import { stackKey, type StackDelta, type StackKey } from "./cargo-projection";
import { formatItemStats } from "./item-stats";

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
	deltas?: Map<StackKey, StackDelta>;
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

export function sortCargoForDisplay<T extends CargoLike>(cargo: readonly T[]): T[] {
	return [...cargo].sort((a, b) => {
		const itemDiff = Number(a.item_id) - Number(b.item_id);
		if (itemDiff !== 0) return itemDiff;
		const aIdRaw = (a as CargoLike).id;
		const bIdRaw = (b as CargoLike).id;
		const aId =
			aIdRaw === undefined || aIdRaw === null ? 0n : BigInt(aIdRaw.toString());
		const bId =
			bIdRaw === undefined || bIdRaw === null ? 0n : BigInt(bIdRaw.toString());
		if (aId === 0n && bId !== 0n) return 1;
		if (bId === 0n && aId !== 0n) return -1;
		if (aId < bId) return -1;
		if (aId > bId) return 1;
		return 0;
	});
}

export function safeItemName(itemId: number, fallback?: string): string {
	try {
		return displayName(resolveItem(itemId));
	} catch {
		return fallback ?? `Item ${itemId}`;
	}
}

export function formatCargoRef(itemId: number, stackId?: number | bigint): string {
	const stackSuffix = stackId !== undefined ? `, stack ${stackId}` : "";
	return `${safeItemName(itemId)} (item-id ${itemId}${stackSuffix})`;
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

function formatQtyCell(qty: number, delta: StackDelta | undefined): string {
	if (!delta) return String(qty);
	if (delta.kind === "new") return `(new) ${qty}`;
	if (delta.kind === "add") return `${qty} (+${delta.quantity.toString()})`;
	return `${qty} (-${delta.quantity.toString()})`;
}

function cargoRow(
	c: CargoLike,
	columns: CargoColumn[],
	deltas?: Map<StackKey, StackDelta>,
): string[] {
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
	const delta = deltas
		? deltas.get(stackKey(BigInt(c.item_id.toString()), stackId, (c.modules ?? []) as unknown[]))
		: undefined;
	const row: string[] = [];
	for (const col of columns) {
		switch (col) {
			case "qty":
				row.push(formatQtyCell(qty, delta));
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
		table.push(cargoRow(c, columns, opts.deltas));
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
