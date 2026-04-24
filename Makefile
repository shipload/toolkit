API_URL := https://jungle4.greymass.com
PLATFORM_ACCOUNT := platform.gm
SERVER_ACCOUNT := shipload.gm

codegen:
	bunx @wharfkit/cli generate -u $(API_URL) $(PLATFORM_ACCOUNT) -f src/contracts/platform.ts
	bunx @wharfkit/cli generate -u $(API_URL) $(SERVER_ACCOUNT) -f src/contracts/server.ts

check:
	bun run check

format:
	bun run format

test:
	bun test

install:
	bun install

.PHONY: codegen check format test install

# User-facing binary targets. Output: dist/shiploadcli-<target>[.exe]
# Bun's --compile target identifiers use `bun-darwin-*`; we map mac→darwin internally.
BINARY_TARGETS := linux-x64 linux-arm64 mac-x64 mac-arm64 windows-x64
DIST := dist

# Build a single binary. Usage: make binary TARGET=mac-arm64
binary:
	@if [ -z "$(TARGET)" ]; then echo "usage: make binary TARGET=mac-arm64 (one of: $(BINARY_TARGETS))"; exit 1; fi
	@mkdir -p $(DIST)
	@BUN_TARGET=bun-$$(echo $(TARGET) | sed 's/^mac/darwin/'); \
	EXT=$$(if echo $(TARGET) | grep -q windows; then echo .exe; fi); \
	OUT=$(DIST)/shiploadcli-$(TARGET)$$EXT; \
	echo "Building $$OUT (bun target: $$BUN_TARGET)"; \
	bun build src/index.ts --compile --target=$$BUN_TARGET --outfile $$OUT

# Build all five binaries.
binaries:
	@mkdir -p $(DIST)
	@for t in $(BINARY_TARGETS); do \
		$(MAKE) --no-print-directory binary TARGET=$$t || exit 1; \
	done
	@ls -lh $(DIST)

.PHONY: binary binaries

release:
	@./scripts/release.sh

.PHONY: release
