# @shipload/oracle

## 0.0.1-next.10

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

## 0.0.1-next.9

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

## 0.0.1-next.8

### Patch Changes

- dd9e222: - Mirror T1 standardization in SDK and CLI
  - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Handle regenerating reserves
  - Mass-based deposit tiers
- Updated dependencies [dd9e222]
  - @shipload/sdk@1.0.0-next.18

## 0.0.1-next.7

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

## 0.0.1-next.6

### Patch Changes

- cc2b1e9: - Add script to preseed secret
  - Update Dockerfile
  - Migrated shipload/oracle into toolkit
  - Adding snapshot commands + NFT mint refactor
  - Adding in template_id
  - Switched to dual-action NFT deploy/unwrap pattern
- Updated dependencies [cc2b1e9]
  - @shipload/sdk@1.0.0-next.16

## 0.0.1-next.5

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

## 0.0.1-next.4

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

## 0.0.1-next.3

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

## 0.0.1-next.2

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

## 0.0.1-next.1

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

## 0.0.1-next.0

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
