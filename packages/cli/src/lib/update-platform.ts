export interface PlatformAsset {
	name: string;
	entryInZip: string | null;
}

export function platformAsset(platform: string, arch: string): PlatformAsset {
	if (platform === "darwin" && arch === "arm64")
		return { name: "shiploadcli-mac-arm64.zip", entryInZip: "dist/shiploadcli-mac-arm64" };
	if (platform === "darwin" && arch === "x64")
		return { name: "shiploadcli-mac-x64.zip", entryInZip: "dist/shiploadcli-mac-x64" };
	if (platform === "linux" && arch === "arm64")
		return { name: "shiploadcli-linux-arm64", entryInZip: null };
	if (platform === "linux" && arch === "x64")
		return { name: "shiploadcli-linux-x64", entryInZip: null };
	if (platform === "win32" && arch === "x64")
		return { name: "shiploadcli-windows-x64.exe", entryInZip: null };
	throw new Error(`No update asset for ${platform}/${arch}`);
}
