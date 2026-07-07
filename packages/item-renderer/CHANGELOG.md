# @shipload/item-renderer

## 1.0.0-next.49

### Patch Changes

- 42fd31e: - Adopt authored master art for station entity icons
  - Adopt the authored master art for module icons
  - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Add the gather fill-the-hold plan builder and flatten helper
  - Mirror the craft per-task setup cost and regenerate the projection fixture
  - Mirror the loaderless unwrap load rate in the SDK estimate
- Updated dependencies [42fd31e]
  - @shipload/sdk@1.0.0-next.49

## 1.0.0-next.48

### Patch Changes

- 5887a8e: - Roustabout renaming continued
  - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Export eligibleUpgrades and add upgrade hold and task kinds
  - Sync the Container T2 catalog
  - Name the T1 ship Roustabout
  - Average multi-source stat slots when blend weights are empty
  - Sync T2 recipe catalog after fresh components and module upgrades
  - Add SDK support for the subclass upgrade action
- Updated dependencies [5887a8e]
  - @shipload/sdk@1.0.0-next.48

## 1.0.0-next.47

### Patch Changes

- 5b7d970: - Update renderer snapshots for Power Core module rename
  - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Blend all stat-slot sources in entity stat derivation
  - Helpers for slot modules + module renames
- Updated dependencies [5b7d970]
  - @shipload/sdk@1.0.0-next.47

## 1.0.0-next.46

### Patch Changes

- 130d1bf: - Mirror the T2 Hauler and tractor beam tier semantics in the SDK
  - Expose slot metadata, per-minute drain descriptions, and raster item-cell icons
  - Map the Prospector to the ship entity icon
  - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Forward stored packed-cargo modules and entity id from deploy and module clients
  - Regenerate parity fixtures and fix the hauler stats test for the T2 Hauler catalog
  - Update stale SDK derivation tests for the re-keyed stats and gatherer recipe
  - Update SDK gather-duration tests for the per-gather setup cost
  - Mirror socket tier caps, the flex-socket tax, T2 content, and the Prospector in the SDK
  - Mirror the per-gather setup cost in the SDK gather duration
  - Add compareByStars star-quality sort helper
  - Carry occupant type on cluster cell wire
  - Include tier in StratumInfo derivation result
  - Floor gather duration and energy in SDK mirror
  - Added swaptile
- Updated dependencies [130d1bf]
  - @shipload/sdk@1.0.0-next.46

## 1.0.0-next.45

### Patch Changes

- 579f6f7: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Add station cluster commands to CLI
  - Update snapshots and tests for T1 recipe rebalance
  - Rename modules and entities in CLI test assertions
  - Add station cluster support to SDK
  - Rebalance T1 recipe stat pairings
  - Allow zero cargo capacity entities
- Updated dependencies [579f6f7]
  - @shipload/sdk@1.0.0-next.45

## 1.0.0-next.44

### Patch Changes

- 7be0a0d: - Update snapshots and tests for T1 recipe rebalance
  - Remove dead capability color keys
  - Rename modules and entities to new display names
  - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Add station cluster commands to CLI
  - Rename modules and entities in CLI test assertions
  - Add station cluster support to SDK
  - Rebalance T1 recipe stat pairings
  - route indexer cluster deltas to entity subscribers
  - Update projection fixture catalog hashes
  - Mirror station hub recipe and exclude it from plot build methods
- Updated dependencies [7be0a0d]
  - @shipload/sdk@1.0.0-next.44

## 1.0.0-next.43

### Patch Changes

- 56e5e24: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Dedupe stat coverage tuples for multi-source mappings
  - Always carry producer on capability mappings
  - Add sendAsset transfer action
  - Add source qualifier to ambiguous stat mappings
  - Mirror unwrap timing and fits from the contract
  - Remove T2 recipes
  - Re-export nearby wormholes
- Updated dependencies [56e5e24]
  - @shipload/sdk@1.0.0-next.43

## 1.0.0-next.42

### Patch Changes

- 164280a: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Test fixes after recipe changes
  - Add box and sync scan wasm entrypoints and route the CLI through them
  - Pass entity ids to demolish/undeploy builders and hint pending resolve
  - Add player roster and entity census commands to the CLI
  - Mirror gatherer Resin re-key in SDK
  - Share box-scan marshalling and skip the result copy
  - Resync scan wasm base64 after debug strip
- Updated dependencies [164280a]
  - @shipload/sdk@1.0.0-next.42

## 1.0.0-next.41

### Patch Changes

- bdf4b6e: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Recipe output improvements
  - Add recipe where-used and demand analysis to the CLI
  - Test fixes
  - Increased resource deposit sizes (20x to 2x) + spawn rates (2x)
  - Replace non-null assertions in route-planner test
  - Add @shipload/sdk/scan wasm loader subpath
  - Update yield-rate tests for 0.8x spawn rate
  - Lower deposit spawn rate to 0.8x
- 039862e: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Recipe output improvements
  - Add recipe where-used and demand analysis to the CLI
  - Test fixes
  - Increased resource deposit sizes (20x to 2x) + spawn rates (2x)
  - Update yield-rate tests for 0.8x spawn rate
  - Lower deposit spawn rate to 0.8x
- Updated dependencies [bdf4b6e]
- Updated dependencies [bdf4b6e]
- Updated dependencies [039862e]
  - @shipload/sdk@1.0.0-next.41

## 1.0.0-next.40

### Patch Changes

- 74c1205: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Recipe output improvements
  - Add recipe where-used and demand analysis to the CLI
  - Test fixes
  - Increased resource deposit sizes (20x to 2x) + spawn rates (2x)
  - Allow routing to wormhole mouths
  - Reverse the deposit-size multiplier in tierOfReserve
- Updated dependencies [74c1205]
  - @shipload/sdk@1.0.0-next.40

## 1.0.0-next.39

### Patch Changes

- 0b170aa: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Added mass driver/catcher support
  - Fixed test data
  - Rebalancing engine stats
- Updated dependencies [0b170aa]
  - @shipload/sdk@1.0.0-next.39

## 1.0.0-next.38

### Patch Changes

- 90149b1: - Fixed snapshots
  - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Mirror crafter conductivity re-key in SDK
  - Battery and Cargo Bay module reworks
  - Export MAX_LEGS as the shared route-planner hop cap
- Updated dependencies [90149b1]
  - @shipload/sdk@1.0.0-next.38

## 1.0.0-next.37

### Patch Changes

- 140c1ed: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Abstracted route planner for webapp to use
- Updated dependencies [140c1ed]
  - @shipload/sdk@1.0.0-next.37

## 1.0.0-next.36

### Patch Changes

- db1e703: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Include hauler calculations in group travel
  - Replace Entity worker getters with per-lane rollup helpers
  - Clamp worker rollups, widen gather energy, map both depth errors
  - Migrate SDK and CLI to per-lane worker capabilities
  - Drop capacity attribution from the reserved entity hull slot
  - Resolve entity capacity from raw stat slots for seeded entities
  - Sync SDK tests and fixtures with current contract model
  - Show container capacity in NFT descriptions and name the Factory entity
  - Fix SDK tests for the structure-balance recipe and capacity changes
  - Mirror T1 structure-balance capacity model in the SDK
  - Export coordinate data
  - Center coordinate addresses on the origin with signed local
  - Add wormhole-over-system precedence parity test
  - Add coordinate address encoder and SDK accessor
  - Add derivation and wormhole parity fixture replays
- Updated dependencies [db1e703]
  - @shipload/sdk@1.0.0-next.36

## 1.0.0-next.35

### Patch Changes

- 0adee83: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Clarify outgoing transfers text
  - Add TaskType.TRANSIT and grouptransit builder
  - Add getdistance action helper
  - Add coordinate addressing
  - Add cancelEligibility helper for task cancellation
  - add deterministic two-way wormholes
- Updated dependencies [0adee83]
  - @shipload/sdk@1.0.0-next.35

## 1.0.0-next.34

### Patch Changes

- fdc5896: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - added cli command for resolveall
  - Mirrored instant claimplot from contract
  - Updates for entity deploy
  - Show builder type and name in finalizer picker
  - Support live entity subscriptions
  - Only resolve hold counterparts a lookup confirms are resolvable
  - Support for resolveall action
- Updated dependencies [fdc5896]
- Updated dependencies [2cc3067]
  - @shipload/sdk@1.0.0-next.34

## 1.0.0-next.33

### Patch Changes

- cb148e2: - Test fixes
  - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Mirrored instant claimplot from contract
  - Updates for entity deploy
  - Simplifying T1 dual-input recipes
  - NFT Entity Wrap
  - Rebalanced load/unload mechanics (mirror from contract)
  - Fix gathering rate calculation
- Updated dependencies [cb148e2]
  - @shipload/sdk@1.0.0-next.33

## 1.0.0-next.32

### Patch Changes

- d5d36b3: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Mirroring contract changes, transfer removal, holds/load/unload added
  - Updating distances and formatting
- Updated dependencies [d5d36b3]
  - @shipload/sdk@1.0.0-next.32

## 1.0.0-next.31

### Patch Changes

- 686b51b: - Formatting
  - Basic entity icons
  - Added placeholder/concept component icons
  - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Updating distances and formatting
  - Allowing empty names by flag (for foundcompany)
- Updated dependencies [686b51b]
  - @shipload/sdk@1.0.0-next.31

## 1.0.0-next.30

### Patch Changes

- 9f79eb3: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Updating distances and formatting
  - Support for new rename action
- Updated dependencies [9f79eb3]
  - @shipload/sdk@1.0.0-next.30

## 1.0.0-next.29

### Patch Changes

- 0e659af: - Title additions to SVGs
  - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Subtraction helper
- Updated dependencies [0e659af]
  - @shipload/sdk@1.0.0-next.29

## 1.0.0-next.28

### Patch Changes

- 376e450: - Stat ratings on image/item SDKs
  - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Updating mappings/tests
  - Mirrored stat rename + rebalance from contract
  - Stat ratings for stat rolls
- Updated dependencies [376e450]
  - @shipload/sdk@1.0.0-next.28

## 1.0.0-next.27

### Patch Changes

- ef41843: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Added support for multi-lane schedules
  - Add retarget action
  - Add Loader quantity capability attribute
- Updated dependencies [ef41843]
  - @shipload/sdk@1.0.0-next.27

## 1.0.0-next.26

### Patch Changes

- bfcb67f: - ItemCell quantity adjustments
  - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Increase energy values to uint32
  - Added route planner to cli
  - Fixed cargo mass projection for gather/craft
  - Updated generated contracts
  - Claim action helper
  - Fixed T10 max depth
  - Handle plot reservations in schedule
  - Removed unused loading logic
- Updated dependencies [bfcb67f]
  - @shipload/sdk@1.0.0-next.26

## 1.0.0-next.25

### Patch Changes

- 26fc4af: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Pass atomicassets contract for queries
  - Customizable Atomic contract names + helpers
  - Balancing energy capacity to allow basic module crafting
  - Add reserve type
  - Schedule utilities for plot entities
- Updated dependencies [26fc4af]
  - @shipload/sdk@1.0.0-next.25

## 1.0.0-next.24

### Patch Changes

- b541649: - Icons
  - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Balancing energy capacity to allow basic module crafting
  - Adding time component to getStrata call
- Updated dependencies [b541649]
  - @shipload/sdk@1.0.0-next.24

## 1.0.0-next.23

### Patch Changes

- 2f38701: - Updating mock data
  - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Balancing energy capacity to allow basic module crafting
- Updated dependencies [2f38701]
  - @shipload/sdk@1.0.0-next.23

## 1.0.0-next.22

### Patch Changes

- a355f3b: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Added energy projection + construction fixes
- Updated dependencies [a355f3b]
  - @shipload/sdk@1.0.0-next.22

## 1.0.0-next.21

### Patch Changes

- 93b133b: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Better oracle error handlers
  - Construction helpers
- 5609cef: - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Better oracle error handlers
  - Fixing tests
  - Construction helpers
- Updated dependencies [93b133b]
- Updated dependencies [5609cef]
  - @shipload/sdk@1.0.0-next.21

## 1.0.0-next.20

### Patch Changes

- a400323: - Redesign item-renderer cards
  - Standardized resource mass and recipe changes
  - Multi-oracle epoch system
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Use prebuilt client instead of making a new one
  - Updating NFT calls + contract renames
  - supporting msig protocol
  - removed claimstarter action
  - Migrating contract names
  - Changed id to builder_id for clarity
  - Added claimplot/buildplot actions
  - Remove note field from oracle registry
  - Entity capability projection
  - Updating tests
  - Token/nft additional fields
  - Update mass capacities
- Updated dependencies [a400323]
  - @shipload/sdk@1.0.0-next.20

## 1.0.0-next.19

### Patch Changes

- c5b0a2f: - Stats/recipe compaction from contract
  - Remove loader quantity copy
  - Adjusted entity mass capacities
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Adding Plot + Linting
  - Add ConstructionManager and plot kind support
  - Add epoch divergence warning
  - Use SDK location formatter
  - Adding item_id from the entity_type
  - Update recipes.json
  - Add item build method helpers
  - Support for build/claim plot actions
- Updated dependencies [c5b0a2f]
  - @shipload/sdk@1.0.0-next.19

## 1.0.0-next.18

### Patch Changes

- dd9e222: - Mirror T1 standardization in SDK and CLI
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Handle regenerating reserves
  - Mass-based deposit tiers
- Updated dependencies [dd9e222]
  - @shipload/sdk@1.0.0-next.18

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
