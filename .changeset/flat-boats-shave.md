---
"@shipload/cli": patch
"@shipload/image-renderer": patch
"@shipload/item-renderer": patch
"@shipload/oracle": patch
"@shipload/sdk": patch
---

- Multi-oracle epoch system
- Add script to preseed secret
- Update Dockerfile
- Migrated shipload/oracle into toolkit
- Test fixes after recipe changes
- Add box and sync scan wasm entrypoints and route the CLI through them
- Pass entity ids to demolish/undeploy builders and hint pending resolve
- Add player roster and entity census commands to the CLI
- Mirror gatherer Resin re-key in SDK
- Share box-scan marshalling and skip the result copy
- Resync scan wasm base64 after debug strip
