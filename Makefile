SHELL := /usr/bin/env bash

.PHONY: install check check/sdk check/item-renderer check/image-renderer check/cli
.PHONY: test test/sdk test/item-renderer test/image-renderer test/cli
.PHONY: build build/sdk build/item-renderer build/image-renderer build/cli
.PHONY: dev/sdk dev/item-renderer dev/image-renderer dev/cli
.PHONY: format codegen sync/catalog
.PHONY: changeset release-status release release/cli
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
	bun changeset

release-status:
	bun changeset status --verbose

release:
	@./scripts/preflight-release.sh
	$(MAKE) check
	$(MAKE) test
	$(MAKE) build
	bun changeset version
	git add .
	git commit -m "chore: version packages"
	bun changeset publish
	git push --follow-tags

release/cli:
	$(MAKE) -C packages/cli release

clean:
	bun --filter='@shipload/*' run clean || true
	rm -rf node_modules
