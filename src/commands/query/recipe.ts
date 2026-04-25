import { formatMass, formatTier, getItem } from "@shipload/sdk";
import type { Command } from "commander";
import { parseUint32 } from "../../lib/args";
import { server } from "../../lib/client";
import { formatCategory, formatOutput } from "../../lib/format";

// Wire shape returned by the server's getrecipe / getrecipes readonly actions.
// Distinct from the SDK's RecipeInput discriminated union (camelCase, item-or-category).
interface WireRecipeInput {
	item_id: number;
	category: number;
	tier: number;
	quantity: number;
}

interface StatSlot {
	sources: { input_index: number; input_stat_index: number }[];
}

interface Recipe {
	output_item_id: number;
	output_mass: number;
	inputs: WireRecipeInput[];
	stat_slots: StatSlot[];
	blend_weights: number[];
	output_item?: { id: number; mass: number };
	input_items?: { id: number; mass: number }[];
}

function formatInput(i: WireRecipeInput): string {
	const itemId = Number(i.item_id);
	const tier = Number(i.tier);
	const tierSuffix = Number.isFinite(tier) && tier > 0 ? ` ${formatTier(tier)}` : "";
	if (itemId > 0) {
		const item = getItem(itemId);
		return `${i.quantity}× ${item.name} ${formatTier(item.tier)}`;
	}
	return `${i.quantity}× ${formatCategory(Number(i.category))}${tierSuffix}`;
}

function itemName(itemId: number): string {
	try {
		const item = getItem(itemId);
		return `${item.name} ${formatTier(item.tier)}`;
	} catch {
		return `Item ${itemId}`;
	}
}

export function renderList(recipes: Recipe[]): string {
	const lines = [`Recipes (${recipes.length}):`];
	for (const r of recipes) {
		const inputs = r.inputs.map(formatInput).join(" + ");
		const output = itemName(r.output_item_id);
		lines.push(`  [${r.output_item_id}] ${output} ← ${inputs}`);
	}
	return lines.join("\n");
}

export function renderDetail(r: Recipe): string {
	const lines = [
		`Output:   ${itemName(r.output_item_id)} (${formatMass(r.output_mass)})`,
		`Inputs:`,
	];
	for (let i = 0; i < r.inputs.length; i++) {
		lines.push(`  [${i}] ${formatInput(r.inputs[i])}`);
	}
	lines.push(`Stat slots (${r.stat_slots.length}):`);
	for (let i = 0; i < r.stat_slots.length; i++) {
		const sources = r.stat_slots[i].sources
			.map((s) => `input ${s.input_index} stat ${s.input_stat_index}`)
			.join(" + ");
		lines.push(`  [${i}] ${sources}`);
	}
	if (r.blend_weights.length > 0) {
		lines.push(`Blend weights: ${r.blend_weights.join(", ")}`);
	}
	return lines.join("\n");
}

async function fetchAllRecipes(): Promise<Recipe[]> {
	const PAGE = 50;
	const all: Recipe[] = [];
	let lowerBound = 0;
	while (true) {
		const res = (await server.readonly("getrecipes", {
			lower_bound: lowerBound,
			limit: PAGE,
		})) as unknown as { recipes: Recipe[] };
		const page = res.recipes ?? [];
		all.push(...page);
		if (page.length < PAGE) break;
		lowerBound = page[page.length - 1].output_item_id + 1;
	}
	return all;
}

export function register(program: Command): void {
	program
		.command("recipe")
		.description("List all recipes, or show one by output item id")
		.addHelpText(
			"before",
			"The bracketed number [ID] in the list is the recipe id — pass it as <recipe-id> in the craft command.\n",
		)
		.argument("[id]", "output item id (omit to list all)", parseUint32)
		.option("--json", "emit JSON instead of formatted text")
		.action(async (id: number | undefined, opts: { json?: boolean }) => {
			if (id === undefined) {
				const recipes = await fetchAllRecipes();
				console.log(formatOutput(recipes, { json: Boolean(opts.json) }, renderList));
				return;
			}
			const res = (await server.readonly("getrecipe", {
				output_item_id: id,
			})) as unknown as { recipes: Recipe[] };
			const recipe = res.recipes?.[0];
			if (!recipe) {
				console.error(`No recipe with output item id ${id}`);
				process.exitCode = 1;
				return;
			}
			console.log(formatOutput(recipe, { json: Boolean(opts.json) }, renderDetail));
		});
}
