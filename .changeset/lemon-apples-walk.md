---
"@shipload/cli": patch
"@shipload/image-renderer": patch
"@shipload/item-renderer": patch
"@shipload/oracle": patch
"@shipload/sdk": patch
---

- Preflight platform fund collection in oracle maintenance
- Format the oracle race classifier test
- Treat a lost reveal race as a normal beacon outcome
- Close an overdue epoch from the oracle beacon tick
- Mirror the ranked ballot in the SDK and page the oracle settlement
- Inline the base tsconfig into every package
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
- Point the CLI tests at the tier 2 catalog
- Resync the catalog and resolve capacity formulas from it
- Restrict legacy Workshop cancellation
- Name the far endpoint and carrier on shuttle holds
- Match cancellation to the selected booking
- Route job cancellation through the ship or cancelcraft from one helper
- Book Workshop jobs without a socket and read the window receipt
- Key item metadata by family instead of item id
- Project cargomass against the unapplied schedule
- Add a blenddepot action helper
- Sync the task type catalog into the SDK
