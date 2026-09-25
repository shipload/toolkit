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
- Fold shuttle rejections by code and map every contract string
- Mark unresolved shuttle options
- List craft shuttle options in the CLI
- Rename the civic shuttle parameter to shuttled_by
- Accept a carrier for craft jobs in the CLI
- Point the CLI tests at the tier 2 catalog
- Resync the catalog and resolve capacity formulas from it
- Restrict legacy Workshop cancellation
- Name the far endpoint and carrier on shuttle holds
- Match cancellation to the selected booking
- Route job cancellation through the ship or cancelcraft from one helper
- Book Workshop jobs without a socket and read the window receipt
- Map the not-ready and module-busy shuttle rejections
- Regenerate bindings for the resolved shuttle option flag
- Remove the civic shuttle mirror helpers
- Add the shuttle candidate pool filter
- Add the shuttle options manager
- Regenerate bindings for the shuttle queries
- Match construction dock arm output to the workshop
- Format the wrap config setters
- Let civic legs choose what shuttles them in the SDK
- Allow wrap config and costs to be seeded
- Await the game config before building the epoch state
- Allow the deposit config to be seeded
- Accept contract accounts as options
- Share in-flight game and state reads
- Explain cargo valuation factors for contributions
- Add a build-job read to the jobs manager
