import { RefitOp, ServerTypes, TaskType, schedule } from "@shipload/sdk";
import { toBigIntOrUndefined } from "./cargo-build";
import type { EntitySnapshot } from "./snapshot";

export interface ProjectedCargoStack {
	item_id: bigint;
	stats: bigint;
	quantity: bigint;
	modules: unknown[];
	id: bigint;
	entity_id?: bigint;
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
	entity_id?: bigint;
} {
	return {
		item_id: BigInt(item.item_id.toString()),
		stats: BigInt(item.stats.toString()),
		quantity: BigInt(item.quantity.toString()),
		modules: (item.modules ?? []) as unknown[],
		entity_id: toBigIntOrUndefined(item.entity_id),
	};
}

function isIndividuated(entity_id: bigint | undefined): boolean {
	return entity_id != null && entity_id !== 0n;
}

function addCargo(stacks: ProjectedCargoStack[], item: ServerTypes.cargo_item): void {
	const incoming = toBigInts(item);
	if (isIndividuated(incoming.entity_id)) {
		stacks.push({ ...incoming, id: 0n });
		return;
	}
	const idx = stacks.findIndex(
		(s) =>
			sameKind(s, incoming.item_id, incoming.stats, incoming.modules) &&
			!isIndividuated(s.entity_id),
	);
	if (idx === -1) {
		stacks.push({ ...incoming, id: 0n });
	} else {
		stacks[idx].quantity += incoming.quantity;
	}
}

function removeCargo(stacks: ProjectedCargoStack[], item: ServerTypes.cargo_item): void {
	const incoming = toBigInts(item);
	const individuated = isIndividuated(incoming.entity_id);
	const idx = stacks.findIndex((s) => {
		if (!sameKind(s, incoming.item_id, incoming.stats, incoming.modules)) return false;
		return individuated ? s.entity_id === incoming.entity_id : !isIndividuated(s.entity_id);
	});
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
			for (const item of items) removeCargo(stacks, item);
			return;
		case TaskType.GATHER:
			if (task.couplings.length === 0) {
				for (const item of items) addCargo(stacks, item);
			}
			return;
		case TaskType.CRAFT:
			if (items.length > 0) {
				for (let i = 0; i < items.length - 1; i++) removeCargo(stacks, items[i]);
				if (task.couplings.length === 0) addCargo(stacks, items[items.length - 1]);
			}
			return;
		case TaskType.UNDEPLOY:
			for (const item of items) addCargo(stacks, item);
			return;
		case TaskType.REFIT:
			if (task.refit && Number(task.refit.op) === RefitOp.ADD) {
				for (const item of items) removeCargo(stacks, item);
			}
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
		entity_id: c.entity_id,
	}));
}

export function projectCargoFromSnapshot(
	snap: EntitySnapshot,
	now: Date = new Date(),
): ProjectedCargoStack[] {
	const stacks = snapshotToStacks(snap);
	// Apply every not-yet-complete task across all lanes, in canonical completion order.
	for (const ot of schedule.orderedTasks(snap)) {
		if (schedule.laneTaskCompleteOf(snap, ot.laneKey, ot.taskIndex, now)) continue;
		applyTaskToCargo(stacks, ot.task);
	}
	return stacks;
}
