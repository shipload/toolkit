import { describe, expect, mock, test } from "bun:test";
import { EXIT, extractChainError, printError } from "../../src/lib/errors";
import { ValidationError } from "../../src/lib/validate";

describe("extractChainError", () => {
	test("unwraps a wharfkit session error with nested details", () => {
		const err = {
			response: {
				json: {
					error: {
						details: [
							{
								message:
									"assertion failure with message: no resources at this stratum",
							},
						],
					},
				},
			},
		};
		expect(extractChainError(err)).toBe("no resources at this stratum");
	});

	test("returns plain error message when not a session error", () => {
		expect(extractChainError(new Error("boom"))).toBe("boom");
	});

	test("returns stringified fallback for unknown shapes", () => {
		expect(extractChainError({})).toBe("unknown error");
	});
});

describe("EXIT codes", () => {
	test("exposes the four canonical codes", () => {
		expect(EXIT.SUCCESS).toBe(0);
		expect(EXIT.USER_ERROR).toBe(1);
		expect(EXIT.CHAIN_ERROR).toBe(2);
		expect(EXIT.UNEXPECTED).toBe(3);
	});
});

describe("printError", () => {
	test("returns USER_ERROR for ValidationError and prints suggestion", () => {
		const errSpy = mock((..._args: unknown[]) => {});
		const orig = console.error;
		console.error = errSpy;
		const code = printError(new ValidationError("cap exceeded", "--quantity 16"));
		console.error = orig;
		expect(code).toBe(EXIT.USER_ERROR);
		const joined = errSpy.mock.calls.map((c) => String(c[0])).join("\n");
		expect(joined).toContain("cap exceeded");
		expect(joined).toContain("--quantity 16");
	});
});
