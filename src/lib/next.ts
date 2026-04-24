export interface GameState {
	player: { company: string; in_game: boolean } | null;
	entities: Array<{
		type: string;
		id: number;
		status: "idle" | "active" | "busy";
		cargoCount?: number;
		completedTasks: number;
	}>;
}

export interface NextResult {
	reason: string;
	command: string;
}

type Rule = (s: GameState) => NextResult | null;

const RULES: Rule[] = [
	(s) =>
		!s.player
			? {
					reason: "No company registered yet.",
					command: 'shiploadcli foundcompany "<name>"',
				}
			: null,
	(s) =>
		s.player && !s.player.in_game
			? { reason: "Company registered, not joined.", command: "shiploadcli join" }
			: null,
	(s) =>
		s.player?.in_game && s.entities.length === 0
			? {
					reason: "Joined but no ship yet (testnet only).",
					command: "shiploadcli claimstarter",
				}
			: null,
	(s) => {
		const busy = s.entities.find((e) => e.status === "active");
		if (busy) {
			return {
				reason: `${busy.type} ${busy.id} has an active task.`,
				command: `shiploadcli wait ${busy.type} ${busy.id}`,
			};
		}
		return null;
	},
	(s) => {
		const stuck = s.entities.find((e) => e.completedTasks > 0);
		if (stuck) {
			return {
				reason: `${stuck.type} ${stuck.id} has completed tasks to resolve.`,
				command: `shiploadcli resolve ${stuck.type} ${stuck.id}`,
			};
		}
		return null;
	},
	(s) => {
		const ship = s.entities.find(
			(e) => e.type === "ship" && (e.cargoCount ?? 0) === 0 && e.status === "idle",
		);
		if (ship) {
			return {
				reason: "Ship is idle and empty; consider finding resources.",
				command: `shiploadcli tools find <resource-id> --entity ship:${ship.id} --max-results 5`,
			};
		}
		return null;
	},
];

export function nextAction(state: GameState): NextResult {
	for (const r of RULES) {
		const hit = r(state);
		if (hit) return hit;
	}
	return {
		reason: "No obvious next step; inspect your entities.",
		command: "shiploadcli entities",
	};
}
