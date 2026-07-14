---
"@shipload/cli": patch
"@shipload/image-renderer": patch
"@shipload/item-renderer": patch
"@shipload/oracle": patch
"@shipload/sdk": patch
---

- Surface the builder capability in the CLI and item renderer
- Update item-renderer tests for rebalanced formulas and workshop icon
- Add workshop entity and drop-off craft job support
- Add roster-expansion ships to SDK catalog and item renderer
- Refresh item-renderer fixtures for the Ship rename
- Add T1 ship family to SDK catalog and item renderer
- Multi-oracle epoch system
- Add script to preseed secret
- Update Dockerfile
- Migrated shipload/oracle into toolkit
- Pass the scan provider into the system graph
- Rebalance ship travel and logistics
- Reword travel recharge help text
- Estimate gathers with the gatherplan cycle model
- Gather command submits one gatherplan action
- Rename travelroute builder to travelplan
- Mirror task couplings remodel and fix task enum drift
- Mirror energy denomination in the SDK and CLI
- Formatting
- Use five hull stat channels
- add godot parity fixture generator
- Mirror the builder capability in the SDK
- Add Workshop module slot labels
- Update SDK tests for reordered ship slot layouts
- Update T2 ship data
- Update SDK tests for rebalanced formulas and task couplings
- Remove bundleGather
- Add shuttle action helper and TaskType to the SDK
- Export hullmass helpers and resync catalog
- Remove flattenGatherPlan
- Add gatherplan action builder
- Mirror per-hull base hullmass in SDK
- Update hauler drain expectation to whole units
- Re-baseline gather planner fixtures to milli-energy
- Show whole-unit energy in resolved item attributes
- Update recipe-usage expectations for the T1 ship family
- Add capacity computation to other ships
