import {ABI, type ABIDef, Action, Authority, type NameType, type PermissionLevel} from "@wharfkit/antelope";

const EOSIO_AUTH_ABI_DEF: ABIDef = {
	version: "eosio::abi/1.2",
	types: [],
	structs: [
		{
			name: "key_weight",
			base: "",
			fields: [
				{name: "key", type: "public_key"},
				{name: "weight", type: "uint16"},
			],
		},
		{
			name: "permission_level",
			base: "",
			fields: [
				{name: "actor", type: "name"},
				{name: "permission", type: "name"},
			],
		},
		{
			name: "permission_level_weight",
			base: "",
			fields: [
				{name: "permission", type: "permission_level"},
				{name: "weight", type: "uint16"},
			],
		},
		{
			name: "wait_weight",
			base: "",
			fields: [
				{name: "wait_sec", type: "uint32"},
				{name: "weight", type: "uint16"},
			],
		},
		{
			name: "authority",
			base: "",
			fields: [
				{name: "threshold", type: "uint32"},
				{name: "keys", type: "key_weight[]"},
				{name: "accounts", type: "permission_level_weight[]"},
				{name: "waits", type: "wait_weight[]"},
			],
		},
		{
			name: "updateauth",
			base: "",
			fields: [
				{name: "account", type: "name"},
				{name: "permission", type: "name"},
				{name: "parent", type: "name"},
				{name: "auth", type: "authority"},
			],
		},
		{
			name: "deleteauth",
			base: "",
			fields: [
				{name: "account", type: "name"},
				{name: "permission", type: "name"},
			],
		},
		{
			name: "linkauth",
			base: "",
			fields: [
				{name: "account", type: "name"},
				{name: "code", type: "name"},
				{name: "type", type: "name"},
				{name: "requirement", type: "name"},
			],
		},
		{
			name: "unlinkauth",
			base: "",
			fields: [
				{name: "account", type: "name"},
				{name: "code", type: "name"},
				{name: "type", type: "name"},
			],
		},
	],
	actions: [
		{name: "updateauth", type: "updateauth", ricardian_contract: ""},
		{name: "deleteauth", type: "deleteauth", ricardian_contract: ""},
		{name: "linkauth", type: "linkauth", ricardian_contract: ""},
		{name: "unlinkauth", type: "unlinkauth", ricardian_contract: ""},
	],
	tables: [],
	ricardian_clauses: [],
};

export const EOSIO_AUTH_ABI = ABI.from(EOSIO_AUTH_ABI_DEF);

export function buildUpdateAuth(
	args: {account: NameType; permission: NameType; parent: NameType; auth: Authority},
	authorization: PermissionLevel[],
): Action {
	return Action.from(
		{
			account: "eosio",
			name: "updateauth",
			authorization,
			data: {
				account: args.account,
				permission: args.permission,
				parent: args.parent,
				auth: args.auth,
			},
		},
		EOSIO_AUTH_ABI_DEF,
	);
}

export function buildDeleteAuth(
	args: {account: NameType; permission: NameType},
	authorization: PermissionLevel[],
): Action {
	return Action.from(
		{
			account: "eosio",
			name: "deleteauth",
			authorization,
			data: {account: args.account, permission: args.permission},
		},
		EOSIO_AUTH_ABI_DEF,
	);
}

export function buildLinkAuth(
	args: {account: NameType; code: NameType; type: NameType; requirement: NameType},
	authorization: PermissionLevel[],
): Action {
	return Action.from(
		{
			account: "eosio",
			name: "linkauth",
			authorization,
			data: {
				account: args.account,
				code: args.code,
				type: args.type,
				requirement: args.requirement,
			},
		},
		EOSIO_AUTH_ABI_DEF,
	);
}

export function buildUnlinkAuth(
	args: {account: NameType; code: NameType; type: NameType},
	authorization: PermissionLevel[],
): Action {
	return Action.from(
		{
			account: "eosio",
			name: "unlinkauth",
			authorization,
			data: {account: args.account, code: args.code, type: args.type},
		},
		EOSIO_AUTH_ABI_DEF,
	);
}
