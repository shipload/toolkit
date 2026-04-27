import { expect, test } from "bun:test";
import { render } from "../../../src/commands/query/player";

test("player renders owner", () => {
	const out = render({ owner: "alice" } as any);
	expect(out).toContain("alice");
});
