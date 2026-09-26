import type {API, Action, PermissionLevel, PublicKeyType} from "@wharfkit/antelope";
import {buildLinkAuth, buildUpdateAuth} from "./actions";
import {mergeKeyIntoAuthority} from "./authority";

export function isWildcardLink(link: API.v1.AccountLinkedAction): boolean {
	const action = link.action === undefined || link.action === null ? "" : String(link.action);
	return action === "";
}

export interface PermissionLinkPlan {
	updateAuth?: Action;
	linkAuth?: Action;
	messages: string[];
}

/** Plan the updateauth/linkauth actions needed to put `pubkey` on `permission`, linked to `contract`. */
export function planPermissionLink(args: {
	actor: string;
	permission: string;
	parent: string;
	contract: string;
	pubkey: PublicKeyType;
	account: API.v1.AccountObject | undefined;
	authorization: PermissionLevel[];
}): PermissionLinkPlan {
	const messages: string[] = [];
	const existing = args.account?.permissions.find(
		(p: API.v1.AccountPermission) => String(p.perm_name) === args.permission,
	);
	const {authority, changed} = mergeKeyIntoAuthority(existing?.required_auth, args.pubkey);

	let updateAuth: Action | undefined;
	if (changed) {
		updateAuth = buildUpdateAuth(
			{account: args.actor, permission: args.permission, parent: args.parent, auth: authority},
			args.authorization,
		);
	} else {
		messages.push(`Permission '${args.permission}' already holds this key; no updateauth needed.`);
	}

	const linkedActions = existing?.linked_actions;
	const alreadyLinked =
		linkedActions?.some(
			(l: API.v1.AccountLinkedAction) => String(l.account) === args.contract && isWildcardLink(l),
		) ?? false;
	let linkAuth: Action | undefined;
	if (alreadyLinked) {
		messages.push(`Permission '${args.permission}' is already linked to ${args.contract}; no linkauth needed.`);
	} else {
		linkAuth = buildLinkAuth(
			{account: args.actor, code: args.contract, type: "", requirement: args.permission},
			args.authorization,
		);
	}

	return {updateAuth, linkAuth, messages};
}
