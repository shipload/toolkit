SHELL := /usr/bin/env bash
PATH  := ./node_modules/.bin:$(PATH)

SRC_FILES := $(shell find src -name '*.ts')
BIN := ./node_modules/.bin

.PHONY: build
build: lib

lib: ${SRC_FILES} package.json tsconfig.json node_modules rollup.config.js
	@${BIN}/rollup -c && touch lib

CATALOG_SRC ?= ../game/build/catalog

.PHONY: sync-catalog
sync-catalog:
	@if [ ! -d "$(CATALOG_SRC)" ]; then \
		echo "Error: $(CATALOG_SRC) not found. Run 'make' in game/ first."; \
		exit 1; \
	fi
	cp $(CATALOG_SRC)/items.json    src/data/items.json
	cp $(CATALOG_SRC)/recipes.json  src/data/recipes.json
	cp $(CATALOG_SRC)/entities.json src/data/entities.json
	cp $(CATALOG_SRC)/item-ids.ts   src/data/item-ids.ts
	@echo "Catalog synced from $(CATALOG_SRC)"

.PHONY: dev
dev: node_modules
	@onchange -k -i 'src/**/*.ts' 'config/*' -- ${BIN}/rollup -c && touch lib

.PHONY: test
test: node_modules
	@MOCK_DIR='./test/data' bun test ./test/tests/*.ts ./test/*.test.ts ./test/resolution/*.test.ts $(if $(grep),--test-name-pattern='$(grep)')

.PHONY: test/watch
test/watch: node_modules
	@MOCK_DIR='./test/data' bun test --watch ./test/tests/*.ts ./test/*.test.ts ./test/resolution/*.test.ts $(if $(grep),--test-name-pattern='$(grep)')

.PHONY: check
check: node_modules
	@${BIN}/tsc --noEmit

.PHONY: format
format: node_modules
	@cd ../.. && bun biome check packages/sdk --write

.PHONY: docs
docs: build/docs
	@open build/docs/index.html

build/docs: $(SRC_FILES) node_modules
	@${BIN}/typedoc --out build/docs \
		--excludeInternal --excludePrivate --excludeProtected \
		--includeVersion --hideGenerator --readme none \
		src/index.ts

node_modules:
	@cd ../.. && bun install

.PHONY: clean
clean:
	rm -rf lib/ build/

.PHONY: distclean
distclean: clean
	rm -rf node_modules/

.PHONY: codegen
codegen: codegen/platform codegen/server

codegen/platform:
	bunx @wharfkit/cli generate --url https://jungle4.greymass.com --file ./src/contracts/platform.ts platform.gm

codegen/server:
	bunx @wharfkit/cli generate --url https://jungle4.greymass.com --file ./src/contracts/server.ts shipload.gm
