# @shipload/sdk

## 1.0.0-next.11

### Patch Changes

- c8d3c24: - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Fixed/simplified transact methods
  - using projected coordinates for gather/deploy
  - Formatting
  - Entity header for track (and others)
  - Better log-like formatting
  - Renaming entity classes + adding nexus
  - Added int32 type for nft data
  - Standardizing entity errors/messaging
  - Add new Factory entity

## 1.0.0-next.10

### Patch Changes

- 7659788: - Regen item-renderer snapshots after density un-inversion
  - Makefile updates
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Improved track component readability
  - Removed entity type plumbing
  - Removed entity type + location entity
  - Nexus now entity + sequence remove
  - SDK updates for extractor + entity refactor
  - Added --entity to stratum call
  - Un-inverted density stats
  - Exporting entity traits (signifying modules)

## 1.0.0-next.9

### Patch Changes

- 806d22c: - Formatting
  - add player `wait` command
  - Improved help for `wait` command
  - Better error handling/messaging
  - Catching invalid module index input params
  - Module slot index on entity header
  - Remove extra references to NFTs
  - register refrshentity cli verbs
  - add refrshentity cli command
  - Use tables in find + show stats
  - Added module slot amplifiers
  - Revamped locations to use table
  - Updated contract
  - Added Extractor to SDK
  - Bug fix on stats input
  - add refrshentity sdk helper
  - Switched to show cargo changes
  - Simplified Cargo Additions

## 1.0.0-next.8

### Patch Changes

- 9bd89f2: - Cargo Projection for scheduling tasks
  - Mirroring new entity classes from contract
  - Various misc tweaks based on feedback
  - derive ship-tasks per-row status
  - Task names + times on track
  - mirror MIN_TRANSFER_DISTANCE clamp in sdk

## 1.0.0-next.7

### Patch Changes

- 6cd0cb0: - Formatting
  - extract cli cargo-build helpers shared across action commands
  - add debug drain-schedules command for pre-redeploy schedule cleanup
  - reshape cli cargo actions around cargo_ref/cargo_item
  - extend --estimate ergonomics across cli actions
  - drop craft --input deprecation listener
  - rename strata column Avail to Reserve
  - add show subcommand for entity --json
  - coerce stats to string in --json output
  - blend --estimate shows output stack
  - grouptravel --wait renders all participants
  - craft --input migration error
  - rename transfer stats positional to stack-id
  - reserve/richness units in cli
  - resources alias for strata
  - Reduced limit and added entity type resolution helper
  - Entity history formatting/direction
  - Standardizing auto-resolve
  - drop sdk location_epoch derivation removed from contract
  - reshape sdk action helpers around cargo_ref/cargo_item
  - regenerate sdk server contract from cargo-ref unification ABI
  - fix sdk catalog-sync default path for monorepo layout
  - removing dual item labels

## 1.0.0-next.6

### Patch Changes

- 2c7eaad: - Reworked location types to mirror contract

## 1.0.0-next.5

### Patch Changes

- c440fd3: - Fix baseline TS errors blocking CI
  - Migrate image-renderer to workspace and vendor resvg wasm
  - Unified biome for lint/format + format run
  - Formatting
  - track fleet view
  - TUI plumbing for fleet view
  - SDK gather depth mirroring
  - undeploy / wrapentity / demolish
  - unified entity status display across commands
  - Implementing T4-10 mass + depths
  - task index -1 for when past completion
  - owner-scoped data subscriptions
  - smoothing flight paths
  - pass on hauler small tasks (abbreviation + nft description)

## 1.0.0-next.4

### Patch Changes

- Cargo/Items/Recipes UI improvements, entity history, debugging tools, adnd capabilities updates

## 1.0.0-next.3

### Patch Changes

- Cargo rework + warp + module add/remove

## 1.0.0-next.2

### Patch Changes

- websocket connection improvements + cli item input fixes

## 1.0.0-next.1

### Patch Changes

- Updating package.json for consumers

## 1.0.0-next.0

### Patch Changes

- Initial release test flow
