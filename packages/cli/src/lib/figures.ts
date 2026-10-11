import {
	computeEntitySheet,
	computeModuleCapabilities,
	displayName,
	type EntitySheet,
	type EntitySheetSource,
	entitySheetInput,
	type FigureLine,
	getEntityLayout,
	getModuleFigures,
	resolveItem,
	type SheetRow,
} from "@shipload/sdk";
import { kvTable } from "./format";

export { formatEnergyAmount, formatRechargePerMinute, wholeEnergy } from "./format";

export function moduleDisplay(itemId: number): string {
	try {
		return displayName(resolveItem(itemId));
	} catch {
		return `item ${itemId}`;
	}
}

export function formatModuleFigures(itemId: number, stats: bigint): string {
	const figures = getModuleFigures(itemId, stats);
	if (!figures) return "";
	const rows = figures.rows.map((r) => `${r.label} ${r.text}`).join(" · ");
	return `${figures.sectionLabel}: ${rows}`;
}

export function formatModuleRaw(itemId: number, stats: bigint, outputPct = 100): string {
	const caps = computeModuleCapabilities(itemId, stats, outputPct);
	if (!caps) return "";
	return Object.entries(caps)
		.filter(([key]) => key !== "kind" && key !== "tier")
		.map(([key, value]) => `${key} ${value}`)
		.join(" · ");
}

export function slotOutputPct(entityItemId: number, slotIndex: number): number {
	return getEntityLayout(entityItemId)?.slots[slotIndex]?.outputPct ?? 100;
}

function lineLabel(line: FigureLine): string {
	if (line.slotIndex === undefined) return `${line.label}:`;
	const pct = line.outputPct !== undefined ? ` at ${line.outputPct}%` : "";
	return `${line.label} · #${line.slotIndex}${pct}:`;
}

function showBreakdown(row: SheetRow): boolean {
	const lines = row.breakdown ?? [];
	if (lines.length > 1) return true;
	return lines.length === 1 && lines[0].value !== row.value;
}

function rowValue(row: SheetRow): string {
	return row.note ? `${row.text}  (${row.note})` : row.text;
}

export function renderEntitySheet(sheet: EntitySheet): string | null {
	if (sheet.sections.length === 0) return null;
	const blocks = sheet.sections.map((section) => {
		const rows: [string, string][] = [];
		for (const row of section.rows) {
			rows.push([`${row.label}:`, rowValue(row)]);
			if (!showBreakdown(row)) continue;
			for (const line of row.breakdown ?? []) {
				rows.push([`  ${lineLabel(line)}`, line.text]);
			}
		}
		return [`  ${section.label}:`, kvTable(rows, { indent: "    " })].join("\n");
	});
	return blocks.join("\n");
}

export function entitySheetSection(entity: EntitySheetSource): string | null {
	if ((entity.modules ?? []).every((m) => !m.installed)) return null;
	try {
		return renderEntitySheet(computeEntitySheet(entitySheetInput(entity)));
	} catch {
		return null;
	}
}

export const RAW_STATS_NOTE =
	"  Values as the contract stores them, at each slot's output. Energy is in thousandths, mass in tenths of a tonne.";
