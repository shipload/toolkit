import { type Command, CommanderError } from "commander";
import { type EntityTypeName, parseUint64 } from "./args";
import { withValidation } from "./errors";
import { ValidationError } from "./validate";

export interface EntityContext {
	entityType: EntityTypeName;
	entityId: bigint;
}

export interface EntitySubcommand {
	name: string;
	description: string;
	appliesTo: readonly EntityTypeName[];
	build: (ctx: EntityContext) => Command;
}

export interface DispatchOptions {
	defaultShow: (type: EntityTypeName, id: bigint) => Promise<void> | void;
}

const REGISTRY: EntitySubcommand[] = [];

export function registerEntitySubcommand(sub: EntitySubcommand): void {
	if (REGISTRY.some((s) => s.name === sub.name)) {
		throw new Error(`Duplicate entity subcommand: ${sub.name}`);
	}
	REGISTRY.push(sub);
}

export function listEntitySubcommands(type: EntityTypeName): EntitySubcommand[] {
	return REGISTRY.filter((s) => s.appliesTo.includes(type));
}

export function resetRegistryForTesting(): void {
	REGISTRY.length = 0;
}

export async function dispatchEntityScope(
	type: EntityTypeName,
	id: bigint,
	remaining: string[],
	opts: DispatchOptions,
): Promise<void> {
	if (remaining.length === 0) {
		await opts.defaultShow(type, id);
		return;
	}
	const [name, ...rest] = remaining;
	if (name === "--help" || name === "-h") {
		console.log(printScopeHelp(type, id));
		return;
	}
	const sub = REGISTRY.find((s) => s.name === name);
	if (!sub) {
		const available = listEntitySubcommands(type)
			.map((s) => s.name)
			.join(", ");
		const suggestion = available
			? `available actions for ${type}: ${available}`
			: `no actions are registered for ${type}`;
		throw new ValidationError(`unknown action '${name}' for ${type} ${id}`, suggestion);
	}
	if (!sub.appliesTo.includes(type)) {
		throw new ValidationError(
			`action '${name}' is not available for ${type}`,
			`applies to: ${sub.appliesTo.join(", ")}`,
		);
	}
	const cmd = sub.build({ entityType: type, entityId: id });
	cmd.exitOverride();
	try {
		// commander v14 `from: "user"` does NOT strip a leading program name, so pass
		// `rest` only — prepending `name` would make it an excess positional.
		await cmd.parseAsync(rest, { from: "user" });
	} catch (err) {
		if (err instanceof CommanderError) {
			if (
				err.code === "commander.helpDisplayed" ||
				err.code === "commander.help" ||
				err.code === "commander.version"
			) {
				return;
			}
			process.exit(err.exitCode ?? 1);
		}
		throw err;
	}
}

function printScopeHelp(type: EntityTypeName, id: bigint): string {
	const subs = listEntitySubcommands(type);
	const lines = [
		`Usage: shiploadcli ${type} ${id} [action] [args]`,
		"",
		`Show full state for ${type} ${id} when no action is given, otherwise run an action.`,
		"",
	];
	if (subs.length === 0) {
		lines.push("  (no actions registered)");
	} else {
		lines.push("Available actions:");
		const widest = subs.reduce((w, s) => Math.max(w, s.name.length), 0);
		for (const s of subs) {
			lines.push(`  ${s.name.padEnd(widest)}  ${s.description}`);
		}
	}
	return lines.join("\n");
}

export function buildEntityParent(
	program: Command,
	type: EntityTypeName,
	defaultShow: DispatchOptions["defaultShow"],
): void {
	program
		.command(type)
		.description(
			`${type} operations: \`${type} <id>\` shows state; \`${type} <id> <action> [args]\` runs an action.`,
		)
		.helpOption(false)
		.allowUnknownOption(true)
		.allowExcessArguments(true)
		.argument("<id>", `${type} id`, parseUint64)
		.action(async (id: bigint, _opts: unknown, cmd: Command) => {
			await withValidation(() =>
				dispatchEntityScope(type, id, cmd.args.slice(1), { defaultShow }),
			);
		});
}

export function buildGenericEntityParent(
	program: Command,
	parseEntityType: (v: string) => EntityTypeName,
	defaultShow: DispatchOptions["defaultShow"],
): void {
	program
		.command("entity")
		.description(
			"Generic entity ops: `entity <type> <id>` shows state; append an action to run it.",
		)
		.helpOption(false)
		.allowUnknownOption(true)
		.allowExcessArguments(true)
		.argument("<type>", "entity type (ship/container/warehouse)", parseEntityType)
		.argument("<id>", "entity id", parseUint64)
		.action(async (type: EntityTypeName, id: bigint, _opts: unknown, cmd: Command) => {
			await withValidation(() =>
				dispatchEntityScope(type, id, cmd.args.slice(2), { defaultShow }),
			);
		});
}
