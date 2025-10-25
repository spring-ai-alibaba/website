# Makefile for managing versioned documentation
# ====================================================================================================
# 版本管理命令
# ====================================================================================================

# 颜色定义
LOG_TARGET = echo -e "\033[0;32m===========> Running $@ ... \033[0m"
LOG_INFO = echo -e "\033[0;34m[INFO]\033[0m"
LOG_SUCCESS = echo -e "\033[0;32m[SUCCESS]\033[0m"
LOG_ERROR = echo -e "\033[0;31m[ERROR]\033[0m"

# 版本化文档的基础目录
VERSIONED_DOCS_DIR := docs-versioned
AGENT_FRAMEWORK_DIR := $(VERSIONED_DOCS_DIR)/agent-framework
GRAPH_CORE_DIR := $(VERSIONED_DOCS_DIR)/graph-core

# 英文版本 i18n 目录
I18N_EN_DIR := i18n/en
I18N_EN_AGENT_DIR := $(I18N_EN_DIR)/docusaurus-plugin-content-docs-agent-framework
I18N_EN_GRAPH_DIR := $(I18N_EN_DIR)/docusaurus-plugin-content-docs-graph-core

##@ Versioning

.PHONY: version-create-agent
version-create-agent: ## Create a new version for agent-framework (usage: make version-create-agent VERSION=1.0)
version-create-agent:
	@$(LOG_TARGET)
	@if [ -z "$(VERSION)" ]; then \
		$(LOG_ERROR) "VERSION is not set. Usage: make version-create-agent VERSION=1.0"; \
		exit 1; \
	fi
	@$(LOG_INFO) "Creating version $(VERSION) for agent-framework..."
	@mkdir -p $(AGENT_FRAMEWORK_DIR)/$(VERSION)
	@if [ -d "$(AGENT_FRAMEWORK_DIR)/current" ]; then \
		$(LOG_INFO) "Copying current version to $(VERSION)..."; \
		cp -r $(AGENT_FRAMEWORK_DIR)/current/* $(AGENT_FRAMEWORK_DIR)/$(VERSION)/; \
		$(LOG_SUCCESS) "Version $(VERSION) created successfully for agent-framework"; \
	else \
		$(LOG_ERROR) "Current version does not exist. Please ensure $(AGENT_FRAMEWORK_DIR)/current exists."; \
		exit 1; \
	fi

.PHONY: version-create-graph
version-create-graph: ## Create a new version for graph-core (usage: make version-create-graph VERSION=1.0)
version-create-graph:
	@$(LOG_TARGET)
	@if [ -z "$(VERSION)" ]; then \
		$(LOG_ERROR) "VERSION is not set. Usage: make version-create-graph VERSION=1.0"; \
		exit 1; \
	fi
	@$(LOG_INFO) "Creating version $(VERSION) for graph-core..."
	@mkdir -p $(GRAPH_CORE_DIR)/$(VERSION)
	@if [ -d "$(GRAPH_CORE_DIR)/current" ]; then \
		$(LOG_INFO) "Copying current version to $(VERSION)..."; \
		cp -r $(GRAPH_CORE_DIR)/current/* $(GRAPH_CORE_DIR)/$(VERSION)/; \
		$(LOG_SUCCESS) "Version $(VERSION) created successfully for graph-core"; \
	else \
		$(LOG_ERROR) "Current version does not exist. Please ensure $(GRAPH_CORE_DIR)/current exists."; \
		exit 1; \
	fi

.PHONY: version-list-agent
version-list-agent: ## List all versions of agent-framework
version-list-agent:
	@$(LOG_TARGET)
	@$(LOG_INFO) "Available versions for agent-framework:"
	@if [ -d "$(AGENT_FRAMEWORK_DIR)" ]; then \
		ls -1 $(AGENT_FRAMEWORK_DIR) | sed 's/^/  - /'; \
	else \
		$(LOG_ERROR) "No versions found. Directory $(AGENT_FRAMEWORK_DIR) does not exist."; \
	fi

.PHONY: version-list-graph
version-list-graph: ## List all versions of graph-core
version-list-graph:
	@$(LOG_TARGET)
	@$(LOG_INFO) "Available versions for graph-core:"
	@if [ -d "$(GRAPH_CORE_DIR)" ]; then \
		ls -1 $(GRAPH_CORE_DIR) | sed 's/^/  - /'; \
	else \
		$(LOG_ERROR) "No versions found. Directory $(GRAPH_CORE_DIR) does not exist."; \
	fi

.PHONY: version-list
version-list: ## List all versions of both frameworks
version-list: version-list-agent version-list-graph

.PHONY: version-delete-agent
version-delete-agent: ## Delete a version of agent-framework (usage: make version-delete-agent VERSION=1.0)
version-delete-agent:
	@$(LOG_TARGET)
	@if [ -z "$(VERSION)" ]; then \
		$(LOG_ERROR) "VERSION is not set. Usage: make version-delete-agent VERSION=1.0"; \
		exit 1; \
	fi
	@if [ "$(VERSION)" = "current" ]; then \
		$(LOG_ERROR) "Cannot delete 'current' version. This is the main development version."; \
		exit 1; \
	fi
	@$(LOG_INFO) "Deleting version $(VERSION) for agent-framework..."
	@if [ -d "$(AGENT_FRAMEWORK_DIR)/$(VERSION)" ]; then \
		rm -rf $(AGENT_FRAMEWORK_DIR)/$(VERSION); \
		$(LOG_SUCCESS) "Version $(VERSION) deleted successfully for agent-framework"; \
	else \
		$(LOG_ERROR) "Version $(VERSION) does not exist."; \
		exit 1; \
	fi

.PHONY: version-delete-graph
version-delete-graph: ## Delete a version of graph-core (usage: make version-delete-graph VERSION=1.0)
version-delete-graph:
	@$(LOG_TARGET)
	@if [ -z "$(VERSION)" ]; then \
		$(LOG_ERROR) "VERSION is not set. Usage: make version-delete-graph VERSION=1.0"; \
		exit 1; \
	fi
	@if [ "$(VERSION)" = "current" ]; then \
		$(LOG_ERROR) "Cannot delete 'current' version. This is the main development version."; \
		exit 1; \
	fi
	@$(LOG_INFO) "Deleting version $(VERSION) for graph-core..."
	@if [ -d "$(GRAPH_CORE_DIR)/$(VERSION)" ]; then \
		rm -rf $(GRAPH_CORE_DIR)/$(VERSION); \
		$(LOG_SUCCESS) "Version $(VERSION) deleted successfully for graph-core"; \
	else \
		$(LOG_ERROR) "Version $(VERSION) does not exist."; \
		exit 1; \
	fi

.PHONY: version-update-config
version-update-config: ## Update version configuration in docusaurus.config.ts
version-update-config:
	@$(LOG_TARGET)
	@$(LOG_INFO) "Updating version configuration..."
	@$(LOG_INFO) "Please manually update docusaurus.config.ts to add/remove versions."
	@$(LOG_INFO) "Add version entries in the plugins section for agent-framework and graph-core."

.PHONY: version-init
version-init: ## Initialize versioned documentation structure
version-init:
	@$(LOG_TARGET)
	@$(LOG_INFO) "Initializing versioned documentation structure..."
	@mkdir -p $(AGENT_FRAMEWORK_DIR)/current
	@mkdir -p $(GRAPH_CORE_DIR)/current
	@if [ -d "docs/frameworks/agent-framework" ]; then \
		$(LOG_INFO) "Copying agent-framework docs to versioned directory..."; \
		cp -r docs/frameworks/agent-framework/* $(AGENT_FRAMEWORK_DIR)/current/; \
	fi
	@if [ -d "docs/frameworks/graph-core" ]; then \
		$(LOG_INFO) "Copying graph-core docs to versioned directory..."; \
		cp -r docs/frameworks/graph-core/* $(GRAPH_CORE_DIR)/current/; \
	fi
	@$(LOG_SUCCESS) "Versioned documentation structure initialized successfully"

.PHONY: version-sync-current
version-sync-current: ## Sync current docs from docs/frameworks to versioned/current
version-sync-current:
	@$(LOG_TARGET)
	@$(LOG_INFO) "Syncing current documentation..."
	@if [ -d "docs/frameworks/agent-framework" ]; then \
		$(LOG_INFO) "Syncing agent-framework..."; \
		rsync -av --delete docs/frameworks/agent-framework/ $(AGENT_FRAMEWORK_DIR)/current/; \
	fi
	@if [ -d "docs/frameworks/graph-core" ]; then \
		$(LOG_INFO) "Syncing graph-core..."; \
		rsync -av --delete docs/frameworks/graph-core/ $(GRAPH_CORE_DIR)/current/; \
	fi
	@$(LOG_SUCCESS) "Current documentation synced successfully"

.PHONY: version-create-en-placeholders
version-create-en-placeholders: ## Create English placeholder docs for a version (usage: make version-create-en-placeholders VERSION=1.x)
version-create-en-placeholders:
	@$(LOG_TARGET)
	@if [ -z "$(VERSION)" ]; then \
		$(LOG_ERROR) "VERSION is not set. Usage: make version-create-en-placeholders VERSION=1.x"; \
		exit 1; \
	fi
	@$(LOG_INFO) "Creating English placeholders for version $(VERSION)..."
	@mkdir -p $(I18N_EN_AGENT_DIR)/$(VERSION)
	@mkdir -p $(I18N_EN_GRAPH_DIR)/$(VERSION)
	@echo "# Quick Start\n\nEnglish translation needed." > $(I18N_EN_AGENT_DIR)/$(VERSION)/quick-start.md
	@echo "# Quick Start\n\nEnglish translation needed." > $(I18N_EN_GRAPH_DIR)/$(VERSION)/quick-start.md
	@$(LOG_SUCCESS) "English placeholders created for version $(VERSION)"

.PHONY: version-help
version-help: ## Show version management help
version-help:
	@echo ""
	@echo "\033[1m版本管理命令使用说明\033[0m"
	@echo ""
	@echo "\033[36m创建新版本:\033[0m"
	@echo "  make version-create-agent VERSION=1.0  # 为 agent-framework 创建 1.0 版本"
	@echo "  make version-create-graph VERSION=1.0  # 为 graph-core 创建 1.0 版本"
	@echo ""
	@echo "\033[36m列出版本:\033[0m"
	@echo "  make version-list                      # 列出所有框架的版本"
	@echo "  make version-list-agent                # 列出 agent-framework 的版本"
	@echo "  make version-list-graph                # 列出 graph-core 的版本"
	@echo ""
	@echo "\033[36m删除版本:\033[0m"
	@echo "  make version-delete-agent VERSION=1.0  # 删除 agent-framework 的 1.0 版本"
	@echo "  make version-delete-graph VERSION=1.0  # 删除 graph-core 的 1.0 版本"
	@echo ""
	@echo "\033[36m其他命令:\033[0m"
	@echo "  make version-init                      # 初始化版本化文档结构"
	@echo "  make version-sync-current              # 同步当前文档到版本化目录"
	@echo "  make version-update-config             # 提示更新配置文件"
	@echo "  make version-create-en-placeholders VERSION=1.x  # 为版本创建英文占位文档"
	@echo ""
	@echo "\033[1m工作流程:\033[0m"
	@echo "  1. 使用 version-init 初始化版本化结构"
	@echo "  2. 在 docs-versioned/{framework}/current 中编辑文档"
	@echo "  3. 准备发布新版本时，使用 version-create-{framework} 创建版本快照"
	@echo "  4. 使用 version-create-en-placeholders 创建英文占位文档"
	@echo "  5. 在 i18n/en/docusaurus-plugin-content-docs-{framework}/ 中添加英文翻译"
	@echo "  6. 使用 version-update-config 查看如何更新配置"
	@echo ""
