PNPM ?= pnpm
PNPM_RUN ?= $(PNPM) --config.verify-deps-before-run=false
CARGO ?= cargo

ifeq ($(OS),Windows_NT)
	PLATFORM := windows
	POWERSHELL ?= powershell.exe
	RM_RF = $(POWERSHELL) -NoProfile -ExecutionPolicy Bypass -Command "$(foreach path,$(1),if (Test-Path '$(path)') { Remove-Item -LiteralPath '$(path)' -Recurse -Force -ErrorAction SilentlyContinue };)"
	DOCTOR = $(POWERSHELL) -NoProfile -ExecutionPolicy Bypass -Command "foreach ($$cmd in @('make','pnpm','node','cargo')) { $$found = Get-Command $$cmd -ErrorAction SilentlyContinue; if ($$found) { Write-Host ('[ok] ' + $$cmd + ' -> ' + $$found.Source) } else { Write-Error ('[missing] ' + $$cmd); exit 1 } }"
else
	PLATFORM := unix
	RM_RF = rm -rf $(1)
	DOCTOR = sh -eu -c 'for cmd in make pnpm node cargo; do if command -v "$$cmd" >/dev/null 2>&1; then printf "[ok] %s -> %s\n" "$$cmd" "$$(command -v "$$cmd")"; else printf "[missing] %s\n" "$$cmd" >&2; exit 1; fi; done'
endif

.DEFAULT_GOAL := help

.PHONY: help
help:
	@echo InkNest / Inkline common commands
	@echo Platform: $(PLATFORM)
	@echo.
	@echo Setup:
	@echo   make install          Install frontend dependencies
	@echo   make doctor           Check required local tools
	@echo.
	@echo Development:
	@echo   make dev              Start Vite dev server on port 1420
	@echo   make tauri-dev        Start Tauri desktop dev app
	@echo   make preview          Preview production frontend build
	@echo   make sb               Start Storybook on port 6006
	@echo   make storybook        Start Storybook on port 6006
	@echo.
	@echo Quality:
	@echo   make check            Run Biome checks
	@echo   make format           Run Biome checks and write safe fixes
	@echo   make test             Run Vitest once
	@echo   make test-watch       Run Vitest in watch mode
	@echo   make coverage         Run Vitest with coverage thresholds
	@echo   make storybook-build  Build Storybook
	@echo   make rust-check       Run cargo check for Tauri crate
	@echo   make verify           Run check, test, coverage, build, storybook-build, rust-check
	@echo.
	@echo Build:
	@echo   make build            Build frontend
	@echo   make tauri-build      Build Tauri bundles
	@echo.
	@echo Cleanup:
	@echo   make clean            Remove generated frontend outputs
	@echo   make clean-all        Remove frontend outputs and Rust target

.PHONY: install
install:
	$(PNPM) install

.PHONY: doctor
doctor:
	@$(DOCTOR)

.PHONY: dev
dev:
	$(PNPM_RUN) dev

.PHONY: tauri-dev
tauri-dev:
	$(PNPM_RUN) tauri dev

.PHONY: preview
preview:
	$(PNPM_RUN) preview

.PHONY: sb
sb:
	$(PNPM_RUN) sb

.PHONY: storybook
storybook:
	$(PNPM_RUN) storybook

.PHONY: check
check:
	$(PNPM_RUN) check

.PHONY: format
format:
	$(PNPM_RUN) check:write

.PHONY: test
test:
	$(PNPM_RUN) test

.PHONY: test-watch
test-watch:
	$(PNPM_RUN) test:watch

.PHONY: coverage
coverage:
	$(PNPM_RUN) test:coverage

.PHONY: build
build:
	$(PNPM_RUN) build

.PHONY: storybook-build
storybook-build:
	$(PNPM_RUN) storybook:build

.PHONY: rust-check
rust-check:
	$(CARGO) check --manifest-path src-tauri/Cargo.toml

.PHONY: tauri-build
tauri-build:
	$(PNPM_RUN) tauri build

.PHONY: verify
verify: check test coverage build storybook-build rust-check

.PHONY: clean
clean:
	$(call RM_RF,dist coverage storybook-static)

.PHONY: clean-all
clean-all: clean
	$(call RM_RF,src-tauri/target)
