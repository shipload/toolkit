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

.PHONY: check
check: node_modules
	./node_modules/.bin/tsc --noEmit

.PHONY: clean
clean:
	rm -rf node_modules .wrangler

node_modules:
	@cd ../.. && bun install
