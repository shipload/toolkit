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

.PHONY: check
check: node_modules
	$(BIN)/tsc --noEmit

.PHONY: format
format: node_modules
	@cd ../.. && bun biome check packages/item-renderer --write

.PHONY: bundle-check
bundle-check: node_modules
	bun run scripts/check-bundle-size.ts

.PHONY: fonts
fonts: node_modules
	bun run scripts/copy-fonts.ts

.PHONY: clean
clean:
	rm -rf node_modules

node_modules:
	@cd ../.. && bun install
