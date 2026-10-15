---
"@shipload/cli": patch
"@shipload/image-renderer": patch
"@shipload/item-renderer": patch
"@shipload/oracle": patch
"@shipload/sdk": patch
---

- Draw module figures on item images
- Cache item images for a day behind a per-deploy render cache
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
- Log failed oracle requests with their idle gap and socket error
- Skip recharge for towed group members in estimateGroupTravel
- Word the ship-capped CLI reason for any entity and fix the depot-full test
- Remove the retired job-cap and player-cap shuttle reason codes
- Pool only movers' tractor beams in CLI group travel
- Price CLI estimates through the contract's schedule and travel rules
- Realign CLI travel mirrors with the contract and snapshot the SDK export surface
- Rename the depot allowance copy from player to account
- Print figures in CLI entity and module views and add --raw
- Add civic SCRAP bindings, Shares reads and Collect bundles
- Add depotstore and depottake commands for public Depots
- Regenerate the server bindings without the spent migrations
- Regenerate the server bindings from the deployed v0.3.0 ABI
