import { describe, expect, mock, test } from "bun:test";
import { EXIT, extractChainError, printError, resolvePreflightError } from "../../src/lib/errors";
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

	test("falls through past a generic 'Assertion failed' top frame to a useful detail", () => {
		const err = {
			response: {
				json: {
					error: {
						code: 3050003,
						name: "eosio_assert_message_exception",
						what: "eosio_assert_message assertion failure",
						details: [
							{ message: "Assertion failed" },
							{
								message:
									"assertion failure with message: unload cargo insufficient on entity",
								file: "resolve.cpp",
								line_number: 297,
							},
						],
					},
				},
			},
		};
		expect(extractChainError(err)).toBe("unload cargo insufficient on entity");
	});

	test("falls back to error.what when every detail is generic", () => {
		const err = {
			response: {
				json: {
					error: {
						what: "eosio_assert_message assertion failure",
						details: [{ message: "Assertion failed" }, { message: "" }],
					},
				},
			},
		};
		expect(extractChainError(err)).toBe("eosio_assert_message assertion failure");
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

describe("resolvePreflightError", () => {
	test("no error → null", () => {
		expect(resolvePreflightError(undefined, false)).toBeNull();
	});

	test("ValidationError without force → abort with the error", () => {
		const err = new ValidationError("Cargo capacity would be exceeded: 9 > 7");
		const outcome = resolvePreflightError(err, false);
		expect(outcome.kind).toBe("abort");
		expect(outcome).toMatchObject({ kind: "abort", error: err });
	});

	test("ValidationError with force → warn and proceed", () => {
		const err = new ValidationError("Cargo capacity would be exceeded: 9 > 7");
		const outcome = resolvePreflightError(err, true);
		expect(outcome.kind).toBe("warn");
		if (outcome.kind === "warn") {
			expect(outcome.message).toContain("Cargo capacity would be exceeded");
			expect(outcome.message).toContain("--force");
		}
	});

	test("non-ValidationError → rethrows", () => {
		const boom = new Error("network down");
		expect(() => resolvePreflightError(boom, true)).toThrow("network down");
		expect(() => resolvePreflightError(boom, false)).toThrow("network down");
	});
});
