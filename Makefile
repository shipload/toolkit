SHELL := /usr/bin/env bash
PATH  := ./node_modules/.bin:$(PATH)

SRC_FILES := $(shell find src -name '*.ts')
TEST_FILES := $(shell find test/tests -name '*.ts')
BIN := ./node_modules/.bin
MOCHA_OPTS := -u tdd -r ts-node/register -r tsconfig-paths/register --extension ts
NYC_OPTS := --temp-dir build/nyc_output --report-dir build/coverage

.PHONY: build
build: lib

lib: ${SRC_FILES} package.json tsconfig.json node_modules rollup.config.js
	@${BIN}/rollup -c && touch lib

.PHONY: dev
dev: node_modules
	@onchange -k -i 'src/**/*.ts' 'config/*' -- ${BIN}/rollup -c && touch lib

.PHONY: test
test: node_modules
	@TS_NODE_PROJECT='./test/tsconfig.json' MOCK_DIR='./test/data' \
		${BIN}/mocha ${MOCHA_OPTS} ${TEST_FILES} --no-timeout --grep '$(grep)'

test/watch: node_modules
	@TS_NODE_PROJECT='./test/tsconfig.json' \
		${BIN}/mocha --watch ${MOCHA_OPTS} ${TEST_FILES} --no-timeout --grep '$(grep)'

build/coverage: ${SRC_FILES} ${TEST_FILES} node_modules
	@TS_NODE_PROJECT='./test/tsconfig.json' MOCK_DIR='./test/data' \
		${BIN}/nyc ${NYC_OPTS} --reporter=html \
		${BIN}/mocha ${MOCHA_OPTS} -R nyan ${TEST_FILES}

.PHONY: coverage
coverage: build/coverage
	@open build/coverage/index.html

.PHONY: ci-test
ci-test: node_modules
	@TS_NODE_PROJECT='./test/tsconfig.json' MOCK_DIR='./test/data' \
		${BIN}/nyc ${NYC_OPTS} --reporter=text \
		${BIN}/mocha ${MOCHA_OPTS} -R list ${TEST_FILES}

.PHONY: check
check: node_modules
	@${BIN}/eslint src test --ext .ts --max-warnings 0 --format unix && echo "Ok"

.PHONY: format
format: node_modules
	@${BIN}/eslint src test --ext .ts --fix

.PHONY: docs
docs: build/docs
	@open build/docs/index.html

build/docs: $(SRC_FILES) node_modules
	@${BIN}/typedoc --out build/docs \
		--excludeInternal --excludePrivate --excludeProtected \
		--includeVersion --hideGenerator --readme none \
		src/index.ts

build/pages: build/coverage build/docs
	@mkdir -p build/pages
	@cp -r build/docs/* build/pages/
	@cp -r build/coverage build/pages/coverage

.PHONY: deploy-pages
deploy-pages: | clean lib build/pages node_modules
	@${BIN}/gh-pages -d build/pages

build/browser.html: $(SRC_FILES) $(TEST_FILES) test/rollup.config.js node_modules
	@${BIN}/rollup -c test/rollup.config.js

node_modules:
	yarn install --non-interactive --frozen-lockfile --ignore-scripts

.PHONY: clean
clean:
	rm -rf lib/ build/ build/browser.html

.PHONY: distclean
distclean: clean
	rm -rf node_modules/

.PHONY: codegen
codegen: codegen/platform codegen/server

codegen/platform:
	npx @wharfkit/cli generate --url https://jungle4.greymass.com --file ./src/contracts/platform.ts platform.gm

codegen/server:
	npx @wharfkit/cli generate --url https://jungle4.greymass.com --file ./src/contracts/server.ts shipload.gm
