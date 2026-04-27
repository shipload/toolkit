SHELL := /usr/bin/env bash
BIN   := ./node_modules/.bin

.PHONY: dev
dev: node_modules
	bun run scripts/preview.ts

.PHONY: test
test: node_modules
	bun test

.PHONY: test-pixel
test-pixel: node_modules
	bun test test/pixel.test.ts

.PHONY: test-update
test-update: node_modules
	UPDATE_IMAGE_SNAPSHOTS=1 bun test --update-snapshots

.PHONY: typecheck
typecheck: node_modules
	$(BIN)/tsc --noEmit

.PHONY: lint
lint: node_modules
	$(BIN)/biome check src test scripts

.PHONY: format
format: node_modules
	$(BIN)/biome format --write src test scripts

.PHONY: bundle-check
bundle-check: node_modules
	bun run scripts/check-bundle-size.ts

.PHONY: fonts
fonts: node_modules
	bun run scripts/copy-fonts.ts

.PHONY: check
check: typecheck lint test bundle-check

.PHONY: clean
clean:
	rm -rf node_modules bun.lock

node_modules: package.json
	bun install
	bun link @shipload/sdk
	@touch $@
