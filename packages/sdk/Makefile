SHELL := /usr/bin/env bash
PATH  := ./node_modules/.bin:$(PATH)

SRC_FILES := $(shell find src -name '*.ts')
BIN := ./node_modules/.bin

.PHONY: build
build: lib

lib: ${SRC_FILES} package.json tsconfig.json node_modules rollup.config.js
	@bunx rollup -c && touch lib

CATALOG_SRC ?= ../../../contracts/build/catalog

.PHONY: sync-catalog
sync-catalog:
	@if [ ! -d "$(CATALOG_SRC)" ]; then \
		echo "Error: $(CATALOG_SRC) not found. Run 'make' in contracts/ first."; \
		exit 1; \
	fi
	cp $(CATALOG_SRC)/items.json         src/data/items.json
	cp $(CATALOG_SRC)/recipes.json       src/data/recipes.json
	cp $(CATALOG_SRC)/entities.json      src/data/entities.json
	cp $(CATALOG_SRC)/item-ids.ts        src/data/item-ids.ts
	cp $(CATALOG_SRC)/kind-registry.json src/data/kind-registry.json
	@echo "Catalog synced from $(CATALOG_SRC)"

ATOMICASSETS_ABI_SRC ?= ../../../atomicassets-contract/atomicassets.abi

.PHONY: sync-abi
sync-abi:
	@if [ ! -f "$(ATOMICASSETS_ABI_SRC)" ]; then \
		echo "Error: $(ATOMICASSETS_ABI_SRC) not found. Build atomicassets-contract first."; \
		exit 1; \
	fi
	cp $(ATOMICASSETS_ABI_SRC) src/nft/atomicassets.abi.json
	@echo "AtomicAssets ABI synced from $(ATOMICASSETS_ABI_SRC)"

.PHONY: dev
dev: node_modules
	@onchange -k -i 'src/**/*.ts' 'config/*' -- ${BIN}/rollup -c && touch lib

.PHONY: test
test: node_modules
	@MOCK_DIR='./test/data' bun test ./test/tests/*.ts ./test/*.test.ts ./test/resolution/*.test.ts ./test/nft/*.test.ts ./test/derivation/*.test.ts $(if $(grep),--test-name-pattern='$(grep)')

.PHONY: test/watch
test/watch: node_modules
	@MOCK_DIR='./test/data' bun test --watch ./test/tests/*.ts ./test/*.test.ts ./test/resolution/*.test.ts ./test/nft/*.test.ts ./test/derivation/*.test.ts $(if $(grep),--test-name-pattern='$(grep)')

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

CODEGEN_URL      ?= https://jungle4.greymass.com
PLATFORM_ACCOUNT ?= nex.shipload
SERVER_ACCOUNT   ?= eon.shipload

.PHONY: codegen
codegen: codegen/platform codegen/server

codegen/platform:
	bunx @wharfkit/cli generate --url $(CODEGEN_URL) --file ./src/contracts/platform.ts $(PLATFORM_ACCOUNT)

codegen/server:
	bunx @wharfkit/cli generate --url $(CODEGEN_URL) --file ./src/contracts/server.ts $(SERVER_ACCOUNT)

SERVER_ABI_LOCAL ?= ../../../contracts/src/server/build/server.abi

codegen/server/local:
	bunx @wharfkit/cli generate --json $(SERVER_ABI_LOCAL) --file ./src/contracts/server.ts $(SERVER_ACCOUNT)
