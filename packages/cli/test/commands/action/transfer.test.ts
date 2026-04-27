import { expect, test } from "bun:test";
import { buildAction } from "../../../src/commands/action/transfer";

test("transfer builds action with all args", async () => {
	const action = await buildAction({
		sourceType: "ship",
		sourceId: 1n,
		destType: "warehouse",
		destId: 2n,
		itemId: 5n,
		stats: 0n,
		quantity: 100n,
	});
	expect(action.name.toString()).toBe("transfer");
});
