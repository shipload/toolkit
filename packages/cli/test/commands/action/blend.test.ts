import { expect, test } from "bun:test";
import { buildAction } from "../../../src/commands/action/blend";

test("blend builds action with inputs", async () => {
	const action = await buildAction({
		entityType: "ship",
		entityId: 1n,
		inputs: [{ itemId: 5, quantity: 100, stackId: 0n }],
	});
	expect(action.name.toString()).toBe("blend");
});

test("blend buildAction accepts multi-stack inputs", async () => {
	const action = await buildAction({
		entityType: "ship",
		entityId: 1n,
		inputs: [
			{ itemId: 301, quantity: 11, stackId: 1000n },
			{ itemId: 301, quantity: 21, stackId: 2000n },
		],
	});
	expect(action.name.toString()).toBe("blend");
});
