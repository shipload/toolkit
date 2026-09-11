---
"@shipload/cli": patch
"@shipload/image-renderer": patch
"@shipload/item-renderer": patch
"@shipload/oracle": patch
"@shipload/sdk": patch
---

- Read mass units in the CLI and item renderer
- Pad the item card render behind a pad query param
- Add depot and nexus station entity icons
- Inline the base tsconfig into every package
- Mirror the ranked ballot in the SDK and page the oracle settlement
- Collect fund income and market fees on a slow interval
- Collapse an all-idle maintenance pass into one log line
- Log beacon ticks on change and show the next boundary
- Gate the oracle maintenance sweeps on contract reads
- Add the voteready ballot settlement tick
- Add mintready, charterready and tend heartbeat ticks
- Multi-oracle epoch system
- Add script to preseed secret
- Update Dockerfile
- Migrated shipload/oracle into toolkit
- Follow the craftjobs, buildjobs, storage and lockers renames
- Guard zero per-leg reach instead of expecting a throw
- Regenerate bindings for the regenesis debug actions
- Read the player-scoped locker row
- Rename the formatMass parameter to mass
- Read mass in tenths of a tonne
- Read ballotpicks and drop the ballot round field
- Add setunwrapmin to the SDK bindings and action helpers
- Follow the civic table renames and expose world buildings
- Mirror the Nexus as the Tier II advancement node
- Mirror the four-rung charter ladders and the 200 baseline
- Mirror the contract's incoming cargo sources in the SDK
- Mirror civic grants as fittings and add the civic owner predicate
- Mirror the charter id renumbering and module grant rename
- Restore the civic hull items and mirror worker grants
- Mirror the charter grant schema in the SDK
- Mirror per-node charter funding in getCharter
- Add the depot transfer duration mirror
- Mirror the cargo-storage capability in the SDK kind registry
- Drop the eligible flag from the vote options
- Build one Coordinates per strata derivation
- Hash natively under bun
- Regenerate the fund contract for collectfees
- Say cargo, not goods, in the depot charter summaries
- Move charter node display copy into the SDK with a derived-identity guard
- State that planetary structures have no build method
- Regenerate the fund contract for getlots
- Wrap comparison arguments in the storage helpers
- Promote shared game-rule helpers into the SDK
- Add fund token and collect action helpers to the SDK
- Add a chain-sourced fund codegen target
