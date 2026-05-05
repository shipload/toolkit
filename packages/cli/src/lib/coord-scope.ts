import { type Command, CommanderError } from "commander";
import { parseInt64 } from "./args";
import { withValidation } from "./errors";
import { ValidationError } from "./validate";

export interface CoordContext {
	x: bigint;
	y: bigint;
}

export interface CoordSubcommand {
	name: string;
	description: string;
	build: (ctx: CoordContext) => Command;
}

const REGISTRY: CoordSubcommand[] = [];

export function registerCoordSubcommand(sub: CoordSubcommand): void {
	if (REGISTRY.some((s) => s.name === sub.name)) {
		throw new Error(`Duplicate coord subcommand: ${sub.name}`);
	}
	REGISTRY.push(sub);
}

export function listCoordSubcommands(): CoordSubcommand[] {
	return REGISTRY.slice();
}

export function resetCoordRegistryForTesting(): void {
	REGISTRY.length = 0;
}

export interface CoordDispatchOptions {
	defaultAction: (ctx: CoordContext, remaining: string[]) => Promise<void> | void;
}

function isBenignCommanderError(err: unknown): err is CommanderError {
	return (
		err instanceof CommanderError &&
		(err.code === "commander.helpDisplayed" ||
			err.code === "commander.help" ||
			err.code === "commander.version")
	);
}

export async function dispatchCoordScope(
	ctx: CoordContext,
	remaining: string[],
	opts: CoordDispatchOptions,
): Promise<void> {
	const firstNonFlag = remaining.find((a) => !a.startsWith("-"));
	const sub = firstNonFlag ? REGISTRY.find((s) => s.name === firstNonFlag) : undefined;
	try {
		if (!sub) {
			await opts.defaultAction(ctx, remaining);
			return;
		}
		const subArgs = remaining.filter((a) => a !== firstNonFlag);
		const cmd = sub.build(ctx);
		cmd.exitOverride();
		await cmd.parseAsync(subArgs, { from: "user" });
	} catch (err) {
		if (isBenignCommanderError(err)) return;
		if (err instanceof CommanderError) process.exit(err.exitCode ?? 1);
		throw err;
	}
}

export function printCoordScopeHelp(x: bigint, y: bigint, defaultHelp: string): string {
	const subs = listCoordSubcommands();
	const lines = [
		`Usage: shiploadcli location ${x} ${y} [action] [args]`,
		"",
		"Show resource summary for the system when no action is given, otherwise run an action.",
		"",
		defaultHelp,
		"",
	];
	if (subs.length > 0) {
		lines.push("Available actions:");
		const widest = subs.reduce((w, s) => Math.max(w, s.name.length), 0);
		for (const s of subs) {
			lines.push(`  ${s.name.padEnd(widest)}  ${s.description}`);
		}
	}
	return lines.join("\n");
}

export function buildCoordParent(
	program: Command,
	defaultAction: CoordDispatchOptions["defaultAction"],
): Command {
	return program
		.command("location")
		.description(
			"location operations: `location <x> <y>` shows the system; `location <x> <y> <action> [args]` runs an action.",
		)
		.helpOption(false)
		.allowUnknownOption(true)
		.allowExcessArguments(true)
		.argument("<x>", "x coordinate", parseInt64)
		.argument("<y>", "y coordinate", parseInt64)
		.action(async (x: bigint, y: bigint, _opts: unknown, cmd: Command) => {
			const remaining = cmd.args.slice(2);
			await withValidation(() =>
				dispatchCoordScope({ x, y }, remaining, { defaultAction }),
			);
		});
}
