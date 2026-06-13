# Frontend, Rust, and Validation Boundaries

This document records the current boundary decisions for Inkline. The goal is to keep the reader fast, keep privacy-sensitive work in the right process, and avoid turning the frontend into a hidden backend.

## Current Placement

The current `src/core/library` and `src/core/reader` modules are frontend TypeScript core modules.

They are intentionally pure:

- no React
- no HeroUI, Tailwind, or Motion
- no Tauri command calls
- no filesystem or database access
- no credentials

They define shared product semantics such as `Manga`, `Chapter`, `Page`, folder import plans, reader page navigation, preload windows, and reading progress snapshots. They are not the final storage or import backend.

## Frontend Responsibilities

Frontend TypeScript owns user interaction and lightweight product state:

- UI state, view state, and optimistic interaction state
- reader navigation state, layout preferences, and viewport-adjacent calculations
- pure transformations used by UI, such as natural sorting, filtering, grouping, and display model mapping
- runtime validation at JavaScript boundaries
- React providers, hooks, Storybook stories, component tests, and interaction tests
- calls to Tauri commands through typed infrastructure adapters

Frontend code must not directly access local files, SQLite, credentials, or long-running background jobs.

## Rust Responsibilities

Rust/Tauri owns platform, storage, and heavy work:

- filesystem access, directory scanning, file watching, and path permissions
- archive reading, range reads, and page extraction
- SQLite, migrations, transactions, indexes, and backup/restore primitives
- cache directories, large file lifecycle, and page resource resolution
- background tasks for import, indexing, downloads, OCR, translation, cleanup, and retry
- OS integrations such as menu, tray, windows, app config paths, secure storage, and notifications
- credential-sensitive online source and cloud storage requests
- CPU/GPU-heavy OCR, image processing, cleanup, and embedding pipelines

Rust should return typed data transfer objects to the frontend. Frontend code may validate those DTOs at the boundary before using them.

## Shared Semantics

The frontend core models are allowed to mirror backend DTOs when the shape is part of product semantics.

Examples:

- `Manga`
- `Chapter`
- `Page`
- `LibraryItem`
- `ReadingProgress`
- `ReaderPreferences`
- `FolderImportPlan`

The shared shape should remain stable, serializable, and versionable. Backend persistence models may differ from frontend DTOs when needed for indexes, migrations, or performance.

## Runtime Validation Strategy

Use runtime validation for untrusted or versioned data:

- Tauri command responses entering the frontend
- import/export files
- cloud sync payloads
- backup and restore payloads
- plugin manifests
- online source and cloud adapter configuration
- user-editable settings, theme packages, shortcuts, and reader presets

Do not validate every internal object on every interaction. Once data has crossed a trusted boundary and has been parsed, internal pure functions should use TypeScript types directly.

Performance-sensitive reader paths must not run schema validation per frame, per scroll event, or per page paint.

## Zod Decision

Zod is the preferred TypeScript runtime validation library for frontend boundaries because it provides TypeScript-first schemas, inferred static types, browser support, JSON Schema conversion, and zero external dependencies.

Planned usage:

- define schemas beside boundary DTOs
- export `parse*` or `safeParse*` functions from boundary modules
- use parsed values in app providers, Tauri infrastructure adapters, import/export, and sync code
- keep high-frequency reader internals as plain typed functions

Current status: `zod@4.4.3` was confirmed as the current npm latest version on 2026-06-13 and is installed. During active development, `pnpm-workspace.yaml` sets `minimumReleaseAge` to 60 minutes. Before release, raise the value back to a stricter window such as 1440 minutes.

`allowBuilds` only allows reviewed dependency build scripts. At the moment, `esbuild` is explicitly allowed because it is required by the Vite/Storybook toolchain. Do not enable `dangerouslyAllowAllBuilds`.

## Import Flow Boundary

The target local folder import flow is:

```text
User chooses path in UI
  -> Rust scans the directory and filters permissions
  -> Rust returns candidate file DTOs
  -> Frontend validates DTOs at the boundary
  -> Frontend can preview the import plan
  -> User confirms
  -> Rust writes library records, pages, cache metadata, and tasks to SQLite
  -> Frontend refreshes query data and opens the reader
```

The current TypeScript folder import plan is useful for preview and tests. The authoritative persisted import should be performed by Rust once SQLite exists.

## Reader Flow Boundary

The target reader flow is:

```text
Frontend requests chapter open
  -> Rust resolves page records and page resource handles
  -> Frontend validates chapter/page DTOs
  -> Frontend reader state manages navigation and preload intent
  -> Rust resolves actual page bytes or safe URLs on demand
  -> Frontend renders images and reports progress
  -> Rust persists reading progress
```

The frontend owns immediate navigation responsiveness. Rust owns durable progress, resource resolution, and cache lifecycle.

## Storage Boundary

Local library storage is owned by Rust. The SQLite database lives under the Tauri app config directory as `library.sqlite3`, next to `settings.json` but with a separate lifecycle.

Frontend TypeScript may call storage through typed infrastructure adapters only. It validates Tauri command responses with Zod schemas in `src/core/storage`, then passes parsed DTOs into app state or future query caches. It must not construct SQL, open SQLite files, or use `localStorage` for library data.

Rust owns schema initialization, migrations, transactions, indexes, SQLite pragmas, and durable writes for sources, manga, chapters, pages, library items, and reading progress. The first schema uses `PRAGMA user_version = 1`; future migrations should move monotonically from the current version and keep migration steps idempotent.

Local folder import is also owned by Rust once a folder path is selected. Rust scans, filters, sorts, creates persistence DTOs, and writes the snapshot to SQLite. The frontend may initiate the command and validate the returned snapshot, but it should not perform the authoritative persisted import.
