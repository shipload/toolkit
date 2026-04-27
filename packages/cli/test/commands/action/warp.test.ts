import { expect, test } from "bun:test";
import { buildAction } from "../../../src/commands/action/warp";

test("warp builds action for ship", async () => {
	const action = await buildAction({
		entityType: "ship",
		entityId: 1n,
		x: 10n,
		y: 20n,
	});
	expect(action.name.toString()).toBe("warp");
});

test("warp builds action for warehouse", async () => {
	const action = await buildAction({
		entityType: "warehouse",
		entityId: 5n,
		x: 0n,
		y: 0n,
	});
	expect(action.name.toString()).toBe("warp");
});
