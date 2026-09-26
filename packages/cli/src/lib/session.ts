import { decodeWindowReceipt, type Projectable, schedule, ServerTypes } from "@shipload/sdk";
import { type ABI, Bytes, PermissionLevel, PrivateKey, type PublicKey } from "@wharfkit/antelope";
import {
	Action,
	type AnyAction,
	Session,
	type TransactArgs,
	type TransactOptions,
} from "@wharfkit/session";
import { WalletPluginPrivateKey } from "@wharfkit/wallet-plugin-privatekey";
import { chain, client, platform, server } from "./client";
import { buildSigningLink } from "./auth/signing-link";
import { hasKeyFile, keyFilePath, readKeyFile } from "./auth/keyfile";
import { unicoveTransactionUrl } from "./unicove";
import { ConfigError, loadConfig, type PlayerConfig } from "./config";
import { extractChainError, printError } from "./errors";
import {
	formatCancelResults,
	formatDuration,
	formatResolveAllResults,
	formatResolveResults,
	formatWindowReceipt,
} from "./format";
import { getEntitySnapshot } from "./snapshot";
import type { ProposeOptions } from "./msig/options";
import { proposeTransaction } from "./msig/propose";

let cachedActor: string | null = null;
let cachedPublicKey: PublicKey | null = null;
const cachedSessionsByPermission = new Map<string, Session>();

function resolveSigningKey(config: PlayerConfig): PrivateKey {
	if (config.privateKey) return PrivateKey.from(config.privateKey);
	if (hasKeyFile(config.actor)) return readKeyFile(config.actor);
	throw new ConfigError(
		`No private_key in ${config.source} and no key file at ${keyFilePath(config.actor)}; run \`shiploadcli auth create\`.`,
	);
}

function sessionForPermission(permission: string): Session {
	let session = cachedSessionsByPermission.get(permission);
	if (session) return session;
	const config = loadConfig();
	const key = resolveSigningKey(config);
	if (!cachedActor) {
		cachedActor = config.actor;
		cachedPublicKey = key.toPublic();
	}
	session = new Session(
		{
			chain,
			actor: config.actor,
			permission,
			walletPlugin: new WalletPluginPrivateKey(String(key)),
		},
		{ fetch },
	);
	cachedSessionsByPermission.set(permission, session);
	return session;
}

export function getSession(): Session {
	return sessionForPermission(loadConfig().permission);
}

export function getAccountName(): string {
	getSession();
	return cachedActor as string;
}

export function getPublicKey(): PublicKey {
	getSession();
	return cachedPublicKey as PublicKey;
}

const TASK_RESULT_ACTIONS = [
	"travel",
	"grouptravel",
	"load",
	"unload",
	"recharge",
	"gather",
	"craft",
	"blend",
	"warp",
	"wrap",
	"addmodule",
	"rmmodule",
];
const DEPLOY_ACTIONS = ["deploy"];
const CLAIM_ACTIONS = ["claimplot"];
const RESOLVE_ACTIONS = ["resolve"];
const RESOLVEALL_ACTIONS = ["resolveall"];
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

function getActionAccount(action: Action | AnyAction): string {
	if (action instanceof Action) {
		return action.account.toString();
	}
	return String(action.account);
}

function withAuthorization(action: Action | AnyAction, authorization: PermissionLevel[]): Action | AnyAction {
	const data = action.data as { hexString?: string } | undefined;
	if (typeof data?.hexString === "string") {
		return Action.from({
			account: String(action.account),
			name: String(action.name),
			authorization,
			data: Bytes.from(data.hexString),
		});
	}
	return { ...action, authorization };
}

function isFullKeyPermission(permission: string): boolean {
	return permission === "active" || permission === "owner";
}

type SigningDecision =
	| { kind: "direct" }
	| { kind: "restricted"; permission: string }
	| { kind: "link" };

/** Picks full-key, one restricted permission, or a signing-link handoff for a mixed/uncovered permission. */
function decideSigning(config: PlayerConfig, actions: (Action | AnyAction)[]): SigningDecision {
	if (isFullKeyPermission(config.permission)) return { kind: "direct" };
	const permissions = new Set<string>();
	for (const action of actions) {
		const account = getActionAccount(action);
		if (account === config.atomicAssetsContract) return { kind: "link" };
		if (account === config.gameContract) {
			permissions.add(config.permission);
			continue;
		}
		if (account === config.platformContract) {
			if (!config.platformPermission) return { kind: "link" };
			permissions.add(config.platformPermission);
			continue;
		}
		return { kind: "link" };
	}
	if (permissions.size !== 1) return { kind: "link" };
	const [permission] = permissions;
	return { kind: "restricted", permission };
}

function abiLookup(account: string): ABI | undefined {
	if (account === server.account.toString()) return server.abi;
	if (account === platform.account.toString()) return platform.abi;
	return undefined;
}

async function formatTaskAddition(
	entityType: string,
	entityId: bigint,
	addedCount: number,
	snapshots: Map<string, unknown>,
): Promise<string> {
	const taskWord = addedCount === 1 ? "task" : "tasks";
	try {
		const snap = await getEntitySnapshot(entityId);
		snapshots.set(String(entityId), snap);
		const projectable = snap as unknown as Projectable;
		const totalTasks = schedule.orderedTasks(projectable).length;
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
	if (DEPLOY_ACTIONS.includes(actionName)) {
		const results = ServerTypes.task_results.from(returnData);
		const lines = results.entities.map(
			(e) => `Deployed ${e.entity_type.toString()} ${e.entity_id.toString()}.`,
		);
		return lines.length > 0 ? lines.join("\n") : null;
	}
	if (CLAIM_ACTIONS.includes(actionName)) {
		const results = ServerTypes.task_results.from(returnData);
		const lines = results.entities.map(
			(e) => `Claimed ${e.entity_type.toString()} ${e.entity_id.toString()}.`,
		);
		return lines.length > 0 ? lines.join("\n") : null;
	}
	if (RESOLVE_ACTIONS.includes(actionName)) {
		const results = ServerTypes.resolve_results.from(returnData);
		return formatResolveResults(results);
	}
	if (RESOLVEALL_ACTIONS.includes(actionName)) {
		const results = ServerTypes.resolveall_results.from(returnData);
		return formatResolveAllResults(results);
	}
	if (CANCEL_ACTIONS.includes(actionName)) {
		const results = ServerTypes.cancel_results.from(returnData);
		return formatCancelResults(results);
	}
	if (actionName === "craftjob") {
		return formatWindowReceipt(decodeWindowReceipt(returnData), new Date());
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

export async function performTransact(
	sessionLike: SessionLike,
	args: TransactArgs,
	options?: TransactOptions & { description?: string },
): Promise<TransactResult> {
	const snapshots = new Map<string, unknown>();
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
	const url = unicoveTransactionUrl(chain.id.toString(), String(txid));
	if (url) console.log(url);
	return { txid: String(txid), snapshots };
}

export async function transact(
	args: TransactArgs,
	options?: TransactOptions & {
		description?: string;
		errorHint?: (msg: string) => string | undefined | Promise<string | undefined>;
		propose?: ProposeOptions | null;
	},
): Promise<TransactResult> {
	try {
		if (options?.propose) {
			if (options.description) console.log(options.description);
			const result = await proposeTransaction(getSession(), args, options.propose);
			return { txid: result.txid, snapshots: new Map() };
		}
		const config = loadConfig();
		const actions = getActions(args);
		const decision = actions.length > 0 ? decideSigning(config, actions) : { kind: "direct" as const };
		if (decision.kind === "link") {
			if (options?.description) console.log(options.description);
			const authorization = [PermissionLevel.from(`${config.actor}@active`)];
			const linked = actions.map((action) => withAuthorization(action, authorization));
			const { url, summary } = await buildSigningLink(chain.id.toString(), linked, abiLookup);
			console.log();
			console.log("This needs a signature this CLI's restricted key cannot provide. Sign it with your wallet:");
			console.log();
			console.log(url);
			console.log();
			for (const line of summary) console.log(line);
			return { txid: "", snapshots: new Map() };
		}
		if (decision.kind === "restricted") {
			return await performTransact(sessionForPermission(decision.permission), args, options);
		}
		return await performTransact(getSession(), args, options);
	} catch (err) {
		const exitCode = printError(err);
		if (options?.errorHint) {
			const hint = await options.errorHint(extractChainError(err));
			if (hint) console.error(`Context: ${hint}`);
		}
		process.exitCode = exitCode;
		return { txid: "", snapshots: new Map() };
	}
}

export async function transactStrict(
	args: TransactArgs,
	options?: TransactOptions & { description?: string },
): Promise<TransactResult> {
	try {
		return await performTransact(getSession(), args, options);
	} catch (err) {
		throw new Error(extractChainError(err));
	}
}

export { chain, client };
