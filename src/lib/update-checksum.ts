import { createHash } from "node:crypto";

export function parseExpectedHash(sha256sums: string, assetName: string): string | null {
	for (const line of sha256sums.split("\n")) {
		const parts = line.trim().split(/\s+/);
		if (parts.length === 2 && parts[1] === assetName) return parts[0];
	}
	return null;
}

export function verifyChecksum(data: Uint8Array, sha256sums: string, assetName: string): boolean {
	const expected = parseExpectedHash(sha256sums, assetName);
	if (!expected) return false;
	const actual = createHash("sha256").update(data).digest("hex");
	return actual === expected;
}
