import { type Projectable, schedule, ServerTypes } from "@shipload/sdk";
import { PrivateKey, type PublicKey } from "@wharfkit/antelope";
import {
	Action,
	type AnyAction,
	Session,
	type TransactArgs,
	type TransactOptions,
} from "@wharfkit/session";
import { WalletPluginPrivateKey } from "@wharfkit/wallet-plugin-privatekey";
import { chain, client } from "./client";
import { loadConfig } from "./config";
import { printError } from "./errors";
import {
	formatCancelResults,
	formatDuration,
	formatEntityRef,
	formatResolveResults,
} from "./format";
import { getEntitySnapshot } from "./snapshot";

let cachedSession: Session | null = null;
let cachedActor: string | null = null;
let cachedPublicKey: PublicKey | null = null;

function initialize(): void {
	if (cachedSession) return;
	const config = loadConfig();
	const key = PrivateKey.from(config.privateKey);
	cachedPublicKey = key.toPublic();
	cachedActor = config.actor;
	cachedSession = new Session(
		{
			chain,
			actor: config.actor,
			permission: config.permission,
			walletPlugin: new WalletPluginPrivateKey(config.privateKey),
		},
		{ fetch },
	);
}

export function getSession(): Session {
	initialize();
	return cachedSession as Session;
}

export function getAccountName(): string {
	initialize();
	return cachedActor as string;
}

export function getPublicKey(): PublicKey {
	initialize();
	return cachedPublicKey as PublicKey;
}

const TASK_RESULT_ACTIONS = [
	"travel",
	"grouptravel",
	"transfer",
	"recharge",
	"gather",
	"craft",
	"blend",
	"deploy",
	"warp",
	"wrap",
	"addmodule",
	"rmmodule",
];
const RESOLVE_ACTIONS = ["resolve"];
const CANCEL_ACTIONS = ["cancel"];

function getActions(args: TransactArgs): (Action | AnyAction)[] {
	if (args.action) return [args.action];
	if (args.actions) return args.actions;
	return [];
}

function getActionName(action: Action | AnyAction): string {
	if (action instanceof Action) {
		return action.name.toString();
	}
	return String(action.name);
}

async function formatTaskAddition(
	entityType: string,
	entityId: bigint,
	addedCount: number,
	snapshots: Map<string, unknown>,
): Promise<string> {
	const taskWord = addedCount === 1 ? "task" : "tasks";
	try {
		const snap = await getEntitySnapshot(entityType, entityId);
		snapshots.set(formatEntityRef({ entityType, entityId }), snap);
		const projectable = snap as unknown as Projectable;
		const totalTasks = projectable.schedule?.tasks?.length ?? 0;
		const totalWord = totalTasks === 1 ? "task" : "tasks";
		const remaining = schedule.scheduleRemaining(projectable, new Date());
		const tail = remaining > 0 ? ` · ends in ${formatDuration(remaining)}` : "";
		return `${entityType} ${entityId}: queued ${addedCount} ${taskWord} (${totalTasks} ${totalWord} in queue${tail})`;
	} catch {
		return `${entityType} ${entityId}: queued ${addedCount} ${taskWord}`;
	}
}

async function formatActionResult(
	actionName: string,
	returnData: unknown,
	snapshots: Map<string, unknown>,
): Promise<string | null> {
	if (TASK_RESULT_ACTIONS.includes(actionName)) {
		const results = ServerTypes.task_results.from(returnData);
		const lines = await Promise.all(
			results.entities.map((e) =>
				formatTaskAddition(
					e.entity_type.toString(),
					BigInt(e.entity_id.toString()),
					Number(e.task_count),
					snapshots,
				),
			),
		);
		return lines.length > 0 ? lines.join("\n") : null;
	}
	if (RESOLVE_ACTIONS.includes(actionName)) {
		const results = ServerTypes.resolve_results.from(returnData);
		return formatResolveResults(results);
	}
	if (CANCEL_ACTIONS.includes(actionName)) {
		const results = ServerTypes.cancel_results.from(returnData);
		return formatCancelResults(results);
	}
	return null;
}

export interface TransactResult {
	txid: string;
	snapshots: Map<string, unknown>;
}

export interface SessionLike {
	transact: (
		args: TransactArgs,
		options?: TransactOptions & { description?: string },
	) => Promise<{
		response?: {
			transaction_id?: string;
			processed?: { action_traces?: { return_value_data?: unknown }[] };
		};
	}>;
}

export async function runTransact(
	sessionLike: SessionLike,
	args: TransactArgs,
	options?: TransactOptions & { description?: string },
): Promise<TransactResult> {
	const snapshots = new Map<string, unknown>();
	try {
		const result = await sessionLike.transact(args, { awaitIrreversible: true, ...options });
		const txid = result.response?.transaction_id;

		if (options?.description) {
			console.log(options.description);
			if (options.description.includes("\n")) {
				console.log();
			}
		}

		const actions = getActions(args);
		const actionTraces = result.response?.processed?.action_traces || [];

		for (let i = 0; i < actions.length; i++) {
			const actionName = getActionName(actions[i]);
			const trace = actionTraces[i];
			const returnData = trace?.return_value_data;

			if (returnData) {
				const formatted = await formatActionResult(actionName, returnData, snapshots);
				if (formatted) {
					console.log(formatted);
				}
			}
		}

		console.log();
		console.log(`https://jungle4.unicove.com/en/jungle4/transaction/${txid}`);
		return { txid: String(txid), snapshots };
	} catch (err) {
		process.exitCode = printError(err);
		return { txid: "", snapshots };
	}
}

export async function transact(
	args: TransactArgs,
	options?: TransactOptions & { description?: string },
): Promise<TransactResult> {
	return runTransact(getSession(), args, options);
}

export { chain, client };
