import { expect, test } from "bun:test";
import { InvalidArgumentError } from "commander";
import { parseCoords } from "../../../src/commands/query/location";

test("parseCoords handles negatives", () => {
	expect(parseCoords("-50", "100")).toEqual({ x: -50n, y: 100n });
});

test("parseCoords rejects non-integer", () => {
	expect(() => parseCoords("1.5", "100")).toThrow(InvalidArgumentError);
});
