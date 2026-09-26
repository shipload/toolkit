import {chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {PrivateKey} from "@wharfkit/antelope";
import {getUserConfigDir} from "../config";

export function keyFilePath(account: string): string {
	return join(getUserConfigDir(), "keys", `${account}.key`);
}

export function hasKeyFile(account: string): boolean {
	return existsSync(keyFilePath(account));
}

export function readKeyFile(account: string): PrivateKey {
	const text = readFileSync(keyFilePath(account), "utf8").trim();
	return PrivateKey.from(text);
}

export function writeKeyFile(account: string, key: PrivateKey): string {
	const path = keyFilePath(account);
	mkdirSync(dirname(path), {recursive: true, mode: 0o700});
	writeFileSync(path, `${String(key)}\n`, {mode: 0o600});
	chmodSync(path, 0o600);
	return path;
}

export interface LoadedKey {
	key: PrivateKey;
	path: string;
	/** True when an existing key file was reused instead of a fresh key being generated. */
	reused: boolean;
}

/** Reuse the account's stored key if one exists, otherwise generate and store a fresh K1 key. */
export function loadOrCreateKey(account: string): LoadedKey {
	if (hasKeyFile(account)) {
		return {key: readKeyFile(account), path: keyFilePath(account), reused: true};
	}
	const key = PrivateKey.generate("K1");
	const path = writeKeyFile(account, key);
	return {key, path, reused: false};
}
