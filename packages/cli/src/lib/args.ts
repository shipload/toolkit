import { ALL_ENTITY_TYPES, type EntityTypeName } from "@shipload/sdk";
import { InvalidArgumentError } from "commander";
import type { ParsedCargoInput } from "./cargo-resolve";

export { ALL_ENTITY_TYPES, type EntityTypeName };

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

export interface ParsedCargoRef {
	itemId: number;
	stackId: bigint;
}

export function parseCargoRef(s: string): ParsedCargoRef {
	const parts = s.split(":");
	if (parts.length !== 2) {
		throw new InvalidArgumentError(
			`cargo ref must be "<item-id>:<stack-id>" (got "${s}")`,
		);
	}
	const itemId = Number(parts[0]);
	const stackIdStr = parts[1];
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
	return { itemId, stackId: BigInt(stackIdStr) };
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

export function parseUint8(s: string): number {
	const n = Number(s);
	if (!Number.isInteger(n) || n < 0 || n > 0xff) {
		throw new InvalidArgumentError(`must be an integer in range 0–255 (got "${s}")`);
	}
	return n;
}

export function parseUint16(s: string): number {
	const n = Number(s);
	if (!Number.isInteger(n) || n < 0 || n > 0xffff) {
		throw new InvalidArgumentError(`must be an integer in range 0–65535 (got "${s}")`);
	}
	return n;
}

export function parseUint32(s: string): number {
	const n = Number(s);
	if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) {
		throw new InvalidArgumentError(`must be an integer in range 0–4294967295 (got "${s}")`);
	}
	return n;
}

export function parseUint64(s: string): bigint {
	if (!/^\d+$/.test(s)) {
		throw new InvalidArgumentError(`must be a non-negative integer (got "${s}")`);
	}
	return BigInt(s);
}
