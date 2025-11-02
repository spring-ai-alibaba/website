# Log the running target
LOG_TARGET = echo -e "\033[0;32m===========> Running $@ ... \033[0m"

LINKINATOR_IGNORE := "langchain.com golang.org goproxy.cn wikipedia.org docs.spring.io aliyun.com gov.cn favicon.ico github.com githubusercontent.com example.com github.io gnu.org _print"

##@ Common

.PHONY: install
install: ## Install the dependencies.
install:
	@$(LOG_TARGET)
	@if [ -d "node_modules" ]; then \
		echo "node_modules exists, removing..."; \
		rm -rf node_modules; \
	fi
	@echo "Installing dependencies..."
	npm install

## Tools
.PHONY: install-tools
install-tools:
	@$(LOG_TARGET)
	@echo "Installing tools..."
	npm install -g markdownlint-cli linkinator
	pip install --user yamllint codespell

##@ Docs
.PHONY: preview
preview: ## Start the Docusaurus server in preview mode.
preview:
	@$(LOG_TARGET)

	@if [ -d "node_modules" ]; then \
		echo "Starting Docusaurus server..."; \
		npm start; \
	else \
		echo "node_modules directory does not exist. Please run 'make install' to install dependencies."; \
	fi

.PHONY: preview-en
preview-en: ## Start the Docusaurus server in preview mode for English.
preview-en:
	@$(LOG_TARGET)

	@if [ -d "node_modules" ]; then \
		echo "Starting Docusaurus server..."; \
		npm run start:en; \
	else \
		echo "node_modules directory does not exist. Please run 'make install' to install dependencies."; \
	fi

.PHONY: build
build: ## Build the Docusaurus site.
build:
	@$(LOG_TARGET)
	@if [ -d "public" ]; then \
		echo "public exists, removing..."; \
		rm -rf public; \
	fi
	@echo "Docusaurus start build..."
	npm run build

.PHONY: serve
serve: ## Start Docusaurus site with server mode.
serve: build
serve:
	@$(LOG_TARGET)
	npm run serve

##@ Linter

.PHONY: markdown
markdown: ## Lint Check the markdown files.
markdown:
	@$(LOG_TARGET)
	markdownlint -c tools/linter/markdownlint/markdownlint.yaml "blog/*" "docs/*" "docs-versioned/*"

.PHONY: markdown-fix
markdown-fix: ## Lint Check the markdown files and fix them.
markdown-fix:
	@$(LOG_TARGET)
	markdownlint -c tools/linter/markdownlint/markdownlint.yaml --fix "blog/*" "docs/*" "docs-versioned/*"

.PHONY: yamllint
yamllint: ## Lint Check the yaml files.
yamllint:
	@$(LOG_TARGET)
	yamllint --config-file=tools/linter/yamllint/.yamllint .

.PHONY: codespell
codespell: ## Lint Check the codespell.
codespell: CODESPELL_SKIP := $(shell cat tools/linter/codespell/.codespell.skip | tr \\n ',')
codespell:
	@$(LOG_TARGET)
	codespell --skip $(CODESPELL_SKIP) --ignore-words tools/linter/codespell/.codespell.ignorewords --check-filenames

.PHONY: checklinks
checklinks: ## Check for broken links in the docs
	@$(LOG_TARGET)
	linkinator build -r --concurrency 25 --skip $(LINKINATOR_IGNORE)

.PHONY: -lint
npm-lint: ## Lint Check the npm files.
npm-lint:
	@$(LOG_TARGET)
	npm run lint

.PHONY: npm-lint-fix
npm-lint-fix: ## Lint Check the npm files and fix them.
npm-lint-fix:
	@$(LOG_TARGET)
	npm run lint:fix

.PHONY: pangu-lint
pangu-lint: ## Lint Check the pangu spacing. Usage: make pangu-lint FILE=path/to/file.md or make pangu-lint DIR=docs/
pangu-lint:
	@$(LOG_TARGET)
	@if [ -n "$(FILE)" ]; then \
		echo "Processing file: $(FILE)"; \
		./tools/pangu.sh $(FILE); \
	elif [ -n "$(DIR)" ]; then \
		echo "Processing directory: $(DIR)"; \
		./tools/pangu-batch.sh $(DIR); \
	else \
		echo "Processing all markdown files in docs/ and blog/"; \
		./tools/pangu-batch.sh docs/ blog/; \
	fi 

## help: Show this help info.
.PHONY: help
help:
	@echo "Usage:\n  make \033[36m<Target>\033[0m \n\nTargets:"
	@awk 'BEGIN {FS = ":.*##"; printf ""} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
	@echo "$$USAGE_OPTIONS"
