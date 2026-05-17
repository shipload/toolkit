---
"@shipload/cli": patch
"@shipload/image-renderer": patch
"@shipload/item-renderer": patch
"@shipload/oracle": patch
"@shipload/sdk": patch
---

- Reducing current item prefix/adjectives to just resources
- Add script to preseed secret
- Update Dockerfile
- Migrated shipload/oracle into toolkit
- Fixed name differences in tests
- Removing entity type guards from most commands
- recharge/auto-recharge on more commands
- add --all and --from flags to cancel command
- Crafting recharge/auto
- Broaden cannot cancel error message
- Fix worker bundling w/ bun binary
