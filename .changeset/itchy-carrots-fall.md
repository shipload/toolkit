---
"@shipload/cli": patch
"@shipload/image-renderer": patch
"@shipload/item-renderer": patch
"@shipload/oracle": patch
"@shipload/sdk": patch
---

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
- Drop the builder from claimplot
- Remove the legacy loader mass decode
- Drop the v0.5.0 migration actions from the sandbox bindings
- Plan module swaps on the goal ship and stop crediting other installed modules
- Drop the v0.5.0 migration actions from the server bindings
- Plan upgrades on a chosen ship as upgrade steps
- Format the whitepaper module proofs
- Add whitepaper module formula and storage-burn proofs
