---
"@shipload/cli": patch
"@shipload/image-renderer": patch
"@shipload/item-renderer": patch
"@shipload/sdk": patch
---

- Formatting
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
