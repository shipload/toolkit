import {expect, test} from "bun:test";
import {setConfigKeys} from "./config-write";

test("adds a key to an empty file", () => {
	const result = setConfigKeys("", {server_permission: "shipload"});
	expect(result).toBe("server_permission = shipload\n");
});

test("adds a key with no explicit [default] header, before other sections", () => {
	const text = "actor = a\nprivate_key = PVT_K1_x\n\n[track]\ndefault_sort = eta\n";
	const result = setConfigKeys(text, {server_permission: "shipload"});
	expect(result).toBe(
		"actor = a\nprivate_key = PVT_K1_x\nserver_permission = shipload\n\n[track]\ndefault_sort = eta\n",
	);
});

test("adds a key to an explicit [default] section without touching others", () => {
	const text = "[default]\nactor = a\n\n[track]\ndefault_sort = eta\n";
	const result = setConfigKeys(text, {platform_permission: "shipload.nex"});
	expect(result).toBe(
		"[default]\nactor = a\nplatform_permission = shipload.nex\n\n[track]\ndefault_sort = eta\n",
	);
});

test("updates an existing key in place", () => {
	const text = "[default]\nactor = a\nserver_permission = old\n";
	const result = setConfigKeys(text, {server_permission: "shipload"});
	expect(result).toBe("[default]\nactor = a\nserver_permission = shipload\n");
});

test("removes a key when the value is undefined", () => {
	const text = "[default]\nactor = a\nplatform_permission = shipload.nex\n";
	const result = setConfigKeys(text, {platform_permission: undefined});
	expect(result).toBe("[default]\nactor = a\n");
});

test("removing a key that is not present is a no-op", () => {
	const text = "[default]\nactor = a\n";
	const result = setConfigKeys(text, {platform_permission: undefined});
	expect(result).toBe("[default]\nactor = a\n");
});
