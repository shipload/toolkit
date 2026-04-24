import { expect, test } from "bun:test";
import { buildAction } from "../../../src/commands/action/blend";

test("blend builds action with inputs", async () => {
	const action = await buildAction({
		entityType: "ship",
		entityId: 1n,
		inputs: [{ itemId: 5, quantity: 100, stats: 0n }],
	});
	expect(action.name.toString()).toBe("blend");
});
