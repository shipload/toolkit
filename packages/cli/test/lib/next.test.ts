import { describe, expect, test } from "bun:test";
import { type GameState, nextAction } from "../../src/lib/next";

describe("nextAction", () => {
	test("no company → foundcompany", () => {
		const state: GameState = { player: null, entities: [] };
		const r = nextAction(state);
		expect(r.command).toMatch(/^shiploadcli foundcompany/);
	});

	test("in game, ship idle, empty cargo → tools find suggestion", () => {
		const state: GameState = {
			player: { company: "Test" },
			entities: [{ type: "ship", id: 1, status: "idle", cargoCount: 0, completedTasks: 0 }],
		};
		const r = nextAction(state);
		expect(r.command).toMatch(/tools find/);
	});

	test("active task → wait hint", () => {
		const state: GameState = {
			player: { company: "Test" },
			entities: [{ type: "ship", id: 1, status: "active", completedTasks: 0 }],
		};
		expect(nextAction(state).command).toBe("shiploadcli ship 1 wait");
	});

	test("completed tasks → resolve hint", () => {
		const state: GameState = {
			player: { company: "Test" },
			entities: [{ type: "ship", id: 1, status: "idle", completedTasks: 2 }],
		};
		expect(nextAction(state).command).toContain("shiploadcli ship 1 resolve");
	});

	test("company with no entities → inspect entities", () => {
		const state: GameState = {
			player: { company: "Test" },
			entities: [],
		};
		const r = nextAction(state);
		expect(r.command).not.toMatch(/^shiploadcli foundcompany/);
		expect(r.command).toBe("shiploadcli entities");
	});
});
