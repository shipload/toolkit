import { expect, test } from "bun:test";
import { render } from "../../../src/commands/query/whoami";

test("whoami renders session actor and permission", () => {
	const out = render({ actor: "alice", permission: "active", publicKey: "PUB_K1_XXX" });
	expect(out).toContain("alice");
	expect(out).toContain("active");
	expect(out).toContain("PUB_K1_XXX");
});
