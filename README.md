# item-image-worker

Cloudflare Worker rendering Shipload item images. Deterministic, cache-friendly,
stateless.

## Endpoints

- `GET /item/<payload>.png` — PNG render; 1-year immutable cache.
- `GET /item/<payload>.svg` — SVG render; 1-year immutable cache.
- `GET /healthz` — liveness; returns `ok`.
- Anything else → 404.

`<payload>` is the URL-safe base64 encoding of a `cargo_item` ABI-serialized
by `@wharfkit/antelope`. Produce one with:

```bash
bun -e "import { encodePayload, ServerContract } from '@shipload/item-renderer'; \
  console.log(encodePayload(ServerContract.Types.cargo_item.from({item_id: 26, quantity: 1, stats: '0x123456789ABCDEF', modules: []})))"
```

Error cases:

- malformed base64url → 400 + static error SVG/PNG
- valid base64url but decode fails ABI → 400 + error SVG/PNG
- decode succeeds but `item_id` unknown → 404 + error SVG/PNG

## Local dev

Prereqs: `@shipload/sdk` and `@shipload/item-renderer` must be `bun link`ed
locally.

```bash
bun install
bun link @shipload/sdk
bun link @shipload/item-renderer
bun run dev          # wrangler dev on :8787
```

## Tests

```bash
bun run test         # vitest via @cloudflare/vitest-pool-workers
```

A `pretest` hook runs `scripts/sync-fonts.ts` first to copy canonical WOFF2
files from `../item-renderer/src/fonts/` into `src/assets/` so the Data rule
picks them up. This prevents drift between renderer and worker fonts.

## Deployment

```bash
bunx wrangler login
bun run deploy       # wrangler deploy --env production
```

A `predeploy` hook runs `fonts:sync` first. Prereqs: `shiploadgame.com` zone is
onboarded in Cloudflare, and DNS for `img.shiploadgame.com` points at Cloudflare
(orange-cloud). The route binding lives in `wrangler.toml [env.production]`.

## Cache behavior

All item responses set:

```
Cache-Control: public, max-age=31536000, immutable
```

The render output is a pure function of the payload string, so edge-cache hits
are permanently valid. To force-invalidate in an emergency, append a query
string (e.g., `?v=2`) — Cloudflare keys cache entries by full URL.

## Known quirks

- **`elliptic` is aliased to an empty module.** `@wharfkit/antelope` imports
  elliptic for ECDSA/EdDSA crypto. This worker never signs or verifies, so the
  crypto code is dead weight. An empty stub at `src/shims/elliptic-empty.cjs`
  is wired via `[alias]` in `wrangler.toml` and `resolve.alias` in
  `vitest.config.ts`. If antelope ever starts executing crypto at module load,
  the stub will throw and we'll need to ship a copy-shim or narrower alias.
- **Wrangler 3.x rejects `import ... with { type: ... }` attributes.** The
  `Text`/`Data`/`CompiledWasm` rules in `wrangler.toml` handle content-type
  coercion without attributes. Don't add them.
- **Fonts are copied into `src/assets/`** rather than imported via
  `@shipload/item-renderer/fonts/*.woff2`. The deep binary-subpath import
  doesn't resolve through bun-link under the vitest-pool-workers/workerd
  runtime. The `fonts:sync` script keeps the copies in sync with the renderer's
  canonical source. Revisit if wrangler 4 or a future workerd version fixes
  the resolution.
- **Wrangler `compatibility_date` warning.** The installed workerd runtime
  lags behind the TOML's date by several months. Harmless; it falls back to
  the latest supported date.
