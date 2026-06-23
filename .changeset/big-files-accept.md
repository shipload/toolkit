---
"@shipload/cli": patch
"@shipload/image-renderer": patch
"@shipload/item-renderer": patch
"@shipload/oracle": patch
"@shipload/sdk": patch
---

- Multi-oracle epoch system
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
