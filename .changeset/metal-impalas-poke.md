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
- Restrict legacy Workshop cancellation
- Name the far endpoint and carrier on shuttle holds
- Match cancellation to the selected booking
- Route job cancellation through the ship or cancelcraft from one helper
- Book Workshop jobs without a socket and read the window receipt
- Format reservation client tests
- Match booking estimates to the schedule
- Drop the socket from buildjob and route build cancels
- Expose the Drop-off match and booking ship on job windows
