import { describe, expect, test } from "bun:test";
import {
	grepDisassembly,
	listImports,
	parseImports,
} from "../../src/lib/wasm-tools";

const SAMPLE_IMPORTS_OUTPUT = `
shipload.gm.wasm:	file format wasm 0x1

Section Details:

Import[42]:
 - func[0] sig=0 <env.db_store_i64> <- env.db_store_i64
 - func[1] sig=1 <env.db_update_i64> <- env.db_update_i64
 - func[2] sig=2 <env.db_remove_i64> <- env.db_remove_i64
 - memory[0] pages: initial=1 <- env.memory
`;

describe("parseImports", () => {
	test("extracts function imports as module.name pairs", () => {
		const imports = parseImports(SAMPLE_IMPORTS_OUTPUT);
		expect(imports).toContain("env.db_store_i64");
		expect(imports).toContain("env.db_update_i64");
		expect(imports).toContain("env.db_remove_i64");
	});

	test("does not include memory imports as functions", () => {
		const imports = parseImports(SAMPLE_IMPORTS_OUTPUT);
		expect(imports).not.toContain("env.memory");
	});
});

describe("listImports", () => {
	test("invokes wasm-objdump with -j Import -x and parses output", async () => {
		const calls: { command: string; args: string[] }[] = [];
		const out = await listImports("/tmp/x.wasm", {
			run: async (command, args) => {
				calls.push({ command, args });
				return SAMPLE_IMPORTS_OUTPUT;
			},
		});
		expect(calls).toHaveLength(1);
		expect(calls[0].command).toBe("wasm-objdump");
		expect(calls[0].args).toEqual(["-j", "Import", "-x", "/tmp/x.wasm"]);
		expect(out).toContain("env.db_store_i64");
	});

	test("propagates an actionable error when wasm-objdump is not installed", async () => {
		await expect(
			listImports("/tmp/x.wasm", {
				run: async () => {
					const e = new Error("ENOENT") as Error & { code?: string };
					e.code = "ENOENT";
					throw e;
				},
			}),
		).rejects.toThrow(/wasm-objdump.*wabt/);
	});
});

describe("grepDisassembly", () => {
	const DISASM = `
func[42]:
  i32.const 1000000
  local.get 1
  i32.mul
  i64.extend_i32_u
  return

func[43]:
  i32.const 5
  i32.const 7
  i32.add
  return
`;

	test("finds offsets where all fragments occur in order within ±1 instruction", async () => {
		const matches = await grepDisassembly(
			"/tmp/x.wasm",
			["i32.const 1000000", "i32.mul", "i64.extend_i32_u"],
			{ run: async () => DISASM },
		);
		expect(matches).toHaveLength(1);
		expect(matches[0]).toContain("i32.const 1000000");
	});

	test("returns empty when not all fragments match", async () => {
		const matches = await grepDisassembly(
			"/tmp/x.wasm",
			["i32.const 1000000", "i64.extend_i32_s"],
			{ run: async () => DISASM },
		);
		expect(matches).toEqual([]);
	});
});
