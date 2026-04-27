import type { CliRenderer, KeyEvent } from "@opentui/core";
import type { HotkeyRegistry } from "./hotkeys";

export interface View {
	keys: HotkeyRegistry;
	attach(renderer: CliRenderer): void;
	dispose(): Promise<void>;
	onExit: Promise<void>;
	helpOpen?: () => boolean;
	dismissHelp?: () => void;
	// If returns true, the keypress is fully consumed (no other handlers run).
	// Used by modals/wizards that need to capture all input.
	interceptKey?: (key: KeyEvent) => boolean;
}
