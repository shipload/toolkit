# @shipload/cli

## 1.0.0-next.9

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
- Updated dependencies [6cd0cb0]
  - @shipload/sdk@1.0.0-next.7

## 1.0.0-next.8

### Patch Changes

- 2c7eaad: - Reworked location types to mirror contract
- Updated dependencies [2c7eaad]
  - @shipload/sdk@1.0.0-next.6

## 1.0.0-next.7

### Patch Changes

- 70bd1b4: - fix track view
  - fixed connection path
  - wider bad data catch

## 1.0.0-next.6

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
- Updated dependencies [c440fd3]
  - @shipload/sdk@1.0.0-next.5

## 1.0.0-next.5

### Patch Changes

- Cargo/Items/Recipes UI improvements, entity history, debugging tools, adnd capabilities updates
- Updated dependencies
  - @shipload/sdk@1.0.0-next.4

## 1.0.0-next.4

### Patch Changes

- Cargo rework + warp + module add/remove
- Updated dependencies
  - @shipload/sdk@1.0.0-next.3

## 1.0.0-next.3

### Patch Changes

- websocket connection improvements + cli item input fixes
- Updated dependencies
  - @shipload/sdk@1.0.0-next.2

## 1.0.0-next.2

### Patch Changes

- Updating package.json for consumers
- Updated dependencies
  - @shipload/sdk@1.0.0-next.1

## 1.0.0-next.0

### Patch Changes

- Initial release test flow
- Updated dependencies
  - @shipload/sdk@1.0.0-next.0
