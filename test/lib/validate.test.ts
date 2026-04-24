import { describe, expect, test } from "bun:test";
import { checkCapacity, checkDepth, checkEnergy, ValidationError } from "../../src/lib/validate";

describe("checkCapacity", () => {
	test("passes when cargo fits", () => {
		expect(() => checkCapacity(500_000, 0, 30_000, 16)).not.toThrow();
	});
	test("throws ValidationError and suggests max-safe quantity when it doesn't fit", () => {
		try {
			checkCapacity(500_000, 0, 30_000, 46);
			throw new Error("expected throw");
		} catch (e) {
			expect(e).toBeInstanceOf(ValidationError);
			expect((e as ValidationError).message).toContain("capacity");
			expect((e as ValidationError).suggestion).toBe("--quantity 16");
		}
	});
	test("no suggestion when zero quantity would fit", () => {
		try {
			checkCapacity(500_000, 500_000, 30_000, 1);
			throw new Error("expected throw");
		} catch (e) {
			expect(e).toBeInstanceOf(ValidationError);
			expect((e as ValidationError).suggestion).toBeUndefined();
		}
	});
});

describe("checkDepth", () => {
	test("passes for stratum within depth", () => {
		expect(() => checkDepth(100, 45)).not.toThrow();
	});
	test("throws with depth detail", () => {
		expect(() => checkDepth(100, 705)).toThrow(/depth 100/);
	});
});

describe("checkEnergy", () => {
	test("passes with sufficient energy", () => {
		expect(() => checkEnergy(350, 172)).not.toThrow();
	});
	test("throws with deficit detail", () => {
		expect(() => checkEnergy(100, 172)).toThrow(/short by 72/);
	});
});
