export type FeasibilityCode =
	| "energy_capacity_exceeded"
	| "insufficient_energy"
	| "insufficient_cargo_capacity"
	| "insufficient_reserve"
	| "excessive_travel_duration"
	| "origin_equals_target";

export interface FeasibilityIssue {
	code: FeasibilityCode;
	severity: "error" | "warning";
	message: string;
	detail?: Record<string, number | string>;
}

export function checkEnergyCapacity(
	capacity: number,
	required: number,
	verb: string,
): FeasibilityIssue | null {
	if (required <= capacity) return null;
	return {
		code: "energy_capacity_exceeded",
		severity: "error",
		message: `${verb} requires ${required} energy capacity, entity cap is ${capacity}`,
		detail: { capacity, required },
	};
}

export function checkEnergyAvailable(
	current: number,
	required: number,
	verb: string,
	entity?: { entityType: string; entityId: bigint | number | string },
): FeasibilityIssue | null {
	if (current >= required) return null;
	const suffix = entity
		? ` — run \`player recharge ${entity.entityType} ${entity.entityId}\` first, or pass --recharge to compose the recharge into this transaction`
		: " — recharge first";
	return {
		code: "insufficient_energy",
		severity: "error",
		message: `${verb} needs ${required} energy, entity has ${current}${suffix}`,
		detail: { current, required },
	};
}

export function checkCargoCapacity(available: number, delta: number): FeasibilityIssue | null {
	if (delta <= 0 || delta <= available) return null;
	return {
		code: "insufficient_cargo_capacity",
		severity: "error",
		message: `cargo delta ${delta} exceeds available ${available}`,
		detail: { available, delta },
	};
}

export function checkReserve(remaining: number, requested: number): FeasibilityIssue | null {
	if (requested <= remaining) return null;
	return {
		code: "insufficient_reserve",
		severity: "error",
		message: `stratum has ${remaining} remaining, requested ${requested}`,
		detail: { remaining, requested },
	};
}

const TRAVEL_MAX_DURATION = 86400;
export function checkTravelDuration(seconds: number): FeasibilityIssue | null {
	if (seconds < TRAVEL_MAX_DURATION) return null;
	return {
		code: "excessive_travel_duration",
		severity: "error",
		message: `travel duration ${seconds}s exceeds limit ${TRAVEL_MAX_DURATION}s`,
		detail: { seconds, limit: TRAVEL_MAX_DURATION },
	};
}

export function checkOriginEqualsTarget(
	ox: number,
	oy: number,
	tx: number,
	ty: number,
): FeasibilityIssue | null {
	if (ox !== tx || oy !== ty) return null;
	return {
		code: "origin_equals_target",
		severity: "warning",
		message: `origin (${ox},${oy}) equals target — no travel needed`,
	};
}

export function collectIssues(...checks: (FeasibilityIssue | null)[]): FeasibilityIssue[] {
	return checks.filter((c): c is FeasibilityIssue => c !== null);
}

export function renderIssues(issues: FeasibilityIssue[]): string {
	return issues
		.map((i) => (i.severity === "error" ? `❌ ${i.message}` : `⚠️  ${i.message}`))
		.join("\n");
}
