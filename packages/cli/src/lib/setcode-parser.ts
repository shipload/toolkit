export interface SetcodePayload {
	account: bigint;
	vmtype: number;
	vmversion: number;
	code: Uint8Array;
}

export function parseSetcodeHexData(hexData: string): SetcodePayload {
	const raw = Buffer.from(hexData, "hex");
	if (raw.length < 11) {
		throw new Error(`setcode hex_data too short: ${raw.length} bytes`);
	}
	const account = raw.readBigUInt64LE(0);
	const vmtype = raw[8];
	const vmversion = raw[9];
	let pos = 10;
	let value = 0;
	let shift = 0;
	while (true) {
		if (pos >= raw.length) throw new Error("setcode hex_data: truncated varuint");
		const byte = raw[pos++];
		value |= (byte & 0x7f) << shift;
		if ((byte & 0x80) === 0) break;
		shift += 7;
		if (shift > 28) throw new Error("setcode hex_data: varuint overflow");
	}
	const codeLen = value;
	if (pos + codeLen > raw.length) {
		throw new Error(
			`setcode hex_data: declared code length ${codeLen} exceeds remaining ${raw.length - pos} bytes`,
		);
	}
	return {
		account,
		vmtype,
		vmversion,
		code: raw.subarray(pos, pos + codeLen),
	};
}
