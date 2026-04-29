import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	ConfigError,
	getChainUrl,
	getHistoryUrl,
	getIndexerUrl,
	loadConfig,
} from "../../src/lib/config";

describe("loadConfig", () => {
	let tmpDir: string;
	const origEnv = { ...process.env };
	const origCwd = process.cwd();

	beforeEach(() => {
		tmpDir = realpathSync(mkdtempSync(join(tmpdir(), "player-config-test-")));
		delete process.env.PLAYER_CONFIG;
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
		process.env = { ...origEnv };
		process.chdir(origCwd);
	});

	test("$PLAYER_CONFIG path overrides cwd and user dir", () => {
		const explicitPath = join(tmpDir, "explicit.ini");
		writeFileSync(explicitPath, "[default]\nprivate_key=PVT_K1_explicit\nactor=exactor\n");
		process.env.PLAYER_CONFIG = explicitPath;

		// Put a decoy in cwd to prove it's ignored.
		writeFileSync(
			join(tmpDir, "config.ini"),
			"[default]\nprivate_key=PVT_K1_decoy\nactor=decoy\n",
		);
		process.chdir(tmpDir);

		const cfg = loadConfig();
		expect(cfg.privateKey).toBe("PVT_K1_explicit");
		expect(cfg.actor).toBe("exactor");
		expect(cfg.permission).toBe("active");
		expect(cfg.source).toBe(explicitPath);
	});

	test("cwd config.ini used when $PLAYER_CONFIG is unset", () => {
		const cwdPath = join(tmpDir, "config.ini");
		writeFileSync(cwdPath, "[default]\nprivate_key=PVT_K1_cwd\nactor=cwdactor\n");
		process.chdir(tmpDir);

		const cfg = loadConfig({ userConfigDir: join(tmpDir, "nonexistent") });
		expect(cfg.privateKey).toBe("PVT_K1_cwd");
		expect(cfg.source).toBe(cwdPath);
	});

	test("user config dir used as last resort", () => {
		const userDir = join(tmpDir, "userdir");
		const userPath = join(userDir, "config.ini");
		mkdirSync(userDir, { recursive: true });
		writeFileSync(userPath, "[default]\nprivate_key=PVT_K1_userdir\nactor=useractor\n");
		// cwd deliberately has no config.ini
		process.chdir(tmpDir);

		const cfg = loadConfig({ userConfigDir: userDir });
		expect(cfg.privateKey).toBe("PVT_K1_userdir");
		expect(cfg.source).toBe(userPath);
	});

	test("permission defaults to 'active' when key is omitted", () => {
		const iniPath = join(tmpDir, "config.ini");
		writeFileSync(iniPath, "[default]\nprivate_key=PVT_K1_x\nactor=a\n");
		process.env.PLAYER_CONFIG = iniPath;

		const cfg = loadConfig();
		expect(cfg.permission).toBe("active");
	});

	test("honors explicit permission value from config file", () => {
		const iniPath = join(tmpDir, "config.ini");
		writeFileSync(iniPath, "[default]\nprivate_key=PVT_K1_x\nactor=a\npermission=owner\n");
		process.env.PLAYER_CONFIG = iniPath;

		const cfg = loadConfig();
		expect(cfg.permission).toBe("owner");
	});

	test("throws ConfigError listing all searched paths when no config file exists", () => {
		const userDir = join(tmpDir, "userdir-empty");
		process.chdir(tmpDir);
		expect(() => loadConfig({ userConfigDir: userDir })).toThrow(ConfigError);
		try {
			loadConfig({ userConfigDir: userDir });
		} catch (err) {
			expect(err).toBeInstanceOf(ConfigError);
			const message = (err as Error).message;
			expect(message).toContain(join(tmpDir, "config.ini"));
			expect(message).toContain(join(userDir, "config.ini"));
			expect(message).toContain("shiploadcli init");
		}
	});

	test("throws ConfigError when config file is missing private_key", () => {
		const iniPath = join(tmpDir, "config.ini");
		writeFileSync(iniPath, "[default]\nactor=a\n");
		process.env.PLAYER_CONFIG = iniPath;

		expect(() => loadConfig()).toThrow(ConfigError);
		try {
			loadConfig();
		} catch (err) {
			expect((err as Error).message).toContain("private_key");
		}
	});

	test("throws ConfigError when config file is missing actor", () => {
		const iniPath = join(tmpDir, "config.ini");
		writeFileSync(iniPath, "[default]\nprivate_key=PVT_K1_x\n");
		process.env.PLAYER_CONFIG = iniPath;

		expect(() => loadConfig()).toThrow(ConfigError);
		try {
			loadConfig();
		} catch (err) {
			expect((err as Error).message).toContain("actor");
		}
	});

	test("throws ConfigError when $PLAYER_CONFIG is set to a nonexistent path", () => {
		const missingPath = join(tmpDir, "does-not-exist.ini");
		process.env.PLAYER_CONFIG = missingPath;
		// Put a decoy config.ini in cwd and user dir — they must NOT be used.
		writeFileSync(
			join(tmpDir, "config.ini"),
			"[default]\nprivate_key=PVT_K1_decoy\nactor=decoy\n",
		);
		const userDir = join(tmpDir, "user");
		mkdirSync(userDir, { recursive: true });
		writeFileSync(
			join(userDir, "config.ini"),
			"[default]\nprivate_key=PVT_K1_decoy2\nactor=decoy2\n",
		);
		process.chdir(tmpDir);

		expect(() => loadConfig({ userConfigDir: userDir })).toThrow(ConfigError);
		try {
			loadConfig({ userConfigDir: userDir });
		} catch (err) {
			expect((err as Error).message).toContain("$PLAYER_CONFIG");
			expect((err as Error).message).toContain(missingPath);
			expect((err as Error).message).toContain("does not exist");
		}
	});

	test("indexer.url parsed when [indexer] section present", () => {
		const iniPath = join(tmpDir, "config.ini");
		writeFileSync(
			iniPath,
			"[default]\nprivate_key=PVT_K1_x\nactor=a\n\n[indexer]\nurl=https://idx.example.com\n",
		);
		process.env.PLAYER_CONFIG = iniPath;

		const cfg = loadConfig();
		expect(cfg.indexerUrl).toBe("https://idx.example.com");
	});

	test("indexerUrl is undefined when [indexer] section is absent", () => {
		const iniPath = join(tmpDir, "config.ini");
		writeFileSync(iniPath, "[default]\nprivate_key=PVT_K1_x\nactor=a\n");
		process.env.PLAYER_CONFIG = iniPath;

		const cfg = loadConfig();
		expect(cfg.indexerUrl).toBeUndefined();
	});

	test("getIndexerUrl throws ConfigError naming the section when missing", () => {
		const iniPath = join(tmpDir, "config.ini");
		writeFileSync(iniPath, "[default]\nprivate_key=PVT_K1_x\nactor=a\n");
		process.env.PLAYER_CONFIG = iniPath;

		expect(() => getIndexerUrl()).toThrow(ConfigError);
		try {
			getIndexerUrl();
		} catch (err) {
			expect((err as Error).message).toContain("[indexer]");
			expect((err as Error).message).toContain("url");
		}
	});

	test("getIndexerUrl returns the configured URL when present", () => {
		const iniPath = join(tmpDir, "config.ini");
		writeFileSync(
			iniPath,
			"[default]\nprivate_key=PVT_K1_x\nactor=a\n\n[indexer]\nurl=https://idx.example.com\n",
		);
		process.env.PLAYER_CONFIG = iniPath;

		expect(getIndexerUrl()).toBe("https://idx.example.com");
	});

	test("chain.url parsed when [chain] section present", () => {
		const iniPath = join(tmpDir, "config.ini");
		writeFileSync(
			iniPath,
			"[default]\nprivate_key=PVT_K1_x\nactor=a\n\n[chain]\nurl=https://jungle4.greymass.com\n",
		);
		process.env.PLAYER_CONFIG = iniPath;

		const cfg = loadConfig();
		expect(cfg.chainUrl).toBe("https://jungle4.greymass.com");
	});

	test("history.url parsed when [history] section present", () => {
		const iniPath = join(tmpDir, "config.ini");
		writeFileSync(
			iniPath,
			"[default]\nprivate_key=PVT_K1_x\nactor=a\n\n[history]\nurl=https://jungle4.roborovski.io\n",
		);
		process.env.PLAYER_CONFIG = iniPath;

		const cfg = loadConfig();
		expect(cfg.historyUrl).toBe("https://jungle4.roborovski.io");
	});

	test("chainUrl and historyUrl are undefined when sections absent", () => {
		const iniPath = join(tmpDir, "config.ini");
		writeFileSync(iniPath, "[default]\nprivate_key=PVT_K1_x\nactor=a\n");
		process.env.PLAYER_CONFIG = iniPath;

		const cfg = loadConfig();
		expect(cfg.chainUrl).toBeUndefined();
		expect(cfg.historyUrl).toBeUndefined();
	});

	test("getChainUrl throws ConfigError naming the section when missing", () => {
		const iniPath = join(tmpDir, "config.ini");
		writeFileSync(iniPath, "[default]\nprivate_key=PVT_K1_x\nactor=a\n");
		process.env.PLAYER_CONFIG = iniPath;

		expect(() => getChainUrl()).toThrow(ConfigError);
		try {
			getChainUrl();
		} catch (err) {
			expect((err as Error).message).toContain("[chain]");
			expect((err as Error).message).toContain("url");
		}
	});

	test("getHistoryUrl throws ConfigError naming the section when missing", () => {
		const iniPath = join(tmpDir, "config.ini");
		writeFileSync(iniPath, "[default]\nprivate_key=PVT_K1_x\nactor=a\n");
		process.env.PLAYER_CONFIG = iniPath;

		expect(() => getHistoryUrl()).toThrow(ConfigError);
		try {
			getHistoryUrl();
		} catch (err) {
			expect((err as Error).message).toContain("[history]");
			expect((err as Error).message).toContain("url");
		}
	});

	test("getChainUrl / getHistoryUrl return configured URLs when present", () => {
		const iniPath = join(tmpDir, "config.ini");
		writeFileSync(
			iniPath,
			"[default]\nprivate_key=PVT_K1_x\nactor=a\n\n[chain]\nurl=https://chain.example\n\n[history]\nurl=https://history.example\n",
		);
		process.env.PLAYER_CONFIG = iniPath;

		expect(getChainUrl()).toBe("https://chain.example");
		expect(getHistoryUrl()).toBe("https://history.example");
	});
});
