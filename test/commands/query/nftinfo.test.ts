import { expect, test } from "bun:test";
import { render } from "../../../src/commands/query/nftinfo";

test("nftinfo renders schemas and templates", () => {
	const input = {
		schemas: [
			{
				schema_name: "ore",
				fields: [
					{ name: "quantity", field_type: "uint64" },
					{ name: "stats", field_type: "uint64" },
				],
			},
		],
		templates: [
			{ item_id: 20001, schema_name: "hullplates" },
			{ item_id: 10100, schema_name: "engine" },
		],
	};
	const out = render(input as any, false);
	expect(out).toContain("NFT schemas (1)");
	expect(out).toContain("ore");
	expect(out).toContain("quantity:uint64");
	expect(out).toContain("NFT templates (2)");
	expect(out).toContain("20001");
	expect(out).toContain("hullplates");
});

test("nftinfo --raw emits JSON", () => {
	const out = render({ schemas: [], templates: [] } as any, true);
	expect(JSON.parse(out)).toEqual({ schemas: [], templates: [] });
});
