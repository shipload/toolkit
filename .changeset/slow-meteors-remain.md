---
"@shipload/cli": patch
"@shipload/image-renderer": patch
"@shipload/item-renderer": patch
"@shipload/oracle": patch
"@shipload/sdk": patch
---

- Gate the oracle maintenance sweeps on contract reads
- Add the voteready ballot settlement tick
- Add mintready, charterready and tend heartbeat ticks
- Multi-oracle epoch system
- Add script to preseed secret
- Update Dockerfile
- Migrated shipload/oracle into toolkit
- Update the CLI wrap test for the default RAM claim
- Add craftjob command
- Improve oracle loop error descriptions
- Fix nftinfo rendering of typed chain rows
- Fix recipe list pagination overflow
- Add influence crank readiness reads to the SDK
- Import ContractKit by name so SSR resolves it
