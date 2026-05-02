SHELL := /usr/bin/env bash

.PHONY: install check check/sdk check/item-renderer check/image-renderer check/cli
.PHONY: test test/sdk test/item-renderer test/image-renderer test/cli
.PHONY: build build/sdk build/item-renderer build/image-renderer build/cli
.PHONY: dev/sdk dev/item-renderer dev/image-renderer dev/cli
.PHONY: format codegen sync/catalog
.PHONY: changeset release-status release publish release/cli
.PHONY: clean

install:
	bun install

check:
	bun biome check .
	bun --filter='@shipload/*' run check

check/sdk:           ; $(MAKE) -C packages/sdk check
check/item-renderer: ; $(MAKE) -C packages/item-renderer check
check/image-renderer:; $(MAKE) -C packages/image-renderer check
check/cli:           ; $(MAKE) -C packages/cli check

test:
	bun --filter='@shipload/*' run test

test/sdk:            ; $(MAKE) -C packages/sdk test
test/item-renderer:  ; $(MAKE) -C packages/item-renderer test
test/image-renderer: ; $(MAKE) -C packages/image-renderer test
test/cli:            ; $(MAKE) -C packages/cli test

build:
	bun --filter='@shipload/*' run build

build/sdk:           ; $(MAKE) -C packages/sdk build
build/item-renderer: ; $(MAKE) -C packages/item-renderer build
build/image-renderer:; $(MAKE) -C packages/image-renderer build
build/cli:           ; $(MAKE) -C packages/cli build

dev/sdk:             ; $(MAKE) -C packages/sdk dev

format:
	bun biome check . --write

codegen:
	$(MAKE) -C packages/sdk codegen

sync/catalog:
	$(MAKE) -C packages/sdk sync-catalog CATALOG_SRC=$${CATALOG_SRC:-../../../game/build/catalog}

changeset:
	$(MAKE) check
	$(MAKE) test
	@bun changeset add --message="$$(bun scripts/changeset-from-git.ts)"
	@NEW=$$(git status --porcelain .changeset 2>/dev/null | grep -E '^\?\? .*\.md$$' | sed 's/^?? //'); \
	if [ -z "$$NEW" ]; then \
		echo "No new changeset created."; \
		exit 0; \
	fi; \
	git add -- $$NEW && git commit -m "chore: add changeset" -- $$NEW; \
	echo ""; \
	echo "✓ Committed $$NEW"
	@echo ""
	@echo "Next steps:"
	@echo "  1. git push                 — share the changeset"
	@echo "  2. make release             — bump versions, tag, push"
	@echo "  3. make publish             — publish npm packages (npm OTP)"
	@echo "  4. make release/cli         — cut CLI binaries + GitHub release"

release-status:
	bun changeset status --verbose

release:
	@./scripts/preflight-release.sh
	$(MAKE) check
	$(MAKE) test
	$(MAKE) build
	bun changeset version
	bun biome format packages/*/package.json --write
	git add .
	git commit -m "chore: version packages"
	@VER=$$(node -p "require('./packages/image-renderer/package.json').version"); \
	git tag -a "@shipload/image-renderer@$$VER" -m "Release @shipload/image-renderer@$$VER"
	git push --follow-tags
	@echo ""
	@echo "✓ Versions bumped, committed, and pushed."
	@echo ""
	@echo "Next: publish to npm (kept separate as a safety gate; may prompt for OTP):"
	@echo "    make publish"
	@echo ""
	@echo "Then cut the CLI binary release (uses the version just bumped):"
	@echo "    make release/cli"

publish:
	bun changeset publish
	git push --follow-tags

release/cli:
	@if [ -n "$(VERSION)" ] || [ -n "$(BUMP)" ]; then \
		$(MAKE) -C packages/cli release; \
	else \
		VER=$$(node -p "require('./packages/cli/package.json').version"); \
		echo "▸ Using current package.json version: $$VER"; \
		$(MAKE) -C packages/cli release VERSION=$$VER; \
	fi

clean:
	bun --filter='@shipload/*' run clean || true
	rm -rf node_modules
