import { describe, expect, test } from "bun:test";

describe("client lazy initialization", () => {
	test("exports getShipload as a function, not a pre-awaited value", async () => {
		const mod = await import("../../src/lib/client");
		expect(typeof mod.getShipload).toBe("function");
	});

	test("getShipload returns the same promise across calls (cached)", () => {
		const mod = require("../../src/lib/client");
		const p1 = mod.getShipload();
		const p2 = mod.getShipload();
		expect(p1).toBe(p2);
	});
});
