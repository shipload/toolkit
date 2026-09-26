import {expect, test} from "bun:test";
import {Authority, PrivateKey} from "@wharfkit/antelope";
import {
	authorityHasKey,
	isAuthorityEmpty,
	mergeKeyIntoAuthority,
	removeKeyFromAuthority,
	singleKeyAuthority,
} from "./authority";

const KEY_A = PrivateKey.generate("K1").toPublic();
const KEY_B = PrivateKey.generate("K1").toPublic();

test("mergeKeyIntoAuthority creates a single-key authority when none exists", () => {
	const {authority, changed} = mergeKeyIntoAuthority(undefined, KEY_A);
	expect(changed).toBe(true);
	expect(authority.threshold.toNumber()).toBe(1);
	expect(authorityHasKey(authority, KEY_A)).toBe(true);
});

test("mergeKeyIntoAuthority adds the key beside existing keys at weight 1, threshold 1", () => {
	const existing = singleKeyAuthority(KEY_B);
	const {authority, changed} = mergeKeyIntoAuthority(existing, KEY_A);
	expect(changed).toBe(true);
	expect(authority.threshold.toNumber()).toBe(1);
	expect(authorityHasKey(authority, KEY_A)).toBe(true);
	expect(authorityHasKey(authority, KEY_B)).toBe(true);
	expect(authority.keys.find((k) => k.key.equals(KEY_A))?.weight.toNumber()).toBe(1);
});

test("mergeKeyIntoAuthority is a no-op when the key is already present", () => {
	const existing = singleKeyAuthority(KEY_A);
	const {authority, changed} = mergeKeyIntoAuthority(existing, KEY_A);
	expect(changed).toBe(false);
	expect(authority.keys.length).toBe(1);
});

test("mergeKeyIntoAuthority keeps existing accounts and waits", () => {
	const existing = Authority.from({
		threshold: 1,
		keys: [{key: KEY_B, weight: 1}],
		accounts: [{permission: {actor: "somemsig", permission: "active"}, weight: 1}],
		waits: [],
	});
	const {authority} = mergeKeyIntoAuthority(existing, KEY_A);
	expect(authority.accounts.length).toBe(1);
	expect(String(authority.accounts[0].permission.actor)).toBe("somemsig");
});

test("removeKeyFromAuthority drops only the given key", () => {
	const existing = Authority.from({
		threshold: 1,
		keys: [
			{key: KEY_A, weight: 1},
			{key: KEY_B, weight: 1},
		],
		accounts: [],
		waits: [],
	});
	const authority = removeKeyFromAuthority(existing, KEY_A);
	expect(authorityHasKey(authority, KEY_A)).toBe(false);
	expect(authorityHasKey(authority, KEY_B)).toBe(true);
});

test("isAuthorityEmpty is true once keys and accounts are both gone", () => {
	const existing = singleKeyAuthority(KEY_A);
	const authority = removeKeyFromAuthority(existing, KEY_A);
	expect(isAuthorityEmpty(authority)).toBe(true);
});

test("isAuthorityEmpty is false while an account weight remains", () => {
	const existing = Authority.from({
		threshold: 1,
		keys: [{key: KEY_A, weight: 1}],
		accounts: [{permission: {actor: "somemsig", permission: "active"}, weight: 1}],
		waits: [],
	});
	const authority = removeKeyFromAuthority(existing, KEY_A);
	expect(isAuthorityEmpty(authority)).toBe(false);
});
