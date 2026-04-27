import { expect, test } from "bun:test";
import { buildAction } from "../../../src/commands/action/travel";

test("travel includes recharge=true by default", async () => {
	const action = await buildAction({ shipId: 42n, x: 10n, y: 20n, recharge: true });
	expect(action.name.toString()).toBe("travel");
	expect((action.decoded.data as any).recharge).toBe(true);
});

test("travel respects --no-recharge", async () => {
	const action = await buildAction({ shipId: 42n, x: 10n, y: 20n, recharge: false });
	expect((action.decoded.data as any).recharge).toBe(false);
});
