import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type WasmRunner = (command: string, args: string[]) => Promise<string>;

export interface WasmRunnerOptions {
	run?: WasmRunner;
}

const defaultRun: WasmRunner = async (command, args) => {
	const { stdout } = await execFileAsync(command, args, {
		maxBuffer: 50 * 1024 * 1024,
	});
	return stdout;
};

export function parseImports(output: string): string[] {
	const out: string[] = [];
	for (const line of output.split("\n")) {
		const m = line.match(/^\s*-\s+func\[\d+\].*<-\s+(\S+)\s*$/);
		if (m) out.push(m[1]);
	}
	return out;
}

function wrapEnoent(err: unknown): Error {
	const e = err as NodeJS.ErrnoException;
	if (e && e.code === "ENOENT") {
		return new Error(
			"wasm-objdump not found on PATH. Install the wabt toolkit (e.g. `brew install wabt`).",
		);
	}
	return err as Error;
}

export async function listImports(
	wasmPath: string,
	opts: WasmRunnerOptions = {},
): Promise<string[]> {
	const run = opts.run ?? defaultRun;
	let output: string;
	try {
		output = await run("wasm-objdump", ["-j", "Import", "-x", wasmPath]);
	} catch (err) {
		throw wrapEnoent(err);
	}
	return parseImports(output);
}

export async function disassemble(
	wasmPath: string,
	opts: WasmRunnerOptions = {},
): Promise<string> {
	const run = opts.run ?? defaultRun;
	try {
		return await run("wasm-objdump", ["-d", wasmPath]);
	} catch (err) {
		throw wrapEnoent(err);
	}
}

export async function grepDisassembly(
	wasmPath: string,
	fragments: string[],
	opts: WasmRunnerOptions = {},
): Promise<string[]> {
	if (fragments.length === 0) return [];
	const text = await disassemble(wasmPath, opts);
	const lines = text.split("\n");
	const results: string[] = [];
	for (let i = 0; i < lines.length; i++) {
		if (!lines[i].includes(fragments[0])) continue;
		let cursor = i;
		let ok = true;
		for (let f = 1; f < fragments.length; f++) {
			const want = fragments[f];
			let found = -1;
			for (let j = cursor + 1; j <= cursor + 2 && j < lines.length; j++) {
				if (lines[j].includes(want)) {
					found = j;
					break;
				}
			}
			if (found === -1) {
				ok = false;
				break;
			}
			cursor = found;
		}
		if (ok) {
			results.push(lines.slice(i, cursor + 1).join("\n"));
		}
	}
	return results;
}
