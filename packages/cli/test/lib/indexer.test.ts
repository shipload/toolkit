import { afterEach, describe, expect, test } from "bun:test";
import { fetchEvents } from "../../src/lib/indexer";

type FetchSpy = {
    calls: { url: string; init?: RequestInit }[];
    response: Response;
};

function installFetch(spy: FetchSpy): () => void {
    const orig = globalThis.fetch;
    globalThis.fetch = ((url: string, init?: RequestInit) => {
        spy.calls.push({ url, init });
        return Promise.resolve(spy.response);
    }) as typeof fetch;
    return () => {
        globalThis.fetch = orig;
    };
}

const SAMPLE_RESPONSE = {
    latest_seq: 1234,
    events: [
        {
            block_num: 1000,
            block_time: "2026-04-28T17:32:19Z",
            seq: 1100,
            type: "travel",
            type_code: 5,
            owner: "alice",
            entity_id: 3,
            data: { entity_type: "ship", id: 3, x: 5, y: 7 },
        },
    ],
    next_seq: 1101,
    has_more: false,
};

describe("fetchEvents", () => {
    let restore: (() => void) | null = null;
    afterEach(() => {
        restore?.();
        restore = null;
    });

    test("builds URL with no filters", async () => {
        const spy: FetchSpy = {
            calls: [],
            response: new Response(JSON.stringify(SAMPLE_RESPONSE), { status: 200 }),
        };
        restore = installFetch(spy);

        await fetchEvents({ indexerUrl: "https://idx.example.com" });

        expect(spy.calls).toHaveLength(1);
        const url = new URL(spy.calls[0].url);
        expect(url.origin).toBe("https://idx.example.com");
        expect(url.pathname).toBe("/v1/shipload/events");
        expect(url.search).toBe("");
    });

    test("URL includes only set filters", async () => {
        const spy: FetchSpy = {
            calls: [],
            response: new Response(JSON.stringify(SAMPLE_RESPONSE), { status: 200 }),
        };
        restore = installFetch(spy);

        await fetchEvents({
            indexerUrl: "https://idx.example.com",
            owner: "alice",
            entityId: 3,
            eventType: "travel",
            fromSeq: 100,
            limit: 50,
        });

        const url = new URL(spy.calls[0].url);
        expect(url.searchParams.get("owner")).toBe("alice");
        expect(url.searchParams.get("entity_id")).toBe("3");
        expect(url.searchParams.get("event_type")).toBe("travel");
        expect(url.searchParams.get("from_seq")).toBe("100");
        expect(url.searchParams.get("limit")).toBe("50");
    });

    test("trailing slash on indexerUrl is tolerated", async () => {
        const spy: FetchSpy = {
            calls: [],
            response: new Response(JSON.stringify(SAMPLE_RESPONSE), { status: 200 }),
        };
        restore = installFetch(spy);

        await fetchEvents({ indexerUrl: "https://idx.example.com/" });

        const url = new URL(spy.calls[0].url);
        expect(url.pathname).toBe("/v1/shipload/events");
    });

    test("parses response into typed shape", async () => {
        const spy: FetchSpy = {
            calls: [],
            response: new Response(JSON.stringify(SAMPLE_RESPONSE), { status: 200 }),
        };
        restore = installFetch(spy);

        const res = await fetchEvents({ indexerUrl: "https://idx.example.com" });

        expect(res.latest_seq).toBe(1234);
        expect(res.next_seq).toBe(1101);
        expect(res.has_more).toBe(false);
        expect(res.events).toHaveLength(1);
        expect(res.events[0].type).toBe("travel");
        expect(res.events[0].owner).toBe("alice");
        expect(res.events[0].entity_id).toBe(3);
    });

    test("throws on non-2xx response with status code", async () => {
        const spy: FetchSpy = {
            calls: [],
            response: new Response("internal error", { status: 500 }),
        };
        restore = installFetch(spy);

        await expect(
            fetchEvents({ indexerUrl: "https://idx.example.com" }),
        ).rejects.toThrow(/500/);
    });
});
