import { describe, expect, test } from "bun:test";
import { type GameState, nextAction } from "../../src/lib/next";

describe("nextAction", () => {
	test("no company → foundcompany", () => {
		const state: GameState = { player: null, entities: [] };
		const r = nextAction(state);
		expect(r.command).toMatch(/^shiploadcli foundcompany/);
	});

	test("company, not in game → join", () => {
		const state: GameState = { player: { company: "Test", in_game: false }, entities: [] };
		expect(nextAction(state).command).toBe("shiploadcli join");
	});

	test("in game, ship idle, empty cargo → tools find suggestion", () => {
		const state: GameState = {
			player: { company: "Test", in_game: true },
			entities: [{ type: "ship", id: 1, status: "idle", cargoCount: 0, completedTasks: 0 }],
		};
		const r = nextAction(state);
		expect(r.command).toMatch(/tools find/);
	});

	test("active task → wait hint", () => {
		const state: GameState = {
			player: { company: "Test", in_game: true },
			entities: [{ type: "ship", id: 1, status: "active", completedTasks: 0 }],
		};
		expect(nextAction(state).command).toBe("shiploadcli ship 1 wait");
	});

	test("completed tasks → resolve hint", () => {
		const state: GameState = {
			player: { company: "Test", in_game: true },
			entities: [{ type: "ship", id: 1, status: "idle", completedTasks: 2 }],
		};
		expect(nextAction(state).command).toContain("shiploadcli ship 1 resolve");
	});

	test("starter ship missing after join → flag a bug", () => {
		const state: GameState = {
			player: { company: "Test", in_game: true },
			entities: [],
		};
		const r = nextAction(state);
		// Should NOT be a foundcompany or join suggestion; should tell the user something's wrong
		expect(r.command).not.toMatch(/^shiploadcli foundcompany/);
		expect(r.command).not.toBe("shiploadcli join");
		expect(r.command).toBe("shiploadcli claimstarter");
	});
});
