SHELL := /usr/bin/env bash

.PHONY: dev
dev: node_modules
	bunx wrangler dev

.PHONY: deploy
deploy: node_modules
	bunx wrangler deploy

.PHONY: test
test: node_modules
	bun run test

.PHONY: typecheck
typecheck: node_modules
	./node_modules/.bin/tsc --noEmit

.PHONY: check
check: typecheck test

.PHONY: clean
clean:
	rm -rf node_modules bun.lock .wrangler

node_modules: package.json
	bun install
	bun link @shipload/item-renderer
	bun link @shipload/sdk
	@touch $@
