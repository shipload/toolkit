import type { ServerTypes } from "@shipload/sdk";
import { formatItem, formatStats } from "./format";
import { ValidationError } from "./validate";

export interface ParsedCargoInput {
	itemId: number;
	stackId: bigint;
	quantity: number;
}

export interface ResolvedCargoInput {
	itemId: number;
	stackId: bigint;
	quantity: number;
}

function stackRow(itemId: number, s:ServerTypes.cargo_item): string {
	const stackId = BigInt(s.stats.toString());
	const qty = Number(s.quantity.toString());
	const decoded = formatStats(stackId, itemId);
	const decodedSuffix = decoded ? `, ${decoded}` : "";
	return `  ${itemId}:${stackId}:<qty ≤ ${qty}>   (${qty}× ${formatItem(itemId)}${decodedSuffix})`;
}

function noMatchingItemMessage(p: ParsedCargoInput, cargo:ServerTypes.cargo_item[]): string {
	const availableIds = Array.from(new Set(cargo.map((c) => Number(c.item_id))));
	const itemsSuffix = availableIds.length
		? ` — cargo has items: ${availableIds.join(", ")}`
		: " — cargo is empty";
	return `no cargo stack matches item ${p.itemId} (${formatItem(p.itemId)})${itemsSuffix}`;
}

function noMatchingStackMessage(p: ParsedCargoInput, matches:ServerTypes.cargo_item[]): string {
	const header = `no cargo stack matches item ${p.itemId} (${formatItem(p.itemId)}) with stack ${p.stackId} — available stacks for item ${p.itemId}:`;
	const rows = matches.map((s) => stackRow(p.itemId, s));
	return [header, ...rows].join("\n");
}

export function resolveCargoInputs(
	parsed: ParsedCargoInput[],
	cargo:ServerTypes.cargo_item[],
): ResolvedCargoInput[] {
	const seen = new Set<string>();
	for (const p of parsed) {
		const key = `${p.itemId}:${p.stackId}`;
		if (seen.has(key)) {
			throw new ValidationError(
				`cargo input ${p.itemId}:${p.stackId} listed twice — combine the qty into a single input`,
			);
		}
		seen.add(key);
	}

	const requestedByKey = new Map<string, number>();
	for (const p of parsed) {
		const key = `${p.itemId}:${p.stackId}`;
		requestedByKey.set(key, (requestedByKey.get(key) ?? 0) + p.quantity);
	}

	const resolved: ResolvedCargoInput[] = [];
	for (const p of parsed) {
		const matches = cargo.filter((c) => Number(c.item_id) === p.itemId);
		if (matches.length === 0) {
			throw new ValidationError(noMatchingItemMessage(p, cargo));
		}
		const stack = matches.find((s) => BigInt(s.stats.toString()) === p.stackId);
		if (!stack) {
			throw new ValidationError(noMatchingStackMessage(p, matches));
		}
		const stackQty = Number(stack.quantity.toString());
		const requested = requestedByKey.get(`${p.itemId}:${p.stackId}`) ?? 0;
		if (requested > stackQty) {
			const decoded = formatStats(p.stackId, p.itemId);
			const decodedSuffix = decoded ? ` (${decoded})` : "";
			throw new ValidationError(
				`cargo has ${stackQty}× ${formatItem(p.itemId)} in stack ${p.stackId}${decodedSuffix}, requested ${requested} — reduce qty or gather more`,
			);
		}
		resolved.push({ itemId: p.itemId, stackId: p.stackId, quantity: p.quantity });
	}
	return resolved;
}
