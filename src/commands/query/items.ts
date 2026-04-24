import type { Command } from "commander";
import { server } from "../../lib/client";
import {
	categoryLabelFromName,
	formatItem,
	formatOutput,
	formatTier,
	resolveItemCategory,
	typeLabel,
} from "../../lib/format";

export function renderPretty(items: any[]): string {
	const lines = [`Items (${items.length}):`];
	for (const item of items) {
		const id = Number(item.id);
		const cat = resolveItemCategory(id);
		const label = cat ? categoryLabelFromName(cat) : typeLabel(Number(item.type));
		lines.push(
			`  ${formatItem(id).padEnd(30)}  ${label.padEnd(12)}  ${formatTier(Number(item.tier))}  mass ${item.mass}`,
		);
	}
	return lines.join("\n");
}

export function render(items: any[], raw: boolean): string {
	if (raw) return JSON.stringify(items, null, 2);
	return renderPretty(items);
}

export function register(program: Command): void {
	program
		.command("items")
		.description("List available items")
		.option("--raw", "emit raw JSON")
		.option("--json", "emit JSON instead of formatted text")
		.action(async (options: { raw: boolean; json?: boolean }) => {
			const result = (await server.readonly("getitems", {})) as { items: any[] };
			const data = result.items ?? [];
			console.log(
				formatOutput(
					data,
					{ json: Boolean(options.json) || Boolean(options.raw) },
					renderPretty,
				),
			);
		});
}
