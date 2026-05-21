# @shipload/item-renderer

## 1.0.0-next.17

### Patch Changes

- c50610d: - Removed gather speed, setup time, modified richness, and added battery
  - Component rename/simplification pass
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Updated NFT actions to use new pairs from contract
  - more user friendly cargo errors
  - Added battery module
- Updated dependencies [c50610d]
  - @shipload/sdk@1.0.0-next.17

## 1.0.0-next.16

### Patch Changes

- cc2b1e9: - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Adding snapshot commands + NFT mint refactor
  - Adding in template_id
  - Switched to dual-action NFT deploy/unwrap pattern
- Updated dependencies [cc2b1e9]
  - @shipload/sdk@1.0.0-next.16

## 1.0.0-next.15

### Patch Changes

- 001e375: - Reducing current item prefix/adjectives to just resources
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Fixed name differences in tests
  - Removing entity type guards from most commands
  - recharge/auto-recharge on more commands
  - add --all and --from flags to cancel command
  - Crafting recharge/auto
  - Broaden cannot cancel error message
  - Fix worker bundling w/ bun binary
- Updated dependencies [001e375]
  - @shipload/sdk@1.0.0-next.15

## 1.0.0-next.14

### Patch Changes

- 7a023b9: - add location, tier suffix, and scaled mass
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Update config.test.ts
  - updating defaults
  - Add nft list and unwrap commands to shiploadcli
  - Unify SDK entity model around Entity class (#3)
  - Update prose references for indexer/webapp rename
  - Update catalog sync paths for contracts rename
  - projecting cargo for inventory views
  - Require loaders for deploy + wrap param change
  - Standardizing item/stack/qty format
  - Fixed/simplified transact methods
  - using projected coordinates for gather/deploy
  - Formatting
  - Entity header for track (and others)
  - Better log-like formatting
  - Moved powercell to regolith to mirror contract
- Updated dependencies [7a023b9]
  - @shipload/sdk@1.0.0-next.14

## 1.0.0-next.13

### Patch Changes

- 0ab0ad2: - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Unify SDK entity model around Entity class (#3)
  - Update prose references for indexer/webapp rename
  - Update catalog sync paths for contracts rename
  - projecting cargo for inventory views
  - Require loaders for deploy + wrap param change
  - Standardizing item/stack/qty format
  - Fixed/simplified transact methods
  - using projected coordinates for gather/deploy
  - Formatting
  - Entity header for track (and others)
  - Better log-like formatting
  - Export parity test code independently
- Updated dependencies [0ab0ad2]
  - @shipload/sdk@1.0.0-next.13

## 1.0.0-next.12

### Patch Changes

- 0b3fd04: - Update prose references for indexer/webapp rename
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Unify SDK entity model around Entity class (#3)
  - Update catalog sync paths for contracts rename
  - projecting cargo for inventory views
  - Require loaders for deploy + wrap param change
  - Standardizing item/stack/qty format
  - Fixed/simplified transact methods
  - using projected coordinates for gather/deploy
  - Formatting
  - Entity header for track (and others)
  - Better log-like formatting
  - Add projection cross-validation
  - bunx rollup instead of local to fix cf build
  - Update atomicdata.ts
- Updated dependencies [0b3fd04]
  - @shipload/sdk@1.0.0-next.12

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
- Updated dependencies [c8d3c24]
  - @shipload/sdk@1.0.0-next.11

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
- Updated dependencies [7659788]
  - @shipload/sdk@1.0.0-next.10

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
- Updated dependencies [806d22c]
  - @shipload/sdk@1.0.0-next.9

## 1.0.0-next.8

### Patch Changes

- 9bd89f2: - Cargo Projection for scheduling tasks
  - Mirroring new entity classes from contract
  - Various misc tweaks based on feedback
  - derive ship-tasks per-row status
  - Task names + times on track
  - mirror MIN_TRANSFER_DISTANCE clamp in sdk
- Updated dependencies [9bd89f2]
  - @shipload/sdk@1.0.0-next.8

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
- Updated dependencies [6cd0cb0]
  - @shipload/sdk@1.0.0-next.7

## 1.0.0-next.6

### Patch Changes

- 2c7eaad: - Reworked location types to mirror contract
- Updated dependencies [2c7eaad]
  - @shipload/sdk@1.0.0-next.6

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
- Updated dependencies [c440fd3]
  - @shipload/sdk@1.0.0-next.5

## 1.0.0-next.4

### Patch Changes

- Cargo/Items/Recipes UI improvements, entity history, debugging tools, adnd capabilities updates
- Updated dependencies
  - @shipload/sdk@1.0.0-next.4

## 1.0.0-next.3

### Patch Changes

- Cargo rework + warp + module add/remove
- Updated dependencies
  - @shipload/sdk@1.0.0-next.3

## 1.0.0-next.2

### Patch Changes

- websocket connection improvements + cli item input fixes
- Updated dependencies
  - @shipload/sdk@1.0.0-next.2

## 1.0.0-next.1

### Patch Changes

- Updating package.json for consumers
- Updated dependencies
  - @shipload/sdk@1.0.0-next.1

## 1.0.0-next.0

### Patch Changes

- Initial release test flow
- Updated dependencies
  - @shipload/sdk@1.0.0-next.0
