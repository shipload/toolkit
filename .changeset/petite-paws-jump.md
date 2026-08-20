---
"@shipload/cli": patch
"@shipload/image-renderer": patch
"@shipload/item-renderer": patch
"@shipload/oracle": patch
"@shipload/sdk": patch
---

- Add the voteready ballot settlement tick
- Add mintready, charterready and tend heartbeat ticks
- Multi-oracle epoch system
- Add script to preseed secret
- Update Dockerfile
- Migrated shipload/oracle into toolkit
- Sync the depot into the catalog and entity mirrors
- Supporting build plot abandon
- Sync the Cargo Hold and Battery Bank T2 module catalog and SDK mirror
- Mirror module tier slopes in the SDK and sync the Engine and Generator T2 catalog
- Scale gatherer yield with module tier
- Add depot action builders and the getdepot read
- Sync the derived depot branch costs into the SDK
- Sync the depot capacity curve and fourteen-node tree into the SDK
- Read location-scoped influence tables through the contract kit
- Add the charter eligibility mirror and vote reads to the SDK
- Generate the charter registry from the synced catalog
- Mirror the re-priced charter root cost
- Mirror the mandate rename in the influence bindings
- Add direction vote action builders and ballot bindings
- Sync the charter tree catalog and add upgrade job builders
- Add influence mirrors, contract bindings and read path to the SDK
- Add contribute task type to scheduling
- Correct coordsToLocationId to the contract's per-axis coordinate bias
