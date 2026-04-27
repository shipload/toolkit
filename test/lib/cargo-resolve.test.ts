import { describe, expect, test } from "bun:test";
import {
	type ParsedCargoInput,
	type ResolvedCargoInput,
	resolveCargoInputs,
} from "../../src/lib/cargo-resolve";
import { ValidationError } from "../../src/lib/validate";

function stack(itemId: number, quantity: number, stackId: bigint) {
	return { item_id: itemId, quantity, stats: stackId, modules: [] } as any;
}

describe("ParsedCargoInput / ResolvedCargoInput types", () => {
	test("ParsedCargoInput has required stackId", () => {
		const p: ParsedCargoInput = { itemId: 201, quantity: 12, stackId: 0n };
		expect(p.stackId).toBe(0n);
	});
	test("ResolvedCargoInput has required stackId", () => {
		const r: ResolvedCargoInput = { itemId: 201, quantity: 12, stackId: 278035729n };
		expect(r.stackId).toBe(278035729n);
	});
});

describe("resolveCargoInputs — single input matching one stack", () => {
	test("resolves a single input to the correct stack", () => {
		const cargo = [stack(201, 45, 251479207179n)];
		const result = resolveCargoInputs(
			[{ itemId: 201, quantity: 12, stackId: 251479207179n }],
			cargo,
		);
		expect(result).toEqual([{ itemId: 201, quantity: 12, stackId: 251479207179n }]);
	});
	test("rejects when stack-id doesn't match any stack for the item-id", () => {
		const cargo = [stack(201, 45, 251479207179n)];
		expect(() =>
			resolveCargoInputs([{ itemId: 201, quantity: 12, stackId: 999n }], cargo),
		).toThrow(/stack 999/);
	});
	test("rejects when item-id absent from cargo", () => {
		const cargo = [stack(101, 50, 0n)];
		expect(() =>
			resolveCargoInputs([{ itemId: 201, quantity: 12, stackId: 0n }], cargo),
		).toThrow(/item 201/);
	});
});

describe("resolveCargoInputs — qty validation", () => {
	test("rejects when one input's qty exceeds its stack's qty", () => {
		const cargo = [stack(201, 12, 0n)];
		expect(() =>
			resolveCargoInputs([{ itemId: 201, quantity: 15, stackId: 0n }], cargo),
		).toThrow(/12.*15/);
	});
	test("accepts qty == stack qty", () => {
		const cargo = [stack(201, 12, 0n)];
		const result = resolveCargoInputs([{ itemId: 201, quantity: 12, stackId: 0n }], cargo);
		expect(result[0].quantity).toBe(12);
	});
});

describe("resolveCargoInputs — multi-stack same item", () => {
	test("accepts two inputs drawing from different stacks of same item", () => {
		const cargo = [stack(301, 11, 1000n), stack(301, 21, 2000n)];
		const result = resolveCargoInputs(
			[
				{ itemId: 301, quantity: 11, stackId: 1000n },
				{ itemId: 301, quantity: 21, stackId: 2000n },
			],
			cargo,
		);
		expect(result).toEqual([
			{ itemId: 301, quantity: 11, stackId: 1000n },
			{ itemId: 301, quantity: 21, stackId: 2000n },
		]);
	});
	test("rejects duplicate (item-id, stack-id) pairs as configuration error", () => {
		const cargo = [stack(301, 100, 1000n)];
		expect(() =>
			resolveCargoInputs(
				[
					{ itemId: 301, quantity: 10, stackId: 1000n },
					{ itemId: 301, quantity: 5, stackId: 1000n },
				],
				cargo,
			),
		).toThrow(/listed twice/);
	});
});

describe("ValidationError class is exported correctly", () => {
	test("thrown errors are ValidationError instances", () => {
		expect(() => resolveCargoInputs([{ itemId: 201, quantity: 1, stackId: 0n }], [])).toThrow(
			ValidationError,
		);
	});
});
