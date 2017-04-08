ci: type lint test

init: node_modules flow-typed

node_modules:
	yarn install

flow-typed: node_modules
	./node_modules/.bin/flow-typed install

build: node_modules
	./node_modules/.bin/babel src --out-dir dist/src

test: node_modules
	./node_modules/.bin/jest

type: flow-typed node_modules
	./node_modules/.bin/flow status

lint: node_modules
	./node_modules/.bin/eslint src test

docs: node_modules
	./node_modules/.bin/documentation build \
		src/** src/* -f html -o docs --document-exported

watch:
	@which watchman-make > /dev/null || ( echo 'install watchman' && exit 1 )
	watchman-make -p 'src/**/*.js' 'src/*.js' 'test/**/*.js' 'test/*.js' -t ci

clean:
	rm -rf flow-typed
	rm -rf node_modules
	rm -rf dist
	rm -rf docs

.PHONY: watch ci init build clean docs type lint test