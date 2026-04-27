import { describe, expect, test } from "bun:test";
import { type Hotkey, HotkeyRegistry } from "../../src/tui/hotkeys";

describe("HotkeyRegistry", () => {
	test("dispatches by key name when the binding is enabled", () => {
		const calls: string[] = [];
		const reg = new HotkeyRegistry([
			{ key: "r", label: "resolve", action: () => calls.push("r"), enabled: () => true },
		]);
		expect(reg.dispatch("r")).toBe(true);
		expect(calls).toEqual(["r"]);
	});

	test("does not dispatch when the binding is disabled", () => {
		const calls: string[] = [];
		const reg = new HotkeyRegistry([
			{ key: "r", label: "resolve", action: () => calls.push("r"), enabled: () => false },
		]);
		expect(reg.dispatch("r")).toBe(false);
		expect(calls).toEqual([]);
	});

	test("returns false for unbound keys", () => {
		const reg = new HotkeyRegistry([]);
		expect(reg.dispatch("z")).toBe(false);
	});

	test("hints reflect enabled state", () => {
		const reg = new HotkeyRegistry<Hotkey>([
			{ key: "r", label: "resolve", action: () => {}, enabled: () => false },
			{ key: "q", label: "quit", action: () => {}, enabled: () => true },
		]);
		expect(reg.hints()).toEqual([
			{ key: "r", label: "resolve", enabled: false },
			{ key: "q", label: "quit", enabled: true },
		]);
	});
});
