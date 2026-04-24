import { describe, expect, test } from "bun:test";
import type { ParsedCargoInput, ResolvedCargoInput } from "../../src/lib/cargo-resolve";
import { resolveCargoInputs } from "../../src/lib/cargo-resolve";
import { ValidationError } from "../../src/lib/validate";

describe("cargo-resolve types", () => {
	test("ParsedCargoInput allows null stats", () => {
		const p: ParsedCargoInput = { itemId: 201, quantity: 12, stats: null };
		expect(p.stats).toBeNull();
	});
	test("ParsedCargoInput allows explicit bigint stats", () => {
		const p: ParsedCargoInput = { itemId: 201, quantity: 12, stats: 0n };
		expect(p.stats).toBe(0n);
	});
	test("ResolvedCargoInput requires concrete bigint stats", () => {
		const r: ResolvedCargoInput = { itemId: 201, quantity: 12, stats: 278035729n };
		expect(r.stats).toBe(278035729n);
	});
});

function stack(itemId: number, quantity: number, stats: bigint) {
	return { item_id: itemId, quantity, stats, modules: [] } as any;
}

describe("resolveCargoInputs — no match", () => {
	test("throws ValidationError when cargo has no stacks at all", () => {
		expect(() => resolveCargoInputs([{ itemId: 201, quantity: 12, stats: null }], [])).toThrow(
			ValidationError,
		);
	});
	test("throws ValidationError when cargo has no stacks for that item_id", () => {
		const cargo = [stack(101, 50, 0n), stack(501, 20, 0n)];
		expect(() =>
			resolveCargoInputs([{ itemId: 201, quantity: 12, stats: null }], cargo),
		).toThrow(/item 201/);
	});
	test("no-match error lists available item ids", () => {
		const cargo = [stack(101, 50, 0n), stack(501, 20, 0n)];
		try {
			resolveCargoInputs([{ itemId: 201, quantity: 12, stats: null }], cargo);
		} catch (e) {
			expect((e as Error).message).toContain("101");
			expect((e as Error).message).toContain("501");
			return;
		}
		throw new Error("expected throw");
	});
});

describe("resolveCargoInputs — auto-match single", () => {
	test("uses the single matching stack's stats when parsed.stats is null", () => {
		const cargo = [stack(201, 45, 251479207179n)];
		const result = resolveCargoInputs([{ itemId: 201, quantity: 12, stats: null }], cargo);
		expect(result).toEqual([{ itemId: 201, quantity: 12, stats: 251479207179n }]);
	});
	test("preserves requested quantity, not stack quantity", () => {
		const cargo = [stack(201, 45, 251479207179n)];
		const result = resolveCargoInputs([{ itemId: 201, quantity: 12, stats: null }], cargo);
		expect(result[0].quantity).toBe(12);
		expect(result[0].stats).toBe(251479207179n);
	});
});

describe("resolveCargoInputs — explicit stats", () => {
	test("accepts explicit stats that match a stack", () => {
		const cargo = [stack(201, 45, 251479207179n), stack(201, 18, 278035729n)];
		const result = resolveCargoInputs(
			[{ itemId: 201, quantity: 12, stats: 278035729n }],
			cargo,
		);
		expect(result).toEqual([{ itemId: 201, quantity: 12, stats: 278035729n }]);
	});
	test("throws when explicit stats don't match any stack for that item", () => {
		const cargo = [stack(201, 45, 251479207179n)];
		try {
			resolveCargoInputs([{ itemId: 201, quantity: 12, stats: 999n }], cargo);
		} catch (e) {
			expect((e as Error).message).toContain("item 201");
			expect((e as Error).message).toContain("stats 999");
			expect((e as Error).message).toContain("251479207179");
			expect((e as Error).message).toContain("--input 201:12:251479207179");
			return;
		}
		throw new Error("expected throw");
	});
});

describe("resolveCargoInputs — ambiguous auto-match", () => {
	test("throws with copy-paste --input lines when 2+ stacks match", () => {
		const cargo = [stack(201, 45, 251479207179n), stack(201, 18, 278035729n)];
		try {
			resolveCargoInputs([{ itemId: 201, quantity: 12, stats: null }], cargo);
		} catch (e) {
			const msg = (e as Error).message;
			expect(msg).toContain("2 cargo stacks match item 201");
			expect(msg).toContain("--input 201:12:251479207179");
			expect(msg).toContain("--input 201:12:278035729");
			return;
		}
		throw new Error("expected throw");
	});
});

describe("resolveCargoInputs — quantity check", () => {
	test("throws when requested qty exceeds stack qty (auto-match)", () => {
		const cargo = [stack(201, 12, 251479207179n)];
		try {
			resolveCargoInputs([{ itemId: 201, quantity: 15, stats: null }], cargo);
		} catch (e) {
			const msg = (e as Error).message;
			expect(msg).toContain("12");
			expect(msg).toContain("15");
			expect(msg).toContain("251479207179");
			return;
		}
		throw new Error("expected throw");
	});
	test("throws when requested qty exceeds stack qty (explicit)", () => {
		const cargo = [stack(201, 12, 251479207179n)];
		expect(() =>
			resolveCargoInputs([{ itemId: 201, quantity: 15, stats: 251479207179n }], cargo),
		).toThrow(/12.*15/);
	});
	test("accepts requested qty == stack qty", () => {
		const cargo = [stack(201, 12, 251479207179n)];
		const result = resolveCargoInputs([{ itemId: 201, quantity: 12, stats: null }], cargo);
		expect(result[0].quantity).toBe(12);
	});
});
