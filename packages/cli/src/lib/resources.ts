import { TransactPluginResourceProvider } from "@wharfkit/transact-plugin-resource-provider";
import { unicoveResourcesUrl } from "./unicove";

const JUNGLE4 = "73e4385a2708e6d7048834fbc1079f2fabb17b3c125b146af438971e90716c4d";
const VAULTA = "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906";

const POWERBOT: Record<string, string> = {
	[JUNGLE4]: "https://jungle4.powerbot.io",
	[VAULTA]: "https://powerbot.io",
};

export function resourceProviderPlugin(
	chainId: string,
	override?: string,
): TransactPluginResourceProvider {
	return new TransactPluginResourceProvider({
		...(override ? { endpoints: { [chainId]: override.replace(/\/+$/, "") } } : {}),
		allowFees: false,
	});
}

// Bun's fetch sends string bodies with no Content-Type, which some resource providers reject.
export function withJsonContentType(base: typeof fetch): typeof fetch {
	const wrapped = (input: RequestInfo | URL, init?: RequestInit) => {
		if (typeof init?.body !== "string") return base(input, init);
		const headers = new Headers(init.headers);
		if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
		return base(input, { ...init, headers });
	};
	return Object.assign(wrapped, base);
}

export function resourceRentalHint(chainId: string): string {
	const id = chainId.toLowerCase();
	const powerbot = POWERBOT[id]
		? `sign up for Powerbot at ${POWERBOT[id]}, a paid service that watches the account and tops up its CPU and NET automatically`
		: null;
	const unicove = unicoveResourcesUrl(id)
		? `rent CPU and NET directly from the network at ${unicoveResourcesUrl(id)}, which also manages staked resources on networks that support staking`
		: null;
	const options =
		powerbot && unicove
			? ` To keep going, the account owner can ${powerbot}. Or they can ${unicove}.`
			: powerbot || unicove
				? ` To keep going, the account owner can ${powerbot ?? unicove}.`
				: "";
	return `This transaction needs more CPU or NET than the account has. Free network resources could not cover it: the service was unavailable, or the account has used its daily free quota.${options} Otherwise, retry once the daily quota resets.`;
}
