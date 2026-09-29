import {deflateRawSync, inflateRawSync} from "node:zlib";
import type {ABI, Action, AnyAction} from "@wharfkit/antelope";
import {Bytes, Serializer} from "@wharfkit/antelope";
import {SigningRequest} from "@wharfkit/signing-request";
import {webappSignUrl} from "../webapp";

const zlib = {
	deflateRaw: (data: Uint8Array): Uint8Array => new Uint8Array(deflateRawSync(data)),
	inflateRaw: (data: Uint8Array): Uint8Array => new Uint8Array(inflateRawSync(data)),
};

export type AbiLookup = (account: string) => ABI | undefined | Promise<ABI | undefined>;

export interface SigningLinkResult {
	url: string;
	summary: string[];
}

function actionAccount(action: Action | AnyAction): string {
	return String((action as {account: unknown}).account);
}

function actionName(action: Action | AnyAction): string {
	return String((action as {name: unknown}).name);
}

async function describeAction(action: Action | AnyAction, abiLookup?: AbiLookup): Promise<string> {
	const label = `${actionAccount(action)}::${actionName(action)}`;
	const raw = (action as {data: unknown}).data;
	if (!Bytes.isBytes(raw)) return `${label} ${JSON.stringify(raw ?? null)}`;
	let abi: ABI | undefined;
	try {
		abi = await abiLookup?.(actionAccount(action));
	} catch {
		abi = undefined;
	}
	const type = abi?.getActionType(actionName(action));
	if (!abi || !type) return `${label} (could not load this contract's ABI, so the action data is not shown)`;
	try {
		const data = Serializer.objectify(Serializer.decode({data: Bytes.from(raw), type, abi}));
		return `${label} ${JSON.stringify(data)}`;
	} catch {
		return `${label} (the action data does not match this contract's ABI, so it is not shown)`;
	}
}

function summarizeActions(actions: (Action | AnyAction)[], abiLookup?: AbiLookup): Promise<string[]> {
	return Promise.all(actions.map((action) => describeAction(action, abiLookup)));
}

/** Build an ESR signing link for actions the CLI cannot sign itself, plus a plain-text decoded summary. */
export async function buildSigningLink(
	chainId: string,
	actions: (Action | AnyAction)[],
	abiLookup?: AbiLookup,
	webappUrl?: string,
): Promise<SigningLinkResult> {
	const request = await SigningRequest.create(
		{actions, chainId, broadcast: true},
		{zlib},
	);
	const esr = request.encode(true, false).slice(4);
	const url = webappSignUrl(chainId, esr, webappUrl);
	if (!url) throw new Error(`No Shipload webapp known for chain ${chainId}; set [webapp] url in config.ini`);
	return {url, summary: await summarizeActions(actions, abiLookup)};
}
