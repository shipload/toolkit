import type { Command } from "commander";
import { parseUint32 } from "../../lib/args";
import { server } from "../../lib/client";
import { formatCategory, formatItem, formatOutput } from "../../lib/format";

interface RecipeInput {
	item_id: number;
	category: number;
	quantity: number;
}

interface StatSlot {
	sources: { input_index: number; input_stat_index: number }[];
}

interface Recipe {
	output_item_id: number;
	output_mass: number;
	inputs: RecipeInput[];
	stat_slots: StatSlot[];
	blend_weights: number[];
	output_item?: { id: number; mass: number };
	input_items?: { id: number; mass: number }[];
}

function formatInput(i: RecipeInput): string {
	if (i.item_id > 0) return `${i.quantity}× ${formatItem(i.item_id)}`;
	return `${i.quantity}× ${formatCategory(i.category)}`;
}

export function renderList(recipes: Recipe[]): string {
	const lines = [`Recipes (${recipes.length}):`];
	for (const r of recipes) {
		const inputs = r.inputs.map(formatInput).join(" + ");
		const output = formatItem(r.output_item_id);
		lines.push(`  [${r.output_item_id}] ${output} ← ${inputs}`);
	}
	return lines.join("\n");
}

export function renderDetail(r: Recipe): string {
	const lines = [`Output:   ${formatItem(r.output_item_id)} (mass ${r.output_mass})`, `Inputs:`];
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
