import {deflateRawSync, inflateRawSync} from "node:zlib";
import type {ABI, Action, AnyAction} from "@wharfkit/antelope";
import {Bytes, Serializer} from "@wharfkit/antelope";
import {SigningRequest} from "@wharfkit/signing-request";
import {unicovePromptUrl} from "../unicove";

const zlib = {
	deflateRaw: (data: Uint8Array): Uint8Array => new Uint8Array(deflateRawSync(data)),
	inflateRaw: (data: Uint8Array): Uint8Array => new Uint8Array(inflateRawSync(data)),
};

export type AbiLookup = (account: string) => ABI | undefined;

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

function decodeActionData(action: Action | AnyAction, abiLookup?: AbiLookup): unknown {
	const abi = abiLookup?.(actionAccount(action));
	if (!abi) return "<encoded>";
	const type = abi.getActionType(actionName(action));
	const raw = (action as {data: unknown}).data;
	if (!type || !Bytes.isBytes(raw)) return raw ?? "<encoded>";
	try {
		return Serializer.objectify(Serializer.decode({data: Bytes.from(raw), type, abi}));
	} catch {
		return "<encoded>";
	}
}

function summarizeActions(actions: (Action | AnyAction)[], abiLookup?: AbiLookup): string[] {
	return actions.map((action) => {
		const data = decodeActionData(action, abiLookup);
		return `${actionAccount(action)}::${actionName(action)} ${JSON.stringify(data)}`;
	});
}

/** Build an ESR signing link for actions the CLI cannot sign itself, plus a plain-text decoded summary. */
export async function buildSigningLink(
	chainId: string,
	actions: (Action | AnyAction)[],
	abiLookup?: AbiLookup,
): Promise<SigningLinkResult> {
	const request = await SigningRequest.create(
		{actions, chainId, broadcast: true},
		{zlib},
	);
	const esr = request.encode(true, false).slice(4);
	const url = unicovePromptUrl(chainId, esr);
	if (!url) throw new Error(`No Unicove deployment known for chain ${chainId}`);
	return {url, summary: summarizeActions(actions, abiLookup)};
}
