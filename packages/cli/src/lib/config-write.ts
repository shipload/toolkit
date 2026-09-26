import {existsSync, readFileSync, writeFileSync} from "node:fs";

const HEADER_RE = /^\s*\[[^\]]+\]\s*$/;
const DEFAULT_HEADER_RE = /^\s*\[default\]\s*$/;

/** Set or remove keys in the `[default]` section of an ini config file's text, preserving every other section. */
export function setConfigKeys(text: string, updates: Record<string, string | undefined>): string {
	const eol = text.includes("\r\n") ? "\r\n" : "\n";
	const lines = text.length > 0 ? text.split(/\r?\n/) : [];
	const explicitDefault = lines.findIndex((l) => DEFAULT_HEADER_RE.test(l));
	const bodyStart = explicitDefault === -1 ? 0 : explicitDefault + 1;
	let bodyEnd = lines.length;
	for (let i = bodyStart; i < lines.length; i++) {
		if (HEADER_RE.test(lines[i])) {
			bodyEnd = i;
			break;
		}
	}

	const remaining = new Map(Object.entries(updates));
	const body: string[] = [];
	for (const line of lines.slice(bodyStart, bodyEnd)) {
		const match = /^\s*([A-Za-z0-9_.]+)\s*=/.exec(line);
		const key = match?.[1];
		if (key && remaining.has(key)) {
			const value = remaining.get(key);
			remaining.delete(key);
			if (value === undefined) continue;
			body.push(`${key} = ${value}`);
			continue;
		}
		body.push(line);
	}
	let trailingBlanks = 0;
	while (trailingBlanks < body.length && body[body.length - 1 - trailingBlanks].trim() === "") {
		trailingBlanks++;
	}
	const blanks = trailingBlanks > 0 ? body.splice(body.length - trailingBlanks, trailingBlanks) : [];
	for (const [key, value] of remaining) {
		if (value === undefined) continue;
		body.push(`${key} = ${value}`);
	}
	body.push(...blanks);

	const rebuilt = [
		...lines.slice(0, bodyStart),
		...body,
		...lines.slice(bodyEnd),
	].join(eol);
	if (rebuilt === "") return rebuilt;
	return rebuilt.endsWith(eol) ? rebuilt : rebuilt + eol;
}

/** Apply `setConfigKeys` to the config file on disk, creating it if it does not exist. */
export function writeConfigKeys(path: string, updates: Record<string, string | undefined>): void {
	const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
	writeFileSync(path, setConfigKeys(existing, updates));
}
