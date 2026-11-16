---
"@shipload/cli": patch
"@shipload/image-renderer": patch
"@shipload/item-renderer": patch
"@shipload/oracle": patch
"@shipload/sdk": patch
---

- Read ship panel and module colours by capability key
- Close stalled epochs with the beacon's committed secret
- Report an unlinked oracle close as unauthorized
- Tag legacy oracle secrets with the running chain
- Key the oracle secret store to the chain
- Move to Wharf 4.0.2
- Close an overdue epoch as the oracle with fresh entropy
- Move the toolkit to Wharf 4.0.1
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
- Format the SDK module accept and Depot contribute code
- Restate the whitepaper T3 claims
- Mirror the T3 modules in the SDK
- Rebuild the T3 structures to the settled grant
- Add the Depot contribute helper and guard
- Mirror ranked demand and tier peaks in the SDK
- Drop the ship T3 entry cost to 400
- Review the SDK display text before translation
- Mirror the T3 ships and station structures in the SDK
- Add the SDK text registry and translator seam
