# @shipload/oracle

Single-key oracle service for the Shipload epoch system. Polls the chain on a 10s tick, calls `commit` once at startup if needed, and calls `advance` whenever the time-based epoch height passes the on-chain `state.epoch`.

## Auth model

Both `commit` and `advance` `require_auth(get_self())` — the contract account itself. The signer must therefore be a permission of `shipload.gm` whose authority maps to this service's key. A delegated permission (e.g. `shipload.gm@oracle`) is recommended over `active`.

## Required env vars

| Var | Example | Notes |
|---|---|---|
| `SERVER_ACCOUNT` | `shipload.gm` | Game contract |
| `PLATFORM_ACCOUNT` | `platform.gm` | Platform contract |
| `ACCOUNT_NAME` | `shipload.gm` | Signer (not the oracle's user account — the contract account) |
| `PERMISSION_LEVEL` | `oracle` or `active` | Permission of `ACCOUNT_NAME` whose key is in `PRIVATE_KEY` |
| `PRIVATE_KEY` | `5K…` | EOS-format private key |
| `CHAIN_NAME` | `Jungle4` | One of `@wharfkit/session` `Chains` keys; defaults to `Jungle4` |

## Running

### Locally (Bun)

```bash
make build  # produces dist/shipload-oracle
./dist/shipload-oracle  # reads .env from cwd
```

Or in dev mode with hot reload:

```bash
make dev
```

### Docker / compose

```bash
docker compose up -d --build
```

Build context is the workspace root (`../..`), so the whole `toolkit/` is copied into the build. Adjust `volumes:` if you want the SQLite store at a non-default host path.

## SQLite store warning

The service persists commit/reveal pairs at `shared/shipload.${ACCOUNT_NAME}.sqlite`. Each `commit` action submitted to the chain has a matching reveal stored here. **Do not lose this file** — losing it after submitting a commit but before the matching `advance` means there's no way to reveal the value. The contract would refuse to advance, and recovery requires re-`init`-ing (which resets `state.seed`).

Mount the `shared/` directory outside the container in production. Back it up.

## Multi-oracle redesign

Single-key model is interim. Moving to a quorum of independent committers is planned; until then, the oracle is a single point of failure for epoch progression. Other game state (player actions, derivation) keeps working if the oracle goes down — just no new seed and no new `state.epoch`.

## Salt

`salt` action is intentionally open-auth — anyone can perturb the next-seed entropy. The oracle holds the commit/reveal pair, so if the oracle also chose `salt` it could grind reveal+salt off-chain to find a favorable seed. Open-auth `salt` lets any player perturb entropy after a commit is set, removing that grind path.
