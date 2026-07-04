import { expect, test } from "bun:test";
import type { ServerTypes } from "@shipload/sdk";
import { entityInfoToSnapshot } from "./snapshot";

const u = (value: number | string) => ({ toString: () => String(value) });

function entityInfoWith(overrides: Record<string, unknown>): ServerTypes.entity_info {
	return {
		type: u("ship"),
		id: u(1),
		owner: u("alice"),
		entity_name: "Forge",
		coordinates: { x: u(0), y: u(0) },
		cargomass: u(0),
		cargo: [],
		gatherer_lanes: [],
		crafter_lanes: [],
		loader_lanes: [],
		modules: [],
		...overrides,
	} as unknown as ServerTypes.entity_info;
}

test("crafter speed rollup clamps to uint16 max", () => {
	const snap = entityInfoToSnapshot(
		entityInfoWith({
			crafter_lanes: [
				{ speed: u(40000), drain: u(1) },
				{ speed: u(40000), drain: u(1) },
			],
		}),
	);
	expect(snap.crafter?.speed).toBe(65535n);
});

test("gatherer yield rollup clamps to uint16 max", () => {
	const snap = entityInfoToSnapshot(
		entityInfoWith({
			gatherer_lanes: [
				{ yield: u(40000), drain: u(1), depth: u(5) },
				{ yield: u(40000), drain: u(1), depth: u(7) },
			],
		}),
	);
	expect(snap.gatherer?.yield).toBe(65535n);
});

test("loader thrust rollup clamps to uint16 max", () => {
	const snap = entityInfoToSnapshot(
		entityInfoWith({
			loader_lanes: [
				{ mass: u(2000), thrust: u(40000) },
				{ mass: u(2000), thrust: u(40000) },
			],
		}),
	);
	expect(snap.loaders?.thrust).toBe(65535n);
});

test("cargo mapping carries entity_id from an individuated cargo_view", () => {
	const snap = entityInfoToSnapshot(
		entityInfoWith({
			cargo: [
				{
					item_id: u(10201),
					quantity: u(1),
					stats: u(196849),
					modules: [],
					id: u(5),
					entity_id: u(42),
				},
			],
		}),
	);
	expect(snap.cargo[0].entity_id).toBe(42n);
});

test("cargo mapping yields undefined entity_id for a bare cargo row", () => {
	const snap = entityInfoToSnapshot(
		entityInfoWith({
			cargo: [
				{
					item_id: u(10201),
					quantity: u(1),
					stats: u(196849),
					modules: [],
					id: u(5),
				},
			],
		}),
	);
	expect(snap.cargo[0].entity_id).toBeUndefined();
});
