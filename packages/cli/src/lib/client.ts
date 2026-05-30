import { PlatformContract, ServerContract, Shipload } from "@shipload/sdk";
import { APIClient, type Checksum256, Name } from "@wharfkit/antelope";
import { ChainDefinition, TokenIdentifier } from "@wharfkit/common";
import { loadConfig, type PlayerConfig } from "./config";

let cfg: PlayerConfig | null = null;
try {
	cfg = loadConfig();
} catch {
	cfg = null;
}

export const gameContractName = cfg?.gameContract ?? "eon.shipload";
export const platformContractName = cfg?.platformContract ?? "nex.shipload";

export const chain = ChainDefinition.from({
	id: "73e4385a2708e6d7048834fbc1079f2fabb17b3c125b146af438971e90716c4d",
	url: cfg?.chainUrl ?? "https://jungle4.greymass.com",
	systemToken: TokenIdentifier.from({
		chain: "73e4385a2708e6d7048834fbc1079f2fabb17b3c125b146af438971e90716c4d",
		contract: "eosio.token",
		symbol: "4,EOS",
	}),
});

export const client = new APIClient({ url: chain.url });

export const server = new ServerContract.Contract({ client, account: Name.from(gameContractName) });
export const platform = new PlatformContract.Contract({ client, account: Name.from(platformContractName) });

let cachedGameSeed: Promise<Checksum256> | null = null;

export function getGameSeed(): Promise<Checksum256> {
	if (!cachedGameSeed) {
		cachedGameSeed = (async () => {
			const game = await platform.table("games").get(gameContractName);
			if (!game) throw new Error("Game not found");
			return game.config.seed;
		})();
	}
	return cachedGameSeed;
}

let cachedGameConfig: Promise<{ epochTimeSeconds: number; gameStart: Date }> | null = null;

export function getGameConfig(): Promise<{
	epochTimeSeconds: number;
	gameStart: Date;
}> {
	if (!cachedGameConfig) {
		cachedGameConfig = (async () => {
			const game = await platform.table("games").get(gameContractName);
			if (!game) throw new Error("Game not found");
			return {
				epochTimeSeconds: Number(game.config.epochtime),
				gameStart: new Date(game.config.start.toMilliseconds()),
			};
		})();
	}
	return cachedGameConfig;
}

let cachedShipload: Promise<Shipload> | null = null;

export function getShipload(): Promise<Shipload> {
	if (!cachedShipload) {
		cachedShipload = Shipload.load(chain, {
			client,
			platformContractName,
			serverContractName: gameContractName,
		});
	}
	return cachedShipload;
}
