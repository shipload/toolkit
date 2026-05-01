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

export type TrackSortMode = "type+id" | "status" | "eta" | "name";
export type TrackTypeFilter = "all" | "ship" | "container" | "warehouse";
export type TrackStatusFilter = "all" | "busy" | "resolvable" | "idle";

export interface TrackConfig {
	defaultSort: TrackSortMode;
	defaultTypeFilter: TrackTypeFilter;
	defaultStatusFilter: TrackStatusFilter;
}

export interface PlayerConfig {
	privateKey: string;
	actor: string;
	permission: string;
	/** Absolute path of the config file this was loaded from. */
	source: string;
	/** Whether to auto-resolve completed tasks after waiting. Defaults to false. */
	autoResolve: boolean;
	indexerUrl?: string;
	chainUrl?: string;
	historyUrl?: string;
	track: TrackConfig;
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
	indexerUrl?: string;
	chainUrl?: string;
	historyUrl?: string;
	trackDefaultSort?: string;
	trackDefaultTypeFilter?: string;
	trackDefaultStatusFilter?: string;
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
	const indexer = (parsed.indexer ?? {}) as Record<string, unknown>;
	const chain = (parsed.chain ?? {}) as Record<string, unknown>;
	const history = (parsed.history ?? {}) as Record<string, unknown>;
	const track = (parsed.track ?? {}) as Record<string, unknown>;
	return {
		privateKey: section.private_key as string | undefined,
		actor: section.actor as string | undefined,
		permission: section.permission as string | undefined,
		autoResolve: parseBool(section.auto_resolve),
		indexerUrl: indexer.url as string | undefined,
		chainUrl: chain.url as string | undefined,
		historyUrl: history.url as string | undefined,
		trackDefaultSort: track.default_sort as string | undefined,
		trackDefaultTypeFilter: track.default_type_filter as string | undefined,
		trackDefaultStatusFilter: track.default_status_filter as string | undefined,
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

	const track: TrackConfig = {
		defaultSort: parseTrackSort(fileData.trackDefaultSort, source),
		defaultTypeFilter: parseTrackTypeFilter(fileData.trackDefaultTypeFilter, source),
		defaultStatusFilter: parseTrackStatusFilter(fileData.trackDefaultStatusFilter, source),
	};

	return {
		privateKey: fileData.privateKey,
		actor: fileData.actor,
		permission: fileData.permission ?? "active",
		autoResolve: fileData.autoResolve ?? false,
		indexerUrl: fileData.indexerUrl,
		chainUrl: fileData.chainUrl,
		historyUrl: fileData.historyUrl,
		track,
		source,
	};
}

export function getIndexerUrl(): string {
	const cfg = loadConfig();
	if (!cfg.indexerUrl) {
		throw new ConfigError(
			[
				"Missing [indexer] url in config.ini.",
				"",
				`Add to ${cfg.source}:`,
				"",
				"  [indexer]",
				"  url = https://your-shiploadindex-host",
				"",
				"This is required for `shiploadcli history` and any entity history subcommand.",
			].join("\n"),
		);
	}
	return cfg.indexerUrl;
}

export function getChainUrl(): string {
	const cfg = loadConfig();
	if (!cfg.chainUrl) {
		throw new ConfigError(
			[
				"Missing [chain] url in config.ini.",
				"",
				`Add to ${cfg.source}:`,
				"",
				"  [chain]",
				"  url = https://jungle4.greymass.com",
				"",
				"This is required for `shiploadcli debug entity`, `debug code`, and `debug setcodes` (cross-check).",
			].join("\n"),
		);
	}
	return cfg.chainUrl;
}

const SORT_VALUES: TrackSortMode[] = ["type+id", "status", "eta", "name"];
const TYPE_VALUES: TrackTypeFilter[] = ["all", "ship", "container", "warehouse"];
const STATUS_VALUES: TrackStatusFilter[] = ["all", "busy", "resolvable", "idle"];

function parseTrackSort(v: string | undefined, source: string): TrackSortMode {
	if (v === undefined) return "type+id";
	if ((SORT_VALUES as string[]).includes(v)) return v as TrackSortMode;
	throw new ConfigError(
		`Invalid [track] default_sort=${v} in ${source}; must be one of ${SORT_VALUES.join(", ")}`,
	);
}

function parseTrackTypeFilter(v: string | undefined, source: string): TrackTypeFilter {
	if (v === undefined) return "all";
	if ((TYPE_VALUES as string[]).includes(v)) return v as TrackTypeFilter;
	throw new ConfigError(
		`Invalid [track] default_type_filter=${v} in ${source}; must be one of ${TYPE_VALUES.join(", ")}`,
	);
}

function parseTrackStatusFilter(v: string | undefined, source: string): TrackStatusFilter {
	if (v === undefined) return "all";
	if ((STATUS_VALUES as string[]).includes(v)) return v as TrackStatusFilter;
	throw new ConfigError(
		`Invalid [track] default_status_filter=${v} in ${source}; must be one of ${STATUS_VALUES.join(", ")}`,
	);
}

export function getHistoryUrl(): string {
	const cfg = loadConfig();
	if (!cfg.historyUrl) {
		throw new ConfigError(
			[
				"Missing [history] url in config.ini.",
				"",
				`Add to ${cfg.source}:`,
				"",
				"  [history]",
				"  url = https://jungle4.roborovski.io",
				"",
				"This is required for `shiploadcli debug actions`, `debug setcodes`, and `debug trace`.",
			].join("\n"),
		);
	}
	return cfg.historyUrl;
}
