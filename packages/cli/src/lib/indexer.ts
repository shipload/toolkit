export interface EventRecord {
	block_num: number;
	block_time: string;
	seq: number;
	type: string;
	type_code: number;
	owner: string;
	entity_id: number;
	data: Record<string, unknown>;
}

export interface EventsResponse {
	latest_seq: number;
	events: EventRecord[];
	next_seq: number;
	has_more: boolean;
}

export interface FetchEventsOptions {
	indexerUrl: string;
	fromSeq?: number;
	limit?: number;
	owner?: string;
	entityId?: number;
	eventType?: string;
}

export async function fetchEvents(opts: FetchEventsOptions): Promise<EventsResponse> {
	const base = opts.indexerUrl.replace(/\/+$/, "");
	const url = new URL(`${base}/v1/shipload/events`);
	if (opts.fromSeq !== undefined) url.searchParams.set("from_seq", String(opts.fromSeq));
	if (opts.limit !== undefined) url.searchParams.set("limit", String(opts.limit));
	if (opts.owner) url.searchParams.set("owner", opts.owner);
	if (opts.entityId !== undefined) url.searchParams.set("entity_id", String(opts.entityId));
	if (opts.eventType) url.searchParams.set("event_type", opts.eventType);

	const res = await fetch(url.toString());
	if (!res.ok) {
		throw new Error(`indexer returned HTTP ${res.status}: ${await res.text()}`);
	}
	return (await res.json()) as EventsResponse;
}
