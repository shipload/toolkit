import type { Command } from "commander";
import { formatOutput } from "../../lib/format";
import { getAccountName, getPublicKey, getSession } from "../../lib/session";

export interface WhoamiInfo {
	actor: string;
	permission: string;
	publicKey: string;
}

export function render(info: WhoamiInfo): string {
	return [
		`Actor:      ${info.actor}`,
		`Permission: ${info.permission}`,
		`PublicKey:  ${info.publicKey}`,
	].join("\n");
}

export function register(program: Command): void {
	program
		.command("whoami")
		.description("Show session actor, permission, and public key")
		.option("--json", "emit JSON instead of formatted text")
		.action((opts: { json?: boolean }) => {
			const data: WhoamiInfo = {
				actor: getAccountName(),
				permission: String(getSession().permission),
				publicKey: String(getPublicKey()),
			};
			console.log(formatOutput(data, { json: Boolean(opts.json) }, render));
		});
}
