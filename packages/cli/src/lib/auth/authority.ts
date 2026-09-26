import {Authority, PublicKey, type PublicKeyType} from "@wharfkit/antelope";

export function singleKeyAuthority(key: PublicKeyType): Authority {
	return Authority.from({
		threshold: 1,
		keys: [{key: PublicKey.from(key), weight: 1}],
		accounts: [],
		waits: [],
	});
}

export function authorityHasKey(authority: Authority, key: PublicKeyType): boolean {
	const pub = PublicKey.from(key);
	return authority.keys.some((weight) => weight.key.equals(pub));
}

export interface AuthorityMergeResult {
	authority: Authority;
	changed: boolean;
}

/** Add `key` beside any existing keys at weight 1, threshold 1; a no-op if the key is already present. */
export function mergeKeyIntoAuthority(
	current: Authority | undefined,
	key: PublicKeyType,
): AuthorityMergeResult {
	const pub = PublicKey.from(key);
	if (!current) {
		return {authority: singleKeyAuthority(pub), changed: true};
	}
	if (authorityHasKey(current, pub)) {
		return {authority: current, changed: false};
	}
	const authority = Authority.from({
		threshold: 1,
		keys: [...current.keys, {key: pub, weight: 1}],
		accounts: current.accounts,
		waits: current.waits,
	});
	return {authority, changed: true};
}

/** Remove `key` from an authority, keeping its threshold and every other key/account/wait. */
export function removeKeyFromAuthority(current: Authority, key: PublicKeyType): Authority {
	const pub = PublicKey.from(key);
	return Authority.from({
		threshold: current.threshold,
		keys: current.keys.filter((weight) => !weight.key.equals(pub)),
		accounts: current.accounts,
		waits: current.waits,
	});
}

export function isAuthorityEmpty(authority: Authority): boolean {
	return authority.keys.length === 0 && authority.accounts.length === 0;
}
