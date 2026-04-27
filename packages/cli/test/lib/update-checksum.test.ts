import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { parseExpectedHash, verifyChecksum } from "../../src/lib/update-checksum";

function sha256hex(data: Uint8Array): string {
	return createHash("sha256").update(data).digest("hex");
}

const BINARY = new TextEncoder().encode("fake binary content");
const HASH = sha256hex(BINARY);

const SHA256SUMS = [
	`${HASH}  shiploadcli-linux-x64`,
	`aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  shiploadcli-mac-arm64.zip`,
].join("\n");

describe("parseExpectedHash", () => {
	test("finds hash for known asset name", () => {
		expect(parseExpectedHash(SHA256SUMS, "shiploadcli-linux-x64")).toBe(HASH);
	});

	test("returns null for unknown asset name", () => {
		expect(parseExpectedHash(SHA256SUMS, "shiploadcli-windows-x64.exe")).toBeNull();
	});

	test("handles trailing newline in SHA256SUMS", () => {
		const withTrailing = `${SHA256SUMS}\n`;
		expect(parseExpectedHash(withTrailing, "shiploadcli-linux-x64")).toBe(HASH);
	});
});

describe("verifyChecksum", () => {
	test("returns true when checksum matches", () => {
		expect(verifyChecksum(BINARY, SHA256SUMS, "shiploadcli-linux-x64")).toBe(true);
	});

	test("returns false when data is tampered", () => {
		const tampered = new TextEncoder().encode("different content");
		expect(verifyChecksum(tampered, SHA256SUMS, "shiploadcli-linux-x64")).toBe(false);
	});

	test("returns false when asset name not in SHA256SUMS", () => {
		expect(verifyChecksum(BINARY, SHA256SUMS, "shiploadcli-windows-x64.exe")).toBe(false);
	});

	test("returns false when expected hash is wrong", () => {
		expect(verifyChecksum(BINARY, SHA256SUMS, "shiploadcli-mac-arm64.zip")).toBe(false);
	});
});
