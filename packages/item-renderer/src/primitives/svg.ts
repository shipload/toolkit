export function escapeXml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export type AttrValue = string | number | null | undefined;

export function attr(attrs: Record<string, AttrValue>): string {
  let out = "";
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    const value = typeof v === "number" ? String(v) : escapeXml(v);
    out += ` ${k}="${value}"`;
  }
  return out;
}

export function el(tag: string, attrs: Record<string, AttrValue>, children?: string): string {
  if (children === undefined) return `<${tag}${attr(attrs)}/>`;
  return `<${tag}${attr(attrs)}>${children}</${tag}>`;
}
