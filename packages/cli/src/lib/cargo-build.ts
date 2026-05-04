import type { ServerTypes } from "@shipload/sdk";
import { ValidationError } from "./validate";

export function parseModulesJson(
	json: string | undefined,
): ServerTypes.module_entry[] {
	if (!json) return [];
	return JSON.parse(json) as ServerTypes.module_entry[];
}

export interface TargetTriple {
	targetItemId?: bigint;
	targetStats?: bigint;
	targetModules?: string;
}

export function validateTargetTriple(opts: TargetTriple): void {
	const anyPresent =
		opts.targetItemId !== undefined ||
		opts.targetStats !== undefined ||
		opts.targetModules !== undefined;
	const corePresent =
		opts.targetItemId !== undefined && opts.targetStats !== undefined;
	if (anyPresent && !corePresent) {
		throw new ValidationError(
			"--target-item-id and --target-stats must be provided together (--target-modules is optional, defaults to []).",
		);
	}
}
