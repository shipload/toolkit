---
"@shipload/cli": patch
"@shipload/image-renderer": patch
"@shipload/item-renderer": patch
"@shipload/oracle": patch
"@shipload/sdk": patch
---

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
- Guide updates + lint
- Match cancel eligibility to the contract
- Sync the repriced ship catalog
- Point init at the agent Guide page
- Exclude dbgxfer from the action sync guard
- Update server.ts
- Mirror energy_after_queue in the SDK
- Mirror the hold-less civic buildings
- Order a launch charge after pending travel
- Derive route barriers in the SDK from the task trait table
- Make the SDK lane predicates agree with timing.cpp and the resolve gates
- Apply the CHARGE and BUILDPLOT energy draw in the SDK projection
- Count finished dock upgrades as resolvable
