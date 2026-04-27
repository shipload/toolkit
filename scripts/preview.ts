import { resolveItem } from "@shipload/sdk";
import { renderItem } from "../src/render.ts";
import { FIXTURES } from "../test/fixtures/cargo-items.ts";

function page(): string {
  const sections: string[] = [];
  for (const [name, item] of Object.entries(FIXTURES)) {
    const resolved = resolveItem(item.item_id, item.stats, item.modules);
    const svg = renderItem(item, resolved);
    sections.push(`<section><h3>${name}</h3><div class="wrap">${svg}</div></section>`);
  }
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>item-renderer preview</title>
        <style>
          body { background: #0a0a0c; color: #e6e8ec; font-family: Inter, sans-serif; padding: 24px; }
          main { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
          section { background: #11141a; padding: 16px; border-radius: 10px; }
          h3 { margin: 0 0 8px; color: #8f98a8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
          .wrap svg { display: block; }
        </style>
      </head>
      <body>
        <h1>Fixtures</h1>
        <main>${sections.join("")}</main>
      </body>
    </html>
  `;
}

const port = Number(process.env.PORT ?? 5173);

Bun.serve({
  port,
  fetch: () => new Response(page(), { headers: { "content-type": "text/html" } }),
});

console.log(`preview running at http://localhost:${port}`);
