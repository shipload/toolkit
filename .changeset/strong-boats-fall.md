---
"@shipload/cli": patch
"@shipload/image-renderer": patch
"@shipload/item-renderer": patch
"@shipload/oracle": patch
"@shipload/sdk": patch
---

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
- Move the oracle quorum threshold with the deployer commands
- Make isLocationBuildable true for asteroids, nebulae, and ice fields
- Add the deployer onboard and offboard oracle commands
- Add the oracle setup command and the admission waiting state
- Clamp the SDK epoch height to 0 before a future game start
- Expose civicshuttle and cancelcivic through the SDK
- Regenerate bindings for civicshuttle and cancelcivic
- Fit the Depot expectations and labels to two shuttle bays
- Sync the catalog for the two-bay Depot
