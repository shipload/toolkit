import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FONT_MANIFEST, type FontKey } from "./index.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

export async function loadFontData(): Promise<Record<FontKey, Uint8Array>> {
  const entries = await Promise.all(
    (Object.keys(FONT_MANIFEST) as FontKey[]).map(async (key) => {
      const buf = await readFile(join(HERE, FONT_MANIFEST[key].fileName));
      return [key, new Uint8Array(buf)] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<FontKey, Uint8Array>;
}
