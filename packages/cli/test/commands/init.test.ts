import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInit } from "../../src/commands/init";

describe("runInit", () => {
	test("writes stub config.ini to target dir when none exists", () => {
		const dir = mkdtempSync(join(tmpdir(), "player-init-"));
		try {
			const target = join(dir, "config.ini");
			const result = runInit({ targetPath: target, force: false });
			expect(result.written).toBe(true);
			expect(result.path).toBe(target);
			expect(existsSync(target)).toBe(true);
			const body = readFileSync(target, "utf8");
			expect(body).toContain("[default]");
			expect(body).toContain("private_key");
			expect(body).toContain("actor");
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	test("refuses to overwrite without --force", () => {
		const dir = mkdtempSync(join(tmpdir(), "player-init-"));
		try {
			const target = join(dir, "config.ini");
			writeFileSync(target, "existing");
			expect(() => runInit({ targetPath: target, force: false })).toThrow(/already exists/);
			expect(readFileSync(target, "utf8")).toBe("existing");
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	test("overwrites with --force", () => {
		const dir = mkdtempSync(join(tmpdir(), "player-init-"));
		try {
			const target = join(dir, "config.ini");
			writeFileSync(target, "existing");
			const result = runInit({ targetPath: target, force: true });
			expect(result.written).toBe(true);
			expect(readFileSync(target, "utf8")).toContain("[default]");
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	test("forces mode 0600 on --force even if target was world-readable", () => {
		const dir = mkdtempSync(join(tmpdir(), "player-init-"));
		try {
			const target = join(dir, "config.ini");
			writeFileSync(target, "existing", { mode: 0o644 });
			runInit({ targetPath: target, force: true });
			const mode = statSync(target).mode & 0o777;
			expect(mode).toBe(0o600);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	test("creates missing parent directories", () => {
		const dir = mkdtempSync(join(tmpdir(), "player-init-"));
		try {
			const target = join(dir, "nested", "sub", "config.ini");
			const result = runInit({ targetPath: target, force: false });
			expect(result.written).toBe(true);
			expect(existsSync(target)).toBe(true);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	test("stub string matches config.ini.example on disk", () => {
		const example = readFileSync(
			join(import.meta.dir, "..", "..", "config.ini.example"),
			"utf8",
		);
		const dir = mkdtempSync(join(tmpdir(), "player-init-"));
		try {
			const target = join(dir, "config.ini");
			runInit({ targetPath: target, force: false });
			const written = readFileSync(target, "utf8");
			expect(written).toBe(example);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
