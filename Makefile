SHELL := /usr/bin/env bash

.PHONY: install check check/sdk check/item-renderer check/image-renderer check/cli check/oracle
.PHONY: test test/sdk test/item-renderer test/image-renderer test/cli test/oracle test/item-renderer/update
.PHONY: build build/sdk build/item-renderer build/image-renderer build/cli build/oracle
.PHONY: dev/sdk dev/item-renderer dev/image-renderer dev/cli dev/oracle
.PHONY: format codegen sync/catalog sync/scan
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
check/oracle:        ; $(MAKE) -C packages/oracle check

test:
	bun --filter='@shipload/*' run test

test/sdk:            ; $(MAKE) -C packages/sdk test
test/item-renderer:  ; $(MAKE) -C packages/item-renderer test
test/item-renderer/update: ; $(MAKE) -C packages/item-renderer test-update
test/image-renderer: ; $(MAKE) -C packages/image-renderer test
test/cli:            ; $(MAKE) -C packages/cli test
test/oracle:         ; $(MAKE) -C packages/oracle test

build:
	bun --filter='@shipload/*' run build

build/sdk:           ; $(MAKE) -C packages/sdk build
build/item-renderer: ; $(MAKE) -C packages/item-renderer build
build/image-renderer:; $(MAKE) -C packages/image-renderer build
build/cli:           ; $(MAKE) -C packages/cli build
build/oracle:        ; $(MAKE) -C packages/oracle build

dev/sdk:             ; $(MAKE) -C packages/sdk dev
dev/oracle:          ; $(MAKE) -C packages/oracle dev

format:
	bun biome check . --write

codegen:
	$(MAKE) -C packages/sdk codegen

sync/catalog:
	$(MAKE) -C packages/sdk sync-catalog CATALOG_SRC=$${CATALOG_SRC:-../../../contracts/build/catalog}

sync/scan:
	$(MAKE) -C packages/sdk sync-scan SCAN_SRC=$${SCAN_SRC:-../../../contracts/build/scan/scan.wasm}

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
	bun install --frozen-lockfile
	$(MAKE) check
	$(MAKE) test
	$(MAKE) build
	bun changeset version
	bun install
	bun biome check packages/*/package.json package.json
	@git add packages/*/package.json packages/*/CHANGELOG.md .changeset bun.lock; \
	if git diff --cached --quiet; then \
		echo "▸ No version changes to commit — changesets already consumed."; \
		echo "▸ If you intended to publish, run 'make publish' next."; \
		exit 0; \
	fi; \
	git commit -m "chore: version packages"; \
	VER=$$(node -p "require('./packages/image-renderer/package.json').version"); \
	TAG="@shipload/image-renderer@$$VER"; \
	if git rev-parse --verify --quiet "refs/tags/$$TAG" >/dev/null; then \
		echo "▸ $$TAG already exists; skipping (image-renderer not bumped this release)"; \
	else \
		git tag -a "$$TAG" -m "Release $$TAG"; \
		echo "▸ Tagged $$TAG"; \
	fi; \
	git push --follow-tags; \
	echo ""; \
	echo "✓ Versions bumped, committed, and pushed."; \
	echo ""; \
	echo "Next: publish to npm (kept separate as a safety gate; may prompt for OTP):"; \
	echo "    make publish"; \
	echo ""
	@echo "Then cut the CLI binary release (uses the version just bumped):"
	@echo "    make release/cli"

publish:
	bun install --frozen-lockfile
	$(MAKE) check
	$(MAKE) build
	@TAG_FLAG=$$(test -f .changeset/pre.json && echo "--tag next" || echo ""); \
	for pkg in packages/*/package.json; do \
		DIR=$$(dirname $$pkg); \
		PRIVATE=$$(node -p "require('./$$pkg').private === true ? 'yes' : 'no'"); \
		if [ "$$PRIVATE" = "yes" ]; then \
			echo "▸ skip $$DIR (private)"; \
			continue; \
		fi; \
		NAME=$$(node -p "require('./$$pkg').name"); \
		VER=$$(node -p "require('./$$pkg').version"); \
		if npm view "$$NAME@$$VER" version >/dev/null 2>&1; then \
			echo "▸ skip $$NAME@$$VER (already published)"; \
			continue; \
		fi; \
		echo "▸ publish $$NAME@$$VER"; \
		bun publish --cwd "$$DIR" --access public $$TAG_FLAG || exit 1; \
	done
	bun changeset tag
	git push --follow-tags

release/cli:
	bun install --frozen-lockfile
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
