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
- Continue client projection from the response anchor
- Carry projected_at through the generated entity type
- Regenerate the server bindings for the dock booking receipt
- Name the civic drop-off duration in the SDK
- Split job cargo by the deposited flag
- Report a job In Line as its own status
- Carry the booking receipt through the SDK
- Apply the drop-off energy cost when projecting
- Carry the job deposited flag through the SDK
- Expose the projection anchor skip as a schedule helper
- Carry the civic deposit and withdraw task type names
- Apply depot, contribute, upgrade and undeploy cargo deltas when projecting
