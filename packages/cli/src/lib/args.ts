import { InvalidArgumentError } from "commander";
import type { ParsedCargoInput } from "./cargo-resolve";

export type EntityTypeName = "ship" | "container" | "warehouse";

export const ALL_ENTITY_TYPES: readonly EntityTypeName[] = ["ship", "container", "warehouse"];

export function parseEntityType(s: string): EntityTypeName {
	if ((ALL_ENTITY_TYPES as readonly string[]).includes(s)) {
		return s as EntityTypeName;
	}
	throw new InvalidArgumentError(`entity type must be one of: ${ALL_ENTITY_TYPES.join(", ")}`);
}

export interface EntityRef {
	entityType: EntityTypeName;
	entityId: bigint;
}

export function parseEntityRef(s: string): EntityRef {
	const idx = s.indexOf(":");
	if (idx < 0) {
		throw new InvalidArgumentError(`entity ref must be "type:id" (got "${s}")`);
	}
	const entityType = parseEntityType(s.slice(0, idx));
	const idStr = s.slice(idx + 1);
	if (!/^\d+$/.test(idStr)) {
		throw new InvalidArgumentError(`entity id must be a non-negative integer (got "${idStr}")`);
	}
	return { entityType, entityId: BigInt(idStr) };
}

export function parseEntityRefList(s: string): EntityRef[] {
	if (s.length === 0) {
		throw new InvalidArgumentError("entity ref list must not be empty");
	}
	const parts = s.split(",");
	return parts.map((p) => {
		if (p.length === 0) {
			throw new InvalidArgumentError("entity ref list contains empty entry");
		}
		return parseEntityRef(p);
	});
}

export function parseCargoInput(s: string): ParsedCargoInput {
	const parts = s.split(":");
	if (parts.length !== 3) {
		throw new InvalidArgumentError(
			`cargo input must be "<item-id>:<stack-id>:<qty>" (got "${s}")`,
		);
	}
	const itemId = Number(parts[0]);
	const stackIdStr = parts[1];
	const quantity = Number(parts[2]);
	if (!Number.isInteger(itemId) || itemId < 0) {
		throw new InvalidArgumentError(
			`cargo item-id must be a non-negative integer (got "${parts[0]}")`,
		);
	}
	if (!/^\d+$/.test(stackIdStr)) {
		throw new InvalidArgumentError(
			`cargo stack-id must be a non-negative integer (got "${parts[1]}")`,
		);
	}
	if (!Number.isInteger(quantity) || quantity <= 0) {
		throw new InvalidArgumentError(`cargo qty must be a positive integer (got "${parts[2]}")`);
	}
	return { itemId, stackId: BigInt(stackIdStr), quantity };
}

export function accumulateCargoInputs(
	value: string,
	previous: ParsedCargoInput[] | undefined,
): ParsedCargoInput[] {
	const next = parseCargoInput(value);
	return previous ? [...previous, next] : [next];
}

export function parseInt64(s: string): bigint {
	if (!/^-?\d+$/.test(s)) {
		throw new InvalidArgumentError(`must be an integer (got "${s}")`);
	}
	return BigInt(s);
}

export function parseUint16(s: string): number {
	const n = Number(s);
	if (!Number.isInteger(n) || n < 0 || n > 0xffff) {
		throw new InvalidArgumentError(`must be a non-negative 16-bit integer (got "${s}")`);
	}
	return n;
}

export function parseUint32(s: string): number {
	const n = Number(s);
	if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) {
		throw new InvalidArgumentError(`must be a non-negative 32-bit integer (got "${s}")`);
	}
	return n;
}

export function parseUint64(s: string): bigint {
	if (!/^\d+$/.test(s)) {
		throw new InvalidArgumentError(`must be a non-negative integer (got "${s}")`);
	}
	return BigInt(s);
}
