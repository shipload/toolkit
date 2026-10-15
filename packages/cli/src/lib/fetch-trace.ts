type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface OriginState {
	inFlight: number;
	lastSettledAt: number | null;
}

export interface FetchFailure {
	method: string;
	url: URL;
	phase: "headers" | "body";
	elapsedMs: number;
	idleMs: number | null;
	concurrent: number;
	err: unknown;
}

function errorFields(err: unknown): string {
	if (!err || typeof err !== "object") return String(err);
	const e = err as { name?: unknown; code?: unknown; errno?: unknown; syscall?: unknown };
	const parts: string[] = [];
	if (typeof e.name === "string") parts.push(`name=${e.name}`);
	if (e.code !== undefined) parts.push(`code=${String(e.code)}`);
	if (e.errno !== undefined) parts.push(`errno=${String(e.errno)}`);
	if (e.syscall !== undefined) parts.push(`syscall=${String(e.syscall)}`);
	return parts.join(" ");
}

export function formatFetchFailure(f: FetchFailure): string {
	const idle = f.idleMs === null ? "first request" : `idle ${(f.idleMs / 1000).toFixed(2)}s`;
	return (
		`fetch failed: ${f.method} ${f.url.host}${f.url.pathname} during ${f.phase} ` +
		`after ${f.elapsedMs}ms, ${idle}, ${f.concurrent} concurrent, ${errorFields(f.err)}`
	);
}

const READ_PATH = /^\/v1\/chain\/(get_[a-z_]+|send_read_only_transaction)$/;

function isAbort(err: unknown): boolean {
	return err instanceof Error && err.name === "AbortError";
}

export function createTracedFetch(
	base: FetchLike,
	log: (line: string) => void,
	now: () => number = Date.now,
): FetchLike {
	const origins = new Map<string, OriginState>();

	const attempt = async (
		input: string | URL | Request,
		init: RequestInit | undefined,
		url: URL,
		method: string,
		state: OriginState,
		suffix: (err: unknown) => string,
	): Promise<Response> => {
		const startedAt = now();
		const idleMs =
			state.inFlight > 0 ? 0 : state.lastSettledAt === null ? null : startedAt - state.lastSettledAt;
		const concurrent = state.inFlight;
		state.inFlight++;
		let phase: FetchFailure["phase"] = "headers";
		try {
			const res = await base(input, init);
			phase = "body";
			const body = await res.arrayBuffer();
			return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
		} catch (err) {
			const failure = { method, url, phase, elapsedMs: now() - startedAt, idleMs, concurrent, err };
			log(`${formatFetchFailure(failure)}${suffix(err)}`);
			throw err;
		} finally {
			state.inFlight--;
			state.lastSettledAt = now();
		}
	};

	return async (input, init) => {
		const url = new URL(input instanceof Request ? input.url : String(input));
		const method = init?.method ?? (input instanceof Request ? input.method : "GET");
		let state = origins.get(url.origin);
		if (!state) {
			state = { inFlight: 0, lastSettledAt: null };
			origins.set(url.origin, state);
		}
		const retryable =
			!(input instanceof Request) &&
			(init?.body === undefined || init.body === null || typeof init.body === "string") &&
			READ_PATH.test(url.pathname);
		try {
			return await attempt(input, init, url, method, state, (err) =>
				retryable && !isAbort(err) ? ", retrying" : "",
			);
		} catch (err) {
			if (!retryable || isAbort(err)) throw err;
			return attempt(input, init, url, method, state, () => ", retry failed");
		}
	};
}

let traceLog: ((line: string) => void) | null = null;

const traced = createTracedFetch(
	(input, init) => globalThis.fetch(input, init),
	(line) => traceLog?.(line),
);

export const appFetch: FetchLike = (input, init) =>
	traceLog ? traced(input, init) : globalThis.fetch(input, init);

export function enableFetchTrace(log: (line: string) => void): void {
	traceLog = log;
}
