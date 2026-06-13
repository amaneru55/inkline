# Local Storage

Inkline stores durable local library data in SQLite through Rust/Tauri. The first storage layer is intentionally small: it provides schema initialization plus basic read/write services without building a full frontend library UI.

## SQLite Choice

The current implementation uses `rusqlite 0.40.1` with the `bundled` feature.

`rusqlite` is the better fit for this stage because Inkline needs an embedded, local-first SQLite database with short transactions and simple Tauri command boundaries. It avoids adding an async runtime contract to the storage layer and keeps migrations easy to inspect.

`sqlx 0.9.0` remains a good future option if Inkline later needs async pooled database access, compile-time query checking, or a larger service layer. Those tradeoffs are not necessary for the current local desktop storage foundation.

Official docs checked before adding the dependency:

- `rusqlite`: https://docs.rs/rusqlite/0.40.1/rusqlite/
- `sqlx`: https://docs.rs/sqlx/0.9.0/sqlx/

## Database Path

The database file is resolved with Tauri's app config directory API and named:

```text
library.sqlite3
```

This keeps it beside app configuration while separating business data from `settings.json`.

## Schema Versioning

SQLite `PRAGMA user_version` is the migration anchor.

Version `1` creates:

- `source`
- `manga`
- `chapter`
- `page`
- `library_item`
- `reading_progress`

Future migrations should:

- read the current `user_version`
- run ordered migration steps inside transactions
- update `user_version` only after the step succeeds
- avoid destructive rewrites unless an explicit backup/restore path exists

## Runtime Boundary

Rust owns:

- opening and configuring SQLite
- schema initialization and migrations
- transactions and indexes
- library snapshot writes
- reading progress persistence

Frontend TypeScript owns:

- typed infrastructure adapters
- Zod validation of command responses
- UI state and query orchestration

The frontend must not open SQLite directly and must not use `localStorage` for real library data.

## Local Folder Import

The first import service is path driven. The frontend passes a selected folder path to Rust, and Rust performs the durable work:

- recursively scans the folder
- filters supported image extensions
- naturally sorts page paths
- creates one local source, one manga, one chapter, pages, and one library item
- writes the generated snapshot to SQLite in a transaction
- returns the persisted snapshot as a typed DTO

This layer intentionally does not include the folder picker UI, duplicate handling UI, metadata editing, archive import, or multi-chapter splitting. Those can build on the same storage boundary.

## Current Commands

- `storage_init_database`
- `storage_import_local_folder`
- `storage_upsert_library_snapshot`
- `storage_get_library_snapshot`
- `storage_upsert_reading_progress`
- `storage_get_reading_progress`
