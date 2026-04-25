import { describe, expect, test } from "bun:test";
import { platformAsset } from "../../src/lib/update-platform";

describe("platformAsset", () => {
	test("darwin arm64 → mac-arm64 zip with entry", () => {
		const a = platformAsset("darwin", "arm64");
		expect(a.name).toBe("shiploadcli-mac-arm64.zip");
		expect(a.entryInZip).toBe("dist/shiploadcli-mac-arm64");
	});

	test("darwin x64 → mac-x64 zip with entry", () => {
		const a = platformAsset("darwin", "x64");
		expect(a.name).toBe("shiploadcli-mac-x64.zip");
		expect(a.entryInZip).toBe("dist/shiploadcli-mac-x64");
	});

	test("linux arm64 → raw binary, no zip entry", () => {
		const a = platformAsset("linux", "arm64");
		expect(a.name).toBe("shiploadcli-linux-arm64");
		expect(a.entryInZip).toBeNull();
	});

	test("linux x64 → raw binary, no zip entry", () => {
		const a = platformAsset("linux", "x64");
		expect(a.name).toBe("shiploadcli-linux-x64");
		expect(a.entryInZip).toBeNull();
	});

	test("win32 x64 → windows exe, no zip entry", () => {
		const a = platformAsset("win32", "x64");
		expect(a.name).toBe("shiploadcli-windows-x64.exe");
		expect(a.entryInZip).toBeNull();
	});

	test("unsupported platform throws", () => {
		expect(() => platformAsset("freebsd", "x64")).toThrow("No update asset for freebsd/x64");
	});

	test("unsupported arch throws", () => {
		expect(() => platformAsset("linux", "ia32")).toThrow("No update asset for linux/ia32");
	});
});
