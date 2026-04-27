# Shipload Toolkit

TypeScript packages for the Shipload game ecosystem.

## Packages

| Package | Description | Publish |
|---|---|---|
| [`@shipload/sdk`](./packages/sdk) | SDK for the Shipload game contracts | npm |
| [`@shipload/item-renderer`](./packages/item-renderer) | Deterministic SVG rendering for items | npm |
| [`@shipload/image-renderer`](./packages/image-renderer) | Cloudflare Worker rendering item images (PNG via resvg) | private |
| [`@shipload/cli`](./packages/cli) | `shiploadcli` — command-line client | binary releases |

## Development

```bash
bun install              # install all workspace deps
make check               # lint + type-check all packages
make test                # run all tests
make build               # build all packages
make test/sdk            # narrowed scope (slash subcommand)
```

## Releases

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the changeset workflow and `make release` flow.
