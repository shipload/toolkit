import {
	categoryLabel,
	formatTier,
	getComponents,
	getEntityItems,
	getItems,
	getModules,
	getResources,
	type Item,
	type ItemType,
	typeLabel,
} from "@shipload/sdk";
import type { Command } from "commander";
import { formatItem, formatOutput } from "../../lib/format";

export function renderPretty(items: Item[]): string {
	const lines = [`Items (${items.length}):`];
	for (const item of items) {
		const id = Number(item.id);
		const label = item.category ? categoryLabel(item.category) : typeLabel(item.type);
		lines.push(
			`  ${formatItem(id).padEnd(30)}  ${label.padEnd(12)}  ${formatTier(Number(item.tier))}  mass ${item.mass}`,
		);
	}
	return lines.join("\n");
}

export function render(items: Item[], raw: boolean): string {
	if (raw) return JSON.stringify(items, null, 2);
	return renderPretty(items);
}

const VALID_TYPES: readonly ItemType[] = ["resource", "component", "module", "entity"];

function filterByType(type?: string): Item[] {
	if (!type) return getItems();
	if (!VALID_TYPES.includes(type as ItemType)) {
		throw new Error(`Invalid --type: ${type}. Must be one of: ${VALID_TYPES.join(", ")}`);
	}
	switch (type as ItemType) {
		case "resource":
			return getResources();
		case "component":
			return getComponents();
		case "module":
			return getModules();
		case "entity":
			return getEntityItems();
	}
}

export function register(program: Command): void {
	program
		.command("items")
		.description("List available items")
		.option("--type <type>", "filter by item type (resource, component, module, entity)")
		.option("--raw", "emit raw JSON")
		.option("--json", "emit JSON instead of formatted text")
		.action(async (options: { type?: string; raw: boolean; json?: boolean }) => {
			const data = filterByType(options.type);
			console.log(
				formatOutput(
					data,
					{ json: Boolean(options.json) || Boolean(options.raw) },
					renderPretty,
				),
			);
		});
}
