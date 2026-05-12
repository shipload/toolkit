import { ServerTypes, TaskType } from "@shipload/sdk";
import type { EntitySnapshot } from "./snapshot";

export interface ProjectedCargoStack {
	item_id: bigint;
	stats: bigint;
	quantity: bigint;
	modules: unknown[];
	id: bigint;
}

interface ModuleEntryLike {
	type: { toString(): string };
	installed?: { item_id: { toString(): string }; stats: { toString(): string } };
}

function moduleSignature(modules: readonly unknown[]): string {
	const parts: string[] = [];
	for (const m of modules) {
		const me = m as ModuleEntryLike;
		const t = me.type.toString();
		if (me.installed) {
			parts.push(`${t}:${me.installed.item_id.toString()}:${me.installed.stats.toString()}`);
		} else {
			parts.push(`${t}:`);
		}
	}
	return parts.join("|");
}

function modulesEqual(a: readonly unknown[], b: readonly unknown[]): boolean {
	if (a.length !== b.length) return false;
	return moduleSignature(a) === moduleSignature(b);
}

function sameKind(
	stack: ProjectedCargoStack,
	itemId: bigint,
	stats: bigint,
	modules: readonly unknown[],
): boolean {
	if (stack.item_id !== itemId) return false;
	if (stack.stats !== stats) return false;
	return modulesEqual(stack.modules, modules);
}

export type StackDeltaKind = "add" | "remove" | "new";

export interface StackDelta {
	kind: StackDeltaKind;
	quantity: bigint;
}

export type StackKey = string;

export function stackKey(itemId: bigint, stats: bigint, modules: readonly unknown[]): StackKey {
	return `${itemId.toString()}#${stats.toString()}#${moduleSignature(modules)}`;
}

export function diffStacks(
	current: readonly ProjectedCargoStack[],
	projected: readonly ProjectedCargoStack[],
): Map<StackKey, StackDelta> {
	const out = new Map<StackKey, StackDelta>();
	const seen = new Set<StackKey>();
	for (const p of projected) {
		const key = stackKey(p.item_id, p.stats, p.modules);
		seen.add(key);
		const match = current.find((c) => sameKind(c, p.item_id, p.stats, p.modules));
		if (!match) {
			out.set(key, { kind: "new", quantity: p.quantity });
			continue;
		}
		if (p.quantity > match.quantity) {
			out.set(key, { kind: "add", quantity: p.quantity - match.quantity });
		} else if (p.quantity < match.quantity) {
			out.set(key, { kind: "remove", quantity: match.quantity - p.quantity });
		}
	}
	for (const c of current) {
		const key = stackKey(c.item_id, c.stats, c.modules);
		if (seen.has(key)) continue;
		out.set(key, { kind: "remove", quantity: c.quantity });
	}
	return out;
}

function toBigInts(item: ServerTypes.cargo_item): {
	item_id: bigint;
	stats: bigint;
	quantity: bigint;
	modules: unknown[];
} {
	return {
		item_id: BigInt(item.item_id.toString()),
		stats: BigInt(item.stats.toString()),
		quantity: BigInt(item.quantity.toString()),
		modules: (item.modules ?? []) as unknown[],
	};
}

function addCargo(stacks: ProjectedCargoStack[], item: ServerTypes.cargo_item): void {
	const incoming = toBigInts(item);
	const idx = stacks.findIndex((s) =>
		sameKind(s, incoming.item_id, incoming.stats, incoming.modules),
	);
	if (idx === -1) {
		stacks.push({ ...incoming, id: 0n });
	} else {
		stacks[idx].quantity += incoming.quantity;
	}
}

function removeCargo(stacks: ProjectedCargoStack[], item: ServerTypes.cargo_item): void {
	const incoming = toBigInts(item);
	const idx = stacks.findIndex((s) =>
		sameKind(s, incoming.item_id, incoming.stats, incoming.modules),
	);
	if (idx === -1) return;
	stacks[idx].quantity -= incoming.quantity;
	if (stacks[idx].quantity <= 0n) stacks.splice(idx, 1);
}

function applyTaskToCargo(stacks: ProjectedCargoStack[], task: ServerTypes.task): void {
	const type = Number(task.type.toString());
	const items = task.cargo ?? [];
	switch (type) {
		case TaskType.LOAD:
		case TaskType.UNWRAP:
			for (const item of items) addCargo(stacks, item);
			return;
		case TaskType.UNLOAD:
		case TaskType.WRAP:
			for (const item of items) removeCargo(stacks, item);
			return;
		case TaskType.GATHER:
			if (!task.entitytarget) {
				for (const item of items) addCargo(stacks, item);
			}
			return;
		case TaskType.CRAFT:
			if (items.length > 0) {
				for (let i = 0; i < items.length - 1; i++) removeCargo(stacks, items[i]);
				addCargo(stacks, items[items.length - 1]);
			}
			return;
		case TaskType.DEPLOY:
			if (items.length > 0) removeCargo(stacks, items[0]);
			return;
		case TaskType.UNDEPLOY:
			for (const item of items) addCargo(stacks, item);
			return;
		default:
			return;
	}
}

export function snapshotToStacks(snap: EntitySnapshot): ProjectedCargoStack[] {
	return snap.cargo.map((c) => ({
		item_id: c.item_id,
		stats: c.stats ?? 0n,
		quantity: c.quantity,
		modules: (c.modules ?? []) as unknown[],
		id: c.id ?? 0n,
	}));
}

export function projectCargoFromSnapshot(snap: EntitySnapshot): ProjectedCargoStack[] {
	const stacks = snapshotToStacks(snap);

	if (snap.current_task) applyTaskToCargo(stacks, snap.current_task);
	if (snap.pending_tasks) {
		for (const task of snap.pending_tasks) applyTaskToCargo(stacks, task);
	}
	return stacks;
}
