import { describe, expect, test } from "bun:test";
import { Command } from "commander";
import {
	dispatchEntityScope,
	listEntitySubcommands,
	registerEntitySubcommand,
	resetRegistryForTesting,
} from "../../src/lib/entity-scope";

describe("dispatchEntityScope", () => {
	test("with empty remaining args, calls the default show handler", async () => {
		resetRegistryForTesting();
		const calls: string[] = [];
		await dispatchEntityScope("ship", 1n, [], {
			defaultShow: async (type, id) => {
				calls.push(`show:${type}:${id}`);
			},
		});
		expect(calls).toEqual(["show:ship:1"]);
	});

	test("with subcommand name, builds and parses the subcommand", async () => {
		resetRegistryForTesting();
		const calls: string[] = [];
		registerEntitySubcommand({
			name: "demo",
			description: "demo subcommand",
			appliesTo: ["ship"],
			build: (ctx) =>
				new Command("demo")
					.argument("<x>", "x", (v) => Number.parseInt(v, 10))
					.action((x: number) => {
						calls.push(`demo:${ctx.entityType}:${ctx.entityId}:${x}`);
					}),
		});
		await dispatchEntityScope("ship", 1n, ["demo", "42"], {
			defaultShow: async () => {
				throw new Error("should not call show");
			},
		});
		expect(calls).toEqual(["demo:ship:1:42"]);
	});

	test("rejects subcommand for entity type not in appliesTo", async () => {
		resetRegistryForTesting();
		registerEntitySubcommand({
			name: "shiponly",
			description: "ship-only",
			appliesTo: ["ship"],
			build: () => new Command("shiponly").action(() => {}),
		});
		await expect(
			dispatchEntityScope("container", 1n, ["shiponly"], {
				defaultShow: async () => {},
			}),
		).rejects.toThrow(/not available for container/);
	});

	test("unknown subcommand surfaces a clear error", async () => {
		resetRegistryForTesting();
		await expect(
			dispatchEntityScope("ship", 1n, ["nope"], {
				defaultShow: async () => {},
			}),
		).rejects.toThrow(/unknown action 'nope'/i);
	});

	test("--help routes to scope help", async () => {
		resetRegistryForTesting();
		registerEntitySubcommand({
			name: "demo",
			description: "demo subcommand",
			appliesTo: ["ship"],
			build: () => new Command("demo").action(() => {}),
		});
		const captured: string[] = [];
		const orig = console.log;
		console.log = (s: string) => {
			captured.push(s);
		};
		try {
			await dispatchEntityScope("ship", 1n, ["--help"], {
				defaultShow: async () => {
					throw new Error("should not call show");
				},
			});
		} finally {
			console.log = orig;
		}
		const output = captured.join("\n");
		expect(output).toContain("Usage:");
		expect(output).toContain("demo");
	});
});

describe("registerEntitySubcommand", () => {
	test("rejects duplicate names", () => {
		resetRegistryForTesting();
		const sub = {
			name: "demo",
			description: "demo subcommand",
			appliesTo: ["ship"] as const,
			build: () => new Command("demo").action(() => {}),
		};
		registerEntitySubcommand({ ...sub, appliesTo: [...sub.appliesTo] });
		expect(() => registerEntitySubcommand({ ...sub, appliesTo: [...sub.appliesTo] })).toThrow(
			/Duplicate entity subcommand: demo/,
		);
	});
});

describe("listEntitySubcommands", () => {
	test("filters by appliesTo", () => {
		resetRegistryForTesting();
		registerEntitySubcommand({
			name: "ship-only",
			description: "ship-only action",
			appliesTo: ["ship"],
			build: () => new Command("ship-only").action(() => {}),
		});
		registerEntitySubcommand({
			name: "universal",
			description: "works everywhere",
			appliesTo: ["ship", "container", "warehouse"],
			build: () => new Command("universal").action(() => {}),
		});
		const result = listEntitySubcommands("container");
		expect(result.map((s) => s.name)).toEqual(["universal"]);
	});
});
