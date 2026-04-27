import { describe, expect, test } from "bun:test";
import { InvalidArgumentError } from "commander";
import {
	parseCargoInput,
	parseEntityRef,
	parseEntityRefList,
	parseEntityType,
	parseInt64,
	parseUint16,
	parseUint32,
	parseUint64,
} from "../../src/lib/args";

describe("parseEntityType", () => {
	test("accepts ship, container, warehouse", () => {
		expect(parseEntityType("ship")).toBe("ship");
		expect(parseEntityType("container")).toBe("container");
		expect(parseEntityType("warehouse")).toBe("warehouse");
	});
	test("rejects unknown type", () => {
		expect(() => parseEntityType("planet")).toThrow(InvalidArgumentError);
	});
});

describe("parseEntityRef", () => {
	test("parses ship:42", () => {
		expect(parseEntityRef("ship:42")).toEqual({ entityType: "ship", entityId: 42n });
	});
	test("parses large ids", () => {
		expect(parseEntityRef("container:18446744073709551000")).toEqual({
			entityType: "container",
			entityId: 18446744073709551000n,
		});
	});
	test("rejects missing colon", () => {
		expect(() => parseEntityRef("ship42")).toThrow(InvalidArgumentError);
	});
	test("rejects bogus type", () => {
		expect(() => parseEntityRef("planet:1")).toThrow(InvalidArgumentError);
	});
	test("rejects non-numeric id", () => {
		expect(() => parseEntityRef("ship:abc")).toThrow(InvalidArgumentError);
	});
});

describe("parseEntityRefList", () => {
	test("parses comma-separated list", () => {
		expect(parseEntityRefList("ship:1,container:2")).toEqual([
			{ entityType: "ship", entityId: 1n },
			{ entityType: "container", entityId: 2n },
		]);
	});
	test("rejects empty entries", () => {
		expect(() => parseEntityRefList("ship:1,,container:2")).toThrow(InvalidArgumentError);
	});
	test("rejects empty list", () => {
		expect(() => parseEntityRefList("")).toThrow(InvalidArgumentError);
	});
});

describe("parseCargoInput", () => {
	test("parses item-id:stack-id:qty", () => {
		expect(parseCargoInput("201:251479207179:12")).toEqual({
			itemId: 201,
			stackId: 251479207179n,
			quantity: 12,
		});
	});
	test("accepts stack-id 0", () => {
		expect(parseCargoInput("5:0:100")).toEqual({
			itemId: 5,
			stackId: 0n,
			quantity: 100,
		});
	});
	test("rejects two-field form (was old --input shorthand)", () => {
		expect(() => parseCargoInput("5:100")).toThrow(/<item-id>:<stack-id>:<qty>/);
	});
	test("rejects single-component input", () => {
		expect(() => parseCargoInput("5")).toThrow(/<item-id>:<stack-id>:<qty>/);
	});
	test("rejects four-component input", () => {
		expect(() => parseCargoInput("5:0:100:99")).toThrow(/<item-id>:<stack-id>:<qty>/);
	});
	test("rejects negative qty", () => {
		expect(() => parseCargoInput("201:0:-5")).toThrow(/positive integer/);
	});
	test("rejects qty zero", () => {
		expect(() => parseCargoInput("201:0:0")).toThrow(/positive integer/);
	});
	test("rejects negative item-id", () => {
		expect(() => parseCargoInput("-1:0:5")).toThrow(/non-negative/);
	});
});

describe("parseInt64", () => {
	test("accepts negatives", () => {
		expect(parseInt64("-1000")).toBe(-1000n);
	});
	test("rejects decimals", () => {
		expect(() => parseInt64("1.5")).toThrow(InvalidArgumentError);
	});
	test("rejects non-numeric", () => {
		expect(() => parseInt64("abc")).toThrow(InvalidArgumentError);
	});
});

describe("parseUint32", () => {
	test("accepts valid uint32", () => {
		expect(parseUint32("0")).toBe(0);
		expect(parseUint32("42")).toBe(42);
		expect(parseUint32("4294967295")).toBe(4294967295);
	});
	test("rejects negative", () => {
		expect(() => parseUint32("-1")).toThrow(InvalidArgumentError);
	});
	test("rejects overflow", () => {
		expect(() => parseUint32("4294967296")).toThrow(InvalidArgumentError);
	});
	test("rejects decimal", () => {
		expect(() => parseUint32("1.5")).toThrow(InvalidArgumentError);
	});
});

describe("parseUint64", () => {
	test("accepts valid uint64", () => {
		expect(parseUint64("0")).toBe(0n);
		expect(parseUint64("18446744073709551615")).toBe(18446744073709551615n);
	});
	test("rejects negative", () => {
		expect(() => parseUint64("-1")).toThrow(InvalidArgumentError);
	});
	test("rejects decimal", () => {
		expect(() => parseUint64("1.5")).toThrow(InvalidArgumentError);
	});
});

describe("parseUint16", () => {
	test("accepts 0", () => {
		expect(parseUint16("0")).toBe(0);
	});
	test("accepts 65535", () => {
		expect(parseUint16("65535")).toBe(65535);
	});
	test("rejects 65536", () => {
		expect(() => parseUint16("65536")).toThrow(InvalidArgumentError);
	});
	test("rejects negative", () => {
		expect(() => parseUint16("-1")).toThrow(InvalidArgumentError);
	});
	test("rejects non-integer", () => {
		expect(() => parseUint16("1.5")).toThrow(InvalidArgumentError);
	});
});
