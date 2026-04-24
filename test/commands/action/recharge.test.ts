import { expect, test } from "bun:test";
import { buildAction } from "../../../src/commands/action/recharge";

test("recharge builds action for ship", async () => {
	const action = await buildAction({ entityType: "ship", entityId: 42n });
	expect(action.name.toString()).toBe("recharge");
});

test("recharge builds action for warehouse", async () => {
	const action = await buildAction({ entityType: "warehouse", entityId: 5n });
	expect(action.name.toString()).toBe("recharge");
});
