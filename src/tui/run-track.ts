import { Name } from "@wharfkit/antelope";
import { getShipload } from "../lib/client";
import type { EntityContext } from "../lib/entity-scope";
import { transact } from "../lib/session";
import { getEntitySnapshot } from "../lib/snapshot";
import { streamEntitySnapshot } from "../lib/snapshot-stream";
import { runApp } from "./app";
import { ActionDispatcher } from "./state/actions";
import { createTrackView } from "./views/track";

export interface RunTrackViewOpts {
	timeoutMs?: number;
}

const ACTION_TIMEOUT_MS = 30_000;

function explorerUrlFor(txid: string): string {
	return `https://jungle4.unicove.com/en/jungle4/transaction/${txid}`;
}

export async function runTrackView(ctx: EntityContext, opts: RunTrackViewOpts = {}): Promise<void> {
	const initial = await getEntitySnapshot(ctx.entityType, ctx.entityId);
	const stream = streamEntitySnapshot({
		entityType: ctx.entityType,
		entityId: ctx.entityId,
		initialSnapshot: initial,
	});
	const dispatcher = new ActionDispatcher({ timeoutMs: ACTION_TIMEOUT_MS });

	const view = createTrackView({
		ctx: { entityType: ctx.entityType, entityId: ctx.entityId },
		initialSnapshot: initial,
		stream,
		resolveAction: async (count) => {
			let capturedTxid = "";
			const dispatch = await dispatcher.run("resolve", async () => {
				const shipload = await getShipload();
				const action = shipload.actions.resolve(
					BigInt(ctx.entityId.toString()),
					Name.from(String(ctx.entityType)),
				);
				const txResult = await transact(
					{ action },
					{
						description: `Resolved ${count} task(s) on ${ctx.entityType} ${ctx.entityId}`,
					},
				);
				capturedTxid = txResult.txid;
				if (!capturedTxid) {
					throw new Error("transaction failed (no txid returned)");
				}
			});
			if (!dispatch.ok) throw new Error(dispatch.error);
			return {
				txid: capturedTxid,
				explorerUrl: explorerUrlFor(capturedTxid),
			};
		},
	});

	await runApp({
		view,
		entityType: ctx.entityType,
		entityId: ctx.entityId,
		timeoutMs: opts.timeoutMs,
	});
}
