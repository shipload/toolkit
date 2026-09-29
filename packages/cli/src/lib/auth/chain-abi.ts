import {ABI, type APIClient} from "@wharfkit/antelope";
import {client} from "../client";
import type {AbiLookup} from "./signing-link";

const fetched = new Map<string, Promise<ABI | undefined>>();

function fetchAbi(apiClient: APIClient, account: string): Promise<ABI | undefined> {
	let pending = fetched.get(account);
	if (!pending) {
		pending = apiClient.v1.chain
			.get_abi(account)
			.then((response) => (response.abi ? ABI.from(response.abi) : undefined))
			.catch(() => undefined);
		fetched.set(account, pending);
	}
	return pending;
}

/** Answers from the bundled ABIs first, then fetches any other contract's ABI from chain. */
export function withChainAbi(known: AbiLookup, apiClient: APIClient = client): AbiLookup {
	return async (account) => (await known(account)) ?? fetchAbi(apiClient, account);
}
