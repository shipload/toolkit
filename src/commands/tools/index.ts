import type { Command } from "commander";
import * as find from "./find";
import * as scan from "./scan";
import * as verifyTiers from "./verify-tiers";

export function register(program: Command): void {
	const tools = program.command("tools").description("Diagnostic and analysis tools");
	scan.registerSubcommand(tools);
	find.registerSubcommand(tools);
	verifyTiers.registerSubcommand(tools);
}
