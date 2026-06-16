import { formatTier, getItem, getRecipe } from "@shipload/sdk";
import type { EventRecord } from "./indexer";
import { toNumber } from "./snapshot-stream";

export function formatItemRef(itemId: number): string {
	try {
		const item = getItem(itemId);
		return `${item.name} (${formatTier(item.tier)})`;
	} catch {
		return `item #${itemId}`;
	}
}

export function formatRecipeOutputRef(recipeId: number): string {
	const recipe = getRecipe(recipeId);
	if (!recipe) return `recipe #${recipeId}`;
	return formatItemRef(recipe.outputItemId);
}

function s(d: Record<string, unknown>, key: string): string {
	const v = d[key];
	if (v === undefined || v === null) return "?";
	return String(v);
}

function isCoord(v: unknown): boolean {
	if (typeof v === "number") return Number.isFinite(v);
	if (typeof v === "string") return v.trim() !== "" && Number.isFinite(Number(v));
	return false;
}

function coords(d: Record<string, unknown>): string {
	const x = d.x;
	const y = d.y;
	if (isCoord(x) && isCoord(y)) return `(${x}, ${y})`;
	return "(legacy)";
}

function summarizeCargo(items: unknown): string {
	if (!Array.isArray(items) || items.length === 0) return "cargo";
	if (items.length === 1) {
		const it = items[0] as Record<string, unknown>;
		return `${s(it, "quantity")}× ${formatItemRef(toNumber(it.item_id))}`;
	}
	return `${items.length} stacks`;
}

export function summarizeEvent(rec: EventRecord): string {
	const d = rec.data;
	switch (rec.type) {
		case "player_joined":
			return "joined the game";
		case "travel": {
			const summary = `travel → ${coords(d)}`;
			return d.recharge === true ? `${summary} [+ recharge]` : summary;
		}
		case "recharge":
			return "recharged";
		case "transfer": {
			const dest = `${String(d.dest_type ?? "?")} #${toNumber(d.dest_id)}`;
			return `transfer ${s(d, "quantity")}× ${formatItemRef(toNumber(d.item_id))} → ${dest}`;
		}
		case "load":
			return `load ${summarizeCargo(d.items)} from #${toNumber(d.from_id)}`;
		case "unload":
			return `unload ${summarizeCargo(d.items)} → #${toNumber(d.to_id)}`;
		case "resolve":
			return `resolved ${d.count ?? "all"} tasks`;
		case "cancel":
			return "cancelled tasks";
		case "entity_created":
			return `created ${s(d, "entity_type")}`;
		case "entity_module_added":
			return `added ${formatItemRef(toNumber(d.item_id))}`;
		case "entity_module_removed":
			return `removed ${formatItemRef(toNumber(d.item_id))}`;
		case "gather_started": {
			const source = d.source as Record<string, unknown> | undefined;
			const destination = d.destination as Record<string, unknown> | undefined;
			const sourceId = toNumber(source?.entity_id);
			const destId = toNumber(destination?.entity_id);
			const base = `gather started · depth ${s(d, "stratum")} · ${s(d, "quantity")} stacks`;
			if (sourceId !== destId && destination?.entity_type) {
				return `${base} → ${String(destination.entity_type)} #${destId}`;
			}
			return base;
		}
		case "craft_started": {
			const base = `craft started: ${s(d, "quantity")}× ${formatRecipeOutputRef(toNumber(d.recipe_id))}`;
			const target = toNumber(d.target);
			if (target !== 0 && target !== toNumber(d.id)) return `${base} → #${target}`;
			return base;
		}
		case "entity_deployed":
			return "deployed";
		case "warp_started":
			return `warp → ${coords(d)}`;
		case "entity_wrapped":
			return "wrapped";
		case "group_travel_started":
			return `group travel → ${coords(d)}`;
		case "init":
		case "commit":
		case "enable":
			return `chain admin: ${rec.type}`;
		default:
			return rec.type;
	}
}
