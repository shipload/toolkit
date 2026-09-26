import {describe, expect, test} from "bun:test";
import {API} from "@wharfkit/antelope";
import {isWildcardLink} from "./plan";

describe("isWildcardLink", () => {
	test("a link nodeos reports without an action field is the wildcard", () => {
		const link = API.v1.AccountLinkedAction.from({account: "eon.shipload"});
		expect(isWildcardLink(link)).toBe(true);
	});

	test("a link to one named action is not the wildcard", () => {
		const link = API.v1.AccountLinkedAction.from({account: "eon.shipload", action: "join"});
		expect(isWildcardLink(link)).toBe(false);
	});
});
