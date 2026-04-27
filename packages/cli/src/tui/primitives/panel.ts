import { Box, type VChild } from "@opentui/core";

export interface PanelOpts {
	children: VChild[];
}

export function renderPanel(opts: PanelOpts): VChild {
	return Box(
		{
			borderStyle: "rounded",
			borderColor: "#666666",
			padding: 1,
			flexDirection: "column",
			width: "100%",
			flexGrow: 1,
		},
		...opts.children,
	);
}
