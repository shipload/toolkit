import { ValidationError } from "./validate";

export const EXIT = {
	SUCCESS: 0,
	USER_ERROR: 1,
	CHAIN_ERROR: 2,
	UNEXPECTED: 3,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

export function extractChainError(err: unknown): string {
	const body = chainErrorBody(err);
	if (body) return pickPrimaryChainMessage(body);
	if (typeof err === "string" && err.length > 0) return err;
	if (err && typeof err === "object") {
		const maybe = err as { message?: string };
		if (
			typeof maybe.message === "string" &&
			maybe.message.length > 0 &&
			maybe.message !== "[object Object]"
		) {
			return stripAssertionPrefix(maybe.message);
		}
		const summary = summarizeErrorObject(err as Record<string, unknown>);
		if (summary) return summary;
	}
	return "unknown error";
}

function summarizeErrorObject(obj: Record<string, unknown>): string | null {
	const name = typeof obj.name === "string" && obj.name.length > 0 && obj.name !== "Error" ? obj.name : null;
	const what = typeof obj.what === "string" && obj.what.length > 0 ? obj.what : null;
	const label = [name, what].filter(Boolean).join(": ");
	if (!label) return null;
	const code = typeof obj.code === "number" || typeof obj.code === "string" ? ` (code ${obj.code})` : "";
	return `${label}${code}`;
}

function stripAssertionPrefix(msg: string): string {
	return msg.replace(/^assertion failure with message:\s*/, "");
}

export interface ChainErrorDetail {
	message?: string;
	file?: string;
	line_number?: number;
	method?: string;
}

export interface ChainErrorBody {
	code?: number;
	name?: string;
	what?: string;
	details?: ChainErrorDetail[];
}

export function chainErrorBody(err: unknown): ChainErrorBody | null {
	const maybe = err as { response?: { json?: { error?: ChainErrorBody } } };
	const e = maybe?.response?.json?.error;
	if (!e || !Array.isArray(e.details)) return null;
	return e;
}

export type ErrorOrigin = "chain" | "client";

export function errorOrigin(err: unknown): ErrorOrigin {
	return chainErrorBody(err) ? "chain" : "client";
}

function isGenericMessage(msg: string): boolean {
	const m = msg.trim().toLowerCase();
	return m === "" || m === "assertion failed";
}

export function pickPrimaryChainMessage(body: ChainErrorBody): string {
	const first = stripAssertionPrefix(body.details?.[0]?.message ?? "");
	if (!isGenericMessage(first)) return first;
	for (let i = 1; i < (body.details?.length ?? 0); i++) {
		const candidate = stripAssertionPrefix(body.details?.[i]?.message ?? "");
		if (!isGenericMessage(candidate) && candidate.length > 0) return candidate;
	}
	if (body.what && body.what.length > 0) return body.what;
	return first || "unknown chain error";
}

export function logRichChainError(body: ChainErrorBody): void {
	const header =
		`[chain] ${body.name ?? "transaction_exception"} ` +
		`(code ${body.code ?? 0}): ${body.what ?? ""}`.trim();
	console.error(header);
	for (const d of body.details ?? []) {
		const loc =
			d.file && d.line_number
				? ` (${d.file}:${d.line_number}${d.method ? ` ${d.method}` : ""})`
				: "";
		console.error(`  - ${d.message ?? ""}${loc}`);
	}
}

export interface ChainHint {
	matches: (msg: string) => boolean;
	hint: string;
}

const HINTS: ChainHint[] = [
	{
		matches: (m) => m.includes("task is non-cancelable"),
		hint: "Certain tasks (Gather, Warp, and similar system tasks) cannot be canceled once scheduled. Cancel up to the blocker, then let the schedule drain or wait via `shiploadcli <type> <id> wait`.",
	},
	{
		matches: (m) => m.includes("cargo capacity would be exceeded"),
		hint: "Pre-flight capacity check missed this — pass --estimate first, or reduce quantity.",
	},
	{
		matches: (m) => m.includes("no resources at this stratum"),
		hint: "Either the stratum is empty, or it is below your gatherer's depth. Check: shiploadcli stratum <x> <y> <index>.",
	},
	{
		matches: (m) => m.includes("reached account cpu limit") || m.includes("reached account net limit"),
		hint: "Your account's staked CPU/NET regenerates over ~24h. Wait 10-30s and retry, stake more EOS, or use a PowerUp to top up temporarily. Batch-submitting many actions back-to-back is the usual trigger.",
	},
	{
		matches: (m) => m.includes("irrelevant authority"),
		hint: "The action isn't linked to the signing permission. Link it with linkauth (open-auth crank actions like mintready/charterready/voteready link to eosio.any), then retry.",
	},
	{
		matches: (m) => m.includes("non-existent permission"),
		hint: "The signing actor@permission isn't set up on chain yet. Create the permission and wire your key (updateauth + linkauth the relevant actions), then check `shiploadcli oracle status`.",
	},
];

export function describeLoopError(err: unknown): string {
	const msg = extractChainError(err);
	const hint = HINTS.find((h) => h.matches(msg))?.hint;
	return hint ? `${msg} — ${hint}` : msg;
}

const IDLE_CRANK_MESSAGES = [
	"no pools are ready to mint",
	"no ballots are due",
	"no supplied lots were actionable",
	"no lots supplied",
	"world has no mandate set",
	"charter is already completed at this world",
	"charter prerequisites are not completed",
	"world lifetime influence is below the charter cost",
	"charter refit target not found at this world",
];

export function isIdleCrankError(err: unknown): boolean {
	const msg = extractChainError(err);
	return IDLE_CRANK_MESSAGES.some((m) => msg.includes(m));
}

export function assertNotBoth(opts: Record<string, unknown>, ...pairs: [string, string][]): void {
	for (const [a, b] of pairs) {
		if (opts[a] && opts[b]) {
			process.exit(
				printError(new ValidationError(`--${a} and --${b} are mutually exclusive`)),
			);
		}
	}
}

export function printError(err: unknown): ExitCode {
	if (err instanceof ValidationError) {
		console.error(`Error: ${err.message}`);
		if (err.suggestion) console.error(`Try: ${err.suggestion}`);
		return EXIT.USER_ERROR;
	}
	const body = chainErrorBody(err);
	if (body) logRichChainError(body);
	const msg = extractChainError(err);
	console.error(`Error: ${msg}`);
	const hint = HINTS.find((h) => h.matches(msg))?.hint;
	if (hint) console.error(`Hint: ${hint}`);
	return EXIT.CHAIN_ERROR;
}

export async function withValidation<T>(fn: () => Promise<T>): Promise<T> {
	try {
		return await fn();
	} catch (err) {
		if (err instanceof ValidationError) {
			process.exit(printError(err));
		}
		throw err;
	}
}

export type PreflightOutcome =
	| { kind: "abort"; error: ValidationError }
	| { kind: "warn"; message: string };

export function resolvePreflightError(err: unknown, force: boolean): PreflightOutcome | null {
	if (err === undefined || err === null) return null;
	if (err instanceof ValidationError) {
		if (force) {
			return {
				kind: "warn",
				message: `Warning: ${err.message} (proceeding due to --force)`,
			};
		}
		return { kind: "abort", error: err };
	}
	throw err;
}
