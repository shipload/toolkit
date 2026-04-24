import type { Types } from "../contracts/server";
import { formatItem, formatStats } from "./format";
import { ValidationError } from "./validate";

export interface ParsedCargoInput {
	itemId: number;
	quantity: number;
	stats: bigint | null;
}

export interface ResolvedCargoInput {
	itemId: number;
	quantity: number;
	stats: bigint;
}

function statsMismatchRow(itemId: number, quantity: number, s: Types.cargo_item): string {
	const statsUint = BigInt(s.stats.toString());
	const qty = Number(s.quantity.toString());
	const decoded = formatStats(statsUint, itemId);
	const decodedSuffix = decoded ? `, ${decoded}` : "";
	return `  --input ${itemId}:${quantity}:${statsUint}   (${qty}× ${formatItem(itemId)}${decodedSuffix})`;
}

function buildStatsMismatchMessage(p: ParsedCargoInput, matches: Types.cargo_item[]): string {
	const header = `no cargo stack matches item ${p.itemId} (${formatItem(p.itemId)}) with stats ${p.stats} — available stacks for item ${p.itemId}:`;
	const rows = matches.map((s) => statsMismatchRow(p.itemId, p.quantity, s));
	return [header, ...rows].join("\n");
}

function statsDeployRow(itemId: number, s: Types.cargo_item): string {
	const statsUint = BigInt(s.stats.toString());
	const decoded = formatStats(statsUint, itemId);
	const decodedSuffix = decoded ? `, ${decoded}` : "";
	return `  --stats ${statsUint}   (${formatItem(itemId)}${decodedSuffix})`;
}

function buildAmbiguityMessage(
	p: ParsedCargoInput,
	matches: Types.cargo_item[],
	mode: "input" | "stats",
): string {
	const header =
		mode === "input"
			? `${matches.length} cargo stacks match item ${p.itemId} (${formatItem(p.itemId)}). Specify one:`
			: `${matches.length} cargo stacks match item ${p.itemId} (${formatItem(p.itemId)}). Specify --stats <N>:`;
	const rows = matches.map((s) =>
		mode === "input" ? statsMismatchRow(p.itemId, p.quantity, s) : statsDeployRow(p.itemId, s),
	);
	return [header, ...rows].join("\n");
}

export function resolveCargoInputs(
	parsed: ParsedCargoInput[],
	cargo: Types.cargo_item[],
	mode: "input" | "stats" = "input",
): ResolvedCargoInput[] {
	const resolved: ResolvedCargoInput[] = [];
	const emitResolved = (p: ParsedCargoInput, stack: Types.cargo_item): void => {
		const stackQty = Number(stack.quantity.toString());
		const stackStats = BigInt(stack.stats.toString());
		if (p.quantity > stackQty) {
			const decoded = formatStats(stackStats, p.itemId);
			const decodedSuffix = decoded ? `, ${decoded}` : "";
			throw new ValidationError(
				`cargo has ${stackQty}× ${formatItem(p.itemId)} (stats ${stackStats}${decodedSuffix}), requested ${p.quantity} — reduce quantity or gather more`,
			);
		}
		resolved.push({ itemId: p.itemId, quantity: p.quantity, stats: stackStats });
	};
	for (const p of parsed) {
		const matches = cargo.filter((c) => Number(c.item_id) === p.itemId);
		if (matches.length === 0) {
			const availableIds = Array.from(new Set(cargo.map((c) => Number(c.item_id))));
			const itemsSuffix = availableIds.length
				? ` — cargo has items: ${availableIds.join(", ")}`
				: " — cargo is empty";
			throw new ValidationError(
				`no cargo stack matches item ${p.itemId} (${formatItem(p.itemId)})${itemsSuffix}`,
			);
		}
		if (p.stats !== null) {
			const match = matches.find((s) => BigInt(s.stats.toString()) === p.stats);
			if (match) {
				emitResolved(p, match);
				continue;
			}
			throw new ValidationError(buildStatsMismatchMessage(p, matches));
		}
		if (matches.length === 1) {
			emitResolved(p, matches[0]);
			continue;
		}
		throw new ValidationError(buildAmbiguityMessage(p, matches, mode));
	}
	return resolved;
}
