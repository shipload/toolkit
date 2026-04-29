import type { EventRecord } from "./indexer";

function s(d: Record<string, unknown>, key: string): string {
	const v = d[key];
	if (v === undefined || v === null) return "?";
	return String(v);
}

function coords(d: Record<string, unknown>): string {
	return `(${s(d, "x")}, ${s(d, "y")})`;
}

export function summarizeEvent(rec: EventRecord): string {
	const d = rec.data;
	switch (rec.type) {
		case "player_joined":
			return "joined the game";
		case "travel":
			return `travel → ${coords(d)}`;
		case "recharge":
			return "recharged";
		case "transfer":
			return `transfer → ${s(d, "dest_type")} ${s(d, "dest_id")} (item ${s(d, "item_id")} ×${s(d, "quantity")})`;
		case "resolve":
			return "resolved tasks";
		case "cancel":
			return "cancelled tasks";
		case "entity_created":
			return `created ${s(d, "entity_type")} ${s(d, "id")}`;
		case "entity_module_added":
			return `added module ${s(d, "item_id")}`;
		case "entity_module_removed":
			return `removed module ${s(d, "item_id")}`;
		case "gather_started":
			return "gather started";
		case "craft_started":
			return `craft started (recipe ${s(d, "recipe_id")})`;
		case "entity_deployed":
			return "deployed";
		case "warp_started":
			return `warp → ${coords(d)}`;
		case "entity_wrapped":
			return `wrapped ${s(d, "entity_type")} ${s(d, "entity_id")}`;
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
