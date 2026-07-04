---
"@shipload/cli": patch
"@shipload/image-renderer": patch
"@shipload/item-renderer": patch
"@shipload/oracle": patch
"@shipload/sdk": patch
---

- Mirror the T2 Hauler and tractor beam tier semantics in the SDK
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
