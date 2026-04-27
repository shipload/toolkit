import { describe, expect, mock, test } from "bun:test";
import { EXIT } from "../../src/lib/errors";
import { runTransact } from "../../src/lib/session";

describe("session lazy initialization", () => {
	test("exports getter functions, not pre-initialized values", async () => {
		const mod = await import("../../src/lib/session");
		expect(typeof mod.getSession).toBe("function");
		expect(typeof mod.getAccountName).toBe("function");
		expect(typeof mod.getPublicKey).toBe("function");
	});
});

describe("runTransact error path", () => {
	test("prints chain message and sets exitCode=CHAIN_ERROR", async () => {
		const fakeSession = {
			transact: async () => {
				throw {
					response: {
						json: {
							error: {
								details: [{ message: "assertion failure with message: boom" }],
							},
						},
					},
				};
			},
		};
		const errSpy = mock((..._args: unknown[]) => {});
		const origErr = console.error;
		console.error = errSpy;

		// @ts-expect-error minimal session shape for test
		await runTransact(fakeSession, { action: {} }, { description: "test" });

		console.error = origErr;
		expect(process.exitCode).toBe(EXIT.CHAIN_ERROR);
		const joined = errSpy.mock.calls.map((c) => String(c[0])).join("\n");
		expect(joined).toContain("boom");
		process.exitCode = 0;
	});
});
