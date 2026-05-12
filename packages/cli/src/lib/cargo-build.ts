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
	if (opts.targetModules !== undefined && opts.targetItemId === undefined) {
		throw new ValidationError(
			"--target-modules requires --target <item-id>:<stack-id>.",
		);
	}
}
