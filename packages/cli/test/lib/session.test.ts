import { describe, expect, test } from "bun:test";
import { performTransact, signingHandoffLines } from "../../src/lib/session";

describe("session lazy initialization", () => {
	test("exports getter functions, not pre-initialized values", async () => {
		const mod = await import("../../src/lib/session");
		expect(typeof mod.getSession).toBe("function");
		expect(typeof mod.getAccountName).toBe("function");
		expect(typeof mod.getPublicKey).toBe("function");
	});
});

describe("performTransact", () => {
	test("propagates the raw chain error so callers can format it", async () => {
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

		// @ts-expect-error minimal session shape for test
		const call = performTransact(fakeSession, { action: {} }, { description: "test" });

		await expect(call).rejects.toMatchObject({
			response: { json: { error: { details: [{ message: expect.stringContaining("boom") }] } } },
		});
	});
});

describe("signingHandoffLines", () => {
	test("says the action takes effect once the link is signed", () => {
		const lines = signingHandoffLines("Founding company", "https://sign.example/x", ["nex.shipload::foundcompany {}"]);
		expect(lines[0]).toBe("Founding company");
		expect(lines.join("\n")).toContain("It takes effect once you sign it with your wallet:");
		expect(lines).toContain("https://sign.example/x");
		expect(lines.at(-1)).toBe("nex.shipload::foundcompany {}");
	});
});
