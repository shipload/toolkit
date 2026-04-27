-include Makefile.local

SIGNING_IDENTITY ?=
NOTARY_PROFILE   ?= shiploadcli
ENTITLEMENTS     := scripts/entitlements.plist

check:
	bun run check

test:
	bun test

install:
	@cd ../.. && bun install

clean:
	rm -rf $(DIST)

.PHONY: check test install clean

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

# Sign + notarize one mac binary. Usage: make sign-one TARGET=mac-arm64
sign-one:
	@if [ -z "$(TARGET)" ]; then echo "usage: make sign-one TARGET=mac-arm64 (or mac-x64)"; exit 1; fi
	@case "$(TARGET)" in mac-x64|mac-arm64) ;; *) echo "error: sign-one TARGET must be mac-x64 or mac-arm64 (got: $(TARGET))"; exit 1 ;; esac
	@SIGNING_IDENTITY="$(SIGNING_IDENTITY)" \
	NOTARY_PROFILE="$(NOTARY_PROFILE)" \
	ENTITLEMENTS="$(ENTITLEMENTS)" \
	./scripts/sign-macos.sh $(DIST)/shiploadcli-$(TARGET)

# Sign + notarize both mac binaries (serial).
sign-mac:
	@$(MAKE) --no-print-directory sign-one TARGET=mac-x64
	@$(MAKE) --no-print-directory sign-one TARGET=mac-arm64

.PHONY: sign-one sign-mac

# Dry-run release: preflight (skip tag check), build, sign, notarize.
# No git mutations, no GitHub upload. Leaves dist/ populated.
release-dry:
	@SIGNING_IDENTITY="$(SIGNING_IDENTITY)" \
	NOTARY_PROFILE="$(NOTARY_PROFILE)" \
	./scripts/preflight.sh --skip-tag
	@$(MAKE) --no-print-directory check
	@$(MAKE) --no-print-directory clean
	@$(MAKE) --no-print-directory binaries
	@$(MAKE) --no-print-directory sign-mac
	@ls -lh $(DIST)
	@echo ""
	@echo "✓ release-dry complete — artifacts in $(DIST)/"
	@echo "  No git mutations, no release published."

.PHONY: release-dry

release:
	@./scripts/release.sh

.PHONY: release
