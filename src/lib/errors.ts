import { ValidationError } from "./validate";

export const EXIT = {
	SUCCESS: 0,
	USER_ERROR: 1,
	CHAIN_ERROR: 2,
	UNEXPECTED: 3,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

export function extractChainError(err: unknown): string {
	if (err && typeof err === "object") {
		const maybeSession = err as {
			response?: { json?: { error?: { details?: { message?: string }[] } } };
			message?: string;
		};
		const detail = maybeSession.response?.json?.error?.details?.[0]?.message;
		if (typeof detail === "string" && detail.length > 0) {
			return stripAssertionPrefix(detail);
		}
		if (typeof maybeSession.message === "string" && maybeSession.message.length > 0) {
			return stripAssertionPrefix(maybeSession.message);
		}
	}
	return "unknown error";
}

function stripAssertionPrefix(msg: string): string {
	return msg.replace(/^assertion failure with message:\s*/, "");
}

export interface ChainHint {
	matches: (msg: string) => boolean;
	hint: string;
}

const HINTS: ChainHint[] = [
	{
		matches: (m) => m.includes("cannot cancel market task"),
		hint: "Gather/craft tasks cannot be canceled once scheduled. Wait for completion (player wait <type> <id>) or let the schedule drain.",
	},
	{
		matches: (m) => m.includes("cargo capacity would be exceeded"),
		hint: "Pre-flight capacity check missed this — pass --estimate first, or reduce quantity.",
	},
	{
		matches: (m) => m.includes("no resources at this stratum"),
		hint: "Either the stratum is empty, or it is below your gatherer's depth. Check: player stratum <x> <y> <index>.",
	},
];

export function assertNotBoth(opts: Record<string, unknown>, a: string, b: string): void {
	if (opts[a] && opts[b]) {
		process.exit(printError(new ValidationError(`--${a} and --${b} are mutually exclusive`)));
	}
}

export function printError(err: unknown): ExitCode {
	if (err instanceof ValidationError) {
		console.error(`Error: ${err.message}`);
		if (err.suggestion) console.error(`Try: ${err.suggestion}`);
		return EXIT.USER_ERROR;
	}
	const msg = extractChainError(err);
	console.error(`Error: ${msg}`);
	const hint = HINTS.find((h) => h.matches(msg))?.hint;
	if (hint) console.error(`Hint: ${hint}`);
	return EXIT.CHAIN_ERROR;
}
