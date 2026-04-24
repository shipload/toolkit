# @shipload/cli

Commander-based CLI (`shiploadcli`) for interacting with the Shipload game contracts. Query state and submit actions against the configured chain and account.

## Quick start

### Using a pre-built binary

Download the binary for your platform from the [latest release](https://github.com/shipload/cli/releases/latest):

- **macOS (Apple Silicon / Intel)** — `shiploadcli-mac-arm64.zip` / `shiploadcli-mac-x64.zip`. Unzip, then run the extracted binary. macOS builds are signed with a Developer ID and notarized — no `xattr` or Gatekeeper workarounds needed.
- **Linux (x64 / arm64)** — `shiploadcli-linux-x64` / `shiploadcli-linux-arm64`. `chmod +x` and run.
- **Windows (x64)** — `shiploadcli-windows-x64.exe`. Run directly.

Then:

1. Initialize a config: `./shiploadcli-* init`
2. Edit the config at the printed path — fill in `private_key` and `actor`.
3. Run: `./shiploadcli-* whoami`

### From source

```bash
bun install
make codegen               # regenerate contract bindings from Jungle 4
bun run shiploadcli init --cwd  # writes ./config.ini; edit it before running other commands
```

### Configuration

The CLI reads credentials from a `config.ini` file — **never from environment variables**. Putting a private key on a command line or in the environment leaks it to shell history, process listings, and child processes. The file is the only supported source.

Lookup order (first one found wins):

1. `$PLAYER_CONFIG` — absolute path to a config file. Useful when you want to keep multiple configs side-by-side and pick one per invocation.
2. `./config.ini` — in the current working directory. Useful for per-project configs.
3. Platform user config dir:
   - macOS/Linux: `~/.config/shipload/config.ini` (or `$XDG_CONFIG_HOME/shipload/config.ini`)
   - Windows: `%APPDATA%\shipload\config.ini`

`config.ini` format:

```ini
[default]
private_key = PVT_K1_...
actor = myaccount
permission = active
```

The file should be readable only by you. `shiploadcli init` writes it with mode `0600`; if you create it by hand, `chmod 600 config.ini`.

First-run bootstrap (create a company, join the game, and — on testnet — claim a starter ship):

```bash
bun run shiploadcli foundcompany "My Company"
bun run shiploadcli join
bun run shiploadcli claimstarter     # testnet/debug builds only; skip on mainnet
```

Unsure what to do next? Run `bun run shiploadcli next`.

## Commands

Three groups, browsable via `bun run shiploadcli --help`:

### Query (read-only)

Every query command accepts `--json` to emit raw JSON instead of formatted text.

- `whoami` — session actor, permission, and public key.
- `status` — game enablement and platform/server account status.
- `player [account]` — player record; defaults to self.
- `entity <entity-type> <id>` — full state for a single ship/warehouse/container.
- `entities [owner]` — list entities for an owner; defaults to self.
- `inventory <entity-type> <id>` — cargo inventory for an entity.
- `tasks <entity-type> <id>` — scheduled + pending tasks for an entity.
- `items` — available item definitions.
- `recipe [id]` — list all recipes, or show one by output item id.
- `resources` — resource definitions.
- `modules` — module definitions.
- `nftinfo` — NFT schemas and item→schema templates.
- `config` — server game config.
- `stratum <x> <y> [index]` — list non-empty strata at a location, or detail one with `index`. Supports `--entity <ref>` to scope to a gatherer's depth.
- `location <x> <y>` — location metadata for given coordinates.
- `nearby <ship-id>` — systems reachable from a ship.
- `epoch` — current epoch seed and timing.
- `next` (alias `hint`) — suggest the next action based on current state.

### Action (transacting)

- `foundcompany <name>` — create a new company on the platform.
- `join` — join the Shipload game.
- `claimstarter [x] [y]` — claim a pre-kitted T1 starter ship at `(x, y)` (defaults to `0 0`). Testnet/debug builds only; fails on mainnet where the action is not in the ABI.
- `travel <ship-id> <x> <y>` — fly a ship to coordinates. `--no-recharge` disables auto-recharge.
- `grouptravel <entities> <x> <y>` — fly multiple entities together (e.g., `ship:1,container:2`).
- `warp <entity-type> <id> <x> <y>` — instant-transit via the warp module.
- `gather <src-type> <src-id> <dest-type> <dest-id> <stratum> <quantity>` — extract resources from a stratum into a destination entity.
- `transfer <src-type> <src-id> <dest-type> <dest-id> <item-id> <stats> <quantity>` — move cargo between entities of the same owner.
- `recharge <entity-type> <id>` — recharge energy on an entity with a generator.
- `craft <entity-type> <entity-id> <recipe-id> <quantity>` — produce items from a recipe. Pass inputs with repeatable `--input item:qty:stats`.
- `blend <entity-type> <entity-id>` — merge multiple stacks of the same item into one with blended stats. Pass inputs with repeatable `--input item:qty:stats`.
- `deploy <entity-type> <entity-id> <packed-item-id> <name>` — deploy an entity from a packed cargo NFT.
- `wrap <owner> <entity-type> <entity-id> <cargo-id> <quantity>` — wrap cargo into an NFT for the specified owner.
- `addmodule <entity-type> <entity-id> <module-index> <module-cargo-id>` — attach a module cargo to an entity slot.
- `rmmodule <entity-type> <entity-id> <module-index>` — remove a module from a slot.
- `resolve <entity-type> <id>` — process completed tasks on an entity.
- `cancel <entity-type> <id> <count>` — cancel pending tasks on an entity (count required).
- `wait <entity-type> <entity-id>` — block until the entity's active task ends, auto-resolve, and print post-state. Supports `--timeout <s>`.

### Tools (diagnostics)

- `tools scan <radius>` — scan strata in a radius around the origin; leaderboard of god-rolls. Supports `--threshold`, `--top`, `--workers`, `--center`, `--entity`, `--all`, `--json`, and seed overrides.
- `tools find <resource-id>` — locate the nearest reachable strata producing a given resource. Supports `--entity`, `--radius`, `--max-results`, `--json`, and seed overrides.
- `tools verify-tiers` — verify world-gen produces reserves matching `RESERVE_TIERS` ranges. Supports `--radius`.

## Conventions

- **Arguments**: positional = required, flag = optional.
- **Entity refs** (in args that take a `type:id` string): `ship:1`, `container:2`, `warehouse:3`.
- **Cargo inputs** (for `--input` on `craft` / `blend`): `item:qty:stats`. `stats` is the stack discriminator; typically `0`.

Shared flags on transacting actions:

- `--wait` — block until the scheduled task completes, auto-resolve, and print post-state.
- `--estimate` — preview `{ duration, energy cost, cargo delta }` without submitting. Mutually exclusive with `--wait`.
- `--auto-resolve` — resolve completed tasks on the target before acting.

Exit codes:

- `0` — success
- `1` — user error (bad args, pre-flight validation failure)
- `2` — chain error (assertion from contract)
- `3` — unexpected

## Task lifecycle

Tasks move through four states: **scheduled → active → completed → resolved**.

- `bun run shiploadcli tasks <entity-type> <id>` shows the current schedule and pending queue.
- Some tasks are uncancelable ("market tasks": `gather`, `craft`). Once scheduled they must run to completion — wait or let the schedule drain.
- `bun run shiploadcli resolve <entity-type> <id>` processes completed tasks. Passing `--auto-resolve` on the next action does this automatically before submission.

## Craft vs blend

- `craft` produces a new item according to a recipe (declared inputs → declared output).
- `blend` merges multiple stacks of the same item into a single stack with blended stats. It is not an alternate crafter; use it to consolidate stacks.

## Recommended agent pattern

```bash
bun run shiploadcli next                              # figure out what to do
bun run shiploadcli <query commands>                  # gather context
bun run shiploadcli <action> --estimate               # preview cost
bun run shiploadcli <action> --wait --auto-resolve    # submit, wait, verify
bun run shiploadcli entity <type> <id>                # confirm post-state
```

## Troubleshooting

- **`cannot cancel market task - use counter-action instead`** — `gather` and `craft` tasks are uncancelable once scheduled. Wait for them to complete or let the queue drain.
- **`cargo capacity would be exceeded`** — reduce `quantity`. Pre-flight validation catches most of these before they reach the chain; if the chain returns it, your `--estimate` numbers were off (rare).
- **`no resources at this stratum`** — either the stratum is empty or it's below your gatherer's depth. Check `bun run shiploadcli stratum <x> <y> <index>` for the stratum and `bun run shiploadcli entity ship <id>` for the ship's gatherer depth.

## Development

```bash
make check          # tsc + biome (read-only gate)
make format         # biome auto-fix
make test           # bun test
make codegen        # regenerate contracts/ bindings from Jungle 4
make binaries       # build binaries for all five target OS/arch pairs
make release-dry    # build + sign + notarize locally; no git mutations, no publish
make release        # full local release: preflight → build → sign → notarize → commit → tag → push → publish
```
