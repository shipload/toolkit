---
"@shipload/cli": patch
"@shipload/image-renderer": patch
"@shipload/item-renderer": patch
"@shipload/sdk": patch
---

- Fix baseline TS errors blocking CI
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
