import { expect, test } from "bun:test";
import { buildAction } from "../../../src/commands/action/deploy";

test("deploy builds action with stats default 0", async () => {
	const action = await buildAction({
		entityType: "ship",
		entityId: 1n,
		packedItemId: 5,
		stats: 0n,
		entityName: "Explorer",
	});
	expect(action.name.toString()).toBe("deploy");
});

test("deploy respects explicit --stats", async () => {
	const action = await buildAction({
		entityType: "ship",
		entityId: 1n,
		packedItemId: 5,
		stats: 42n,
		entityName: "Explorer",
	});
	expect(action.name.toString()).toBe("deploy");
});
