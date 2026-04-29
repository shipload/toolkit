import { createHash } from "node:crypto";

export interface ActivityQuery {
	account: string;
	contract?: string;
	action?: string;
	date?: string;
	startDate?: string;
	endDate?: string;
}

export interface ActivityResult {
	global_action_seq: number;
	block_num: number;
	block_time: string;
	irreversible: boolean;
	action_trace: {
		trx_id: string;
		receiver: string;
		act: {
			account: string;
			name: string;
			authorization: unknown[];
			hex_data: string;
			data: Record<string, unknown>;
		};
	};
}

export interface ActivityResponse {
	results: ActivityResult[];
	next_cursor?: string;
}

export interface FetchActivityOptions {
	historyUrl: string;
	account: string;
	contract?: string;
	action?: string;
	date?: string;
	startDate?: string;
	endDate?: string;
	limit?: number;
	order?: "asc" | "desc";
	cursor?: string;
	startSeq?: number;
	decode?: boolean;
}

export function activityFingerprint(q: ActivityQuery): string {
	const data = `${q.account}|${q.contract ?? ""}|${q.action ?? ""}|${q.date ?? ""}|${q.startDate ?? ""}|${q.endDate ?? ""}`;
	const hash = createHash("sha256").update(data).digest();
	return hash.subarray(0, 8).toString("base64");
}

export function syntheticCursor(
	q: ActivityQuery,
	fromSeq: number,
	order: "asc" | "desc",
): string {
	const cursor = { g: fromSeq, o: order, q: activityFingerprint(q) };
	return Buffer.from(JSON.stringify(cursor)).toString("base64");
}

export async function fetchActivity(opts: FetchActivityOptions): Promise<ActivityResponse> {
	const base = opts.historyUrl.replace(/\/+$/, "");
	const url = new URL(`${base}/account/${encodeURIComponent(opts.account)}/activity`);
	if (opts.contract) url.searchParams.set("contract", opts.contract);
	if (opts.action) url.searchParams.set("action", opts.action);
	if (opts.date) url.searchParams.set("date", opts.date);
	if (opts.startDate) url.searchParams.set("start_date", opts.startDate);
	if (opts.endDate) url.searchParams.set("end_date", opts.endDate);
	if (opts.limit !== undefined) url.searchParams.set("limit", String(opts.limit));
	if (opts.order) url.searchParams.set("order", opts.order);
	if (opts.decode !== undefined) url.searchParams.set("decode", String(opts.decode));

	let cursor = opts.cursor;
	if (!cursor && opts.startSeq !== undefined) {
		cursor = syntheticCursor(
			{
				account: opts.account,
				contract: opts.contract,
				action: opts.action,
				date: opts.date,
				startDate: opts.startDate,
				endDate: opts.endDate,
			},
			opts.startSeq,
			opts.order ?? "desc",
		);
	}
	if (cursor) url.searchParams.set("cursor", cursor);

	const res = await fetch(url.toString());
	if (!res.ok) {
		throw new Error(`actionstream returned HTTP ${res.status}: ${await res.text()}`);
	}
	return (await res.json()) as ActivityResponse;
}
