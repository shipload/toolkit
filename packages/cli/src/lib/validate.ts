export class ValidationError extends Error {
	constructor(
		message: string,
		public readonly suggestion?: string,
	) {
		super(message);
		this.name = "ValidationError";
	}
}

export function checkCapacity(
	capacity: number,
	currentCargoMass: number,
	resourceMass: number,
	quantity: number,
): void {
	const addedMass = resourceMass * quantity;
	if (currentCargoMass + addedMass <= capacity) return;
	const remaining = capacity - currentCargoMass;
	const maxSafe = resourceMass > 0 ? Math.max(0, Math.floor(remaining / resourceMass)) : 0;
	throw new ValidationError(
		`Cargo capacity would be exceeded: ${currentCargoMass + addedMass} > ${capacity}`,
		maxSafe > 0 ? `--quantity ${maxSafe}` : undefined,
	);
}

export function checkDepth(gathererDepth: number, stratumIndex: number): void {
	if (stratumIndex <= gathererDepth) return;
	throw new ValidationError(
		`Stratum index ${stratumIndex} is below gatherer depth ${gathererDepth}.`,
	);
}

export function checkEnergy(available: number, required: number): void {
	if (available >= required) return;
	throw new ValidationError(
		`Insufficient energy: have ${available}, need ${required} (short by ${required - available}).`,
	);
}
