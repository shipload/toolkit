import { PrivateKey, type PublicKey } from "@wharfkit/antelope";
import {
	Action,
	type AnyAction,
	Session,
	type TransactArgs,
	type TransactOptions,
} from "@wharfkit/session";
import { WalletPluginPrivateKey } from "@wharfkit/wallet-plugin-privatekey";
import { Types } from "../contracts/server";
import { chain, client } from "./client";
import { loadConfig } from "./config";
import { printError } from "./errors";
import { formatCancelResults, formatResolveResults, formatTaskResults } from "./format";

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

function formatActionResult(actionName: string, returnData: unknown): string | null {
	if (TASK_RESULT_ACTIONS.includes(actionName)) {
		const results = Types.task_results.from(returnData);
		return formatTaskResults(results);
	}
	if (RESOLVE_ACTIONS.includes(actionName)) {
		const results = Types.resolve_results.from(returnData);
		return formatResolveResults(results);
	}
	if (CANCEL_ACTIONS.includes(actionName)) {
		const results = Types.cancel_results.from(returnData);
		return formatCancelResults(results);
	}
	return null;
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
): Promise<string> {
	try {
		const result = await sessionLike.transact(args, options);
		const txid = result.response?.transaction_id;

		if (options?.description) {
			console.log(options.description);
		}

		const actions = getActions(args);
		const actionTraces = result.response?.processed?.action_traces || [];

		for (let i = 0; i < actions.length; i++) {
			const actionName = getActionName(actions[i]);
			const trace = actionTraces[i];
			const returnData = trace?.return_value_data;

			if (returnData) {
				const formatted = formatActionResult(actionName, returnData);
				if (formatted) {
					console.log(formatted);
				}
			}
		}

		console.log();
		console.log(`https://jungle4.unicove.com/en/jungle4/transaction/${txid}`);
		await new Promise((resolve) => setTimeout(resolve, 2000));
		return String(txid);
	} catch (err) {
		process.exitCode = printError(err);
		return "";
	}
}

export async function transact(
	args: TransactArgs,
	options?: TransactOptions & { description?: string },
): Promise<string> {
	return runTransact(getSession(), args, options);
}

export { chain, client };
