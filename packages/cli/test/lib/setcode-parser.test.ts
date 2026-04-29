import { describe, expect, test } from "bun:test";
import { parseSetcodeHexData } from "../../src/lib/setcode-parser";

function buildHex({
	account = 0x1234n,
	vmtype = 0,
	vmversion = 0,
	code = Buffer.from("0061736d01000000", "hex"),
}: {
	account?: bigint;
	vmtype?: number;
	vmversion?: number;
	code?: Buffer;
} = {}): string {
	const parts: number[] = [];
	for (let i = 0; i < 8; i++) {
		parts.push(Number((account >> BigInt(i * 8)) & 0xffn));
	}
	parts.push(vmtype);
	parts.push(vmversion);
	let len = code.length;
	do {
		let byte = len & 0x7f;
		len >>>= 7;
		if (len !== 0) byte |= 0x80;
		parts.push(byte);
	} while (len !== 0);
	return Buffer.concat([Buffer.from(parts), code]).toString("hex");
}

describe("parseSetcodeHexData", () => {
	test("extracts a tiny WASM payload", () => {
		const code = Buffer.from("0061736d01000000", "hex");
		const hex = buildHex({ account: 0xabcdn, vmtype: 0, vmversion: 0, code });
		const out = parseSetcodeHexData(hex);
		expect(out.account).toBe(0xabcdn);
		expect(out.vmtype).toBe(0);
		expect(out.vmversion).toBe(0);
		expect(Buffer.from(out.code).equals(code)).toBe(true);
	});

	test("handles a large code blob with multi-byte varuint length", () => {
		const code = Buffer.alloc(200, 0);
		const hex = buildHex({ code });
		const out = parseSetcodeHexData(hex);
		expect(out.code.length).toBe(200);
	});

	test("handles a 16384-byte payload (3-byte varuint)", () => {
		const code = Buffer.alloc(16384, 0xaa);
		const hex = buildHex({ code });
		const out = parseSetcodeHexData(hex);
		expect(out.code.length).toBe(16384);
		expect(out.code[0]).toBe(0xaa);
		expect(out.code[16383]).toBe(0xaa);
	});
});
