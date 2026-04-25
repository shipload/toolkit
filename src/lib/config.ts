import { existsSync, readFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join, resolve } from "node:path";
import { parse as parseIni } from "ini";

export class ConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ConfigError";
	}
}

export interface PlayerConfig {
	privateKey: string;
	actor: string;
	permission: string;
	/** Absolute path of the config file this was loaded from. */
	source: string;
	/** Whether to auto-resolve completed tasks after waiting. Defaults to false. */
	autoResolve: boolean;
}

export interface LoadConfigOptions {
	/** Override the platform user config dir (used by tests). */
	userConfigDir?: string;
	/** Override cwd (used by tests). */
	cwd?: string;
}

/**
 * Returns the platform-standard user config directory for the `shipload` app.
 * - Windows: %APPDATA%\shipload
 * - macOS/Linux: $XDG_CONFIG_HOME/shipload OR ~/.config/shipload
 */
export function getUserConfigDir(): string {
	if (platform() === "win32") {
		const appData = process.env.APPDATA;
		if (appData) return join(appData, "shipload");
		return join(homedir(), "AppData", "Roaming", "shipload");
	}
	const xdg = process.env.XDG_CONFIG_HOME;
	if (xdg) return join(xdg, "shipload");
	return join(homedir(), ".config", "shipload");
}

interface ParsedSection {
	privateKey?: string;
	actor?: string;
	permission?: string;
	autoResolve?: boolean;
}

function parseBool(v: unknown): boolean | undefined {
	if (v === undefined || v === null) return undefined;
	if (typeof v === "boolean") return v;
	const s = String(v).trim().toLowerCase();
	if (s === "true" || s === "yes" || s === "1") return true;
	if (s === "false" || s === "no" || s === "0") return false;
	return undefined;
}

function parseIniFile(path: string): ParsedSection {
	const contents = readFileSync(path, "utf8");
	const parsed = parseIni(contents) as Record<string, unknown>;
	const section = (parsed.default ?? parsed) as Record<string, unknown>;
	return {
		privateKey: section.private_key as string | undefined,
		actor: section.actor as string | undefined,
		permission: section.permission as string | undefined,
		autoResolve: parseBool(section.auto_resolve),
	};
}

export function loadConfig(options: LoadConfigOptions = {}): PlayerConfig {
	const cwd = options.cwd ?? process.cwd();
	const userConfigDir = options.userConfigDir ?? getUserConfigDir();
	const cwdPath = resolve(cwd, "config.ini");
	const userPath = join(userConfigDir, "config.ini");
	const explicitPath = process.env.PLAYER_CONFIG ? resolve(process.env.PLAYER_CONFIG) : null;

	if (explicitPath && !existsSync(explicitPath)) {
		throw new ConfigError(
			`$PLAYER_CONFIG is set to ${explicitPath}, but that file does not exist.`,
		);
	}

	// Search in precedence order. Credentials only come from files — never env vars.
	const candidates: string[] = [];
	if (explicitPath) candidates.push(explicitPath);
	candidates.push(cwdPath);
	candidates.push(userPath);

	let fileData: ParsedSection | null = null;
	let source: string | null = null;
	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			fileData = parseIniFile(candidate);
			source = candidate;
			break;
		}
	}

	if (!fileData || !source) {
		throw new ConfigError(
			[
				"No config.ini found. Searched:",
				explicitPath
					? `  - $PLAYER_CONFIG=${explicitPath}`
					: "  - $PLAYER_CONFIG (not set)",
				`  - ${cwdPath}`,
				`  - ${userPath}`,
				"",
				"Run `shiploadcli init` to create one at the user config directory.",
			].join("\n"),
		);
	}

	if (!fileData.privateKey) {
		throw new ConfigError(
			`Missing 'private_key' in ${source}. Run \`shiploadcli init --force\` to regenerate, or edit the file directly.`,
		);
	}
	if (!fileData.actor) {
		throw new ConfigError(
			`Missing 'actor' in ${source}. Run \`shiploadcli init --force\` to regenerate, or edit the file directly.`,
		);
	}

	return {
		privateKey: fileData.privateKey,
		actor: fileData.actor,
		permission: fileData.permission ?? "active",
		autoResolve: fileData.autoResolve ?? false,
		source,
	};
}
