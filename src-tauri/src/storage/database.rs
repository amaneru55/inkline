use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};

const DATABASE_FILE_NAME: &str = "library.sqlite3";
const SCHEMA_VERSION: i64 = 1;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseInfo {
    pub path: String,
    pub schema_version: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SourceRef {
    pub id: String,
    pub kind: String,
    pub name: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MangaRecord {
    pub id: String,
    pub title: String,
    pub authors: Vec<String>,
    pub status: String,
    pub source: SourceRef,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ChapterRecord {
    pub id: String,
    pub manga_id: String,
    pub title: String,
    pub index: i64,
    pub source: SourceRef,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PageResource {
    pub kind: String,
    pub path: Option<String>,
    pub archive_path: Option<String>,
    pub entry_path: Option<String>,
    pub url: Option<String>,
    pub key: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PageRecord {
    pub id: String,
    pub chapter_id: String,
    pub index: i64,
    pub resource: PageResource,
    pub display_name: String,
    pub width: Option<i64>,
    pub height: Option<i64>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryItemRecord {
    pub id: String,
    pub manga_id: String,
    pub title: String,
    pub favorite: bool,
    pub tags: Vec<String>,
    pub rating: Option<f64>,
    pub last_read_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LibrarySnapshot {
    pub source: SourceRef,
    pub manga: MangaRecord,
    pub chapters: Vec<ChapterRecord>,
    pub pages: Vec<PageRecord>,
    pub library_item: LibraryItemRecord,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ReadingProgressRecord {
    pub chapter_id: String,
    pub page_id: Option<String>,
    pub page_index: i64,
    pub page_count: i64,
    pub completed: bool,
    pub updated_at: String,
}

#[tauri::command]
pub fn storage_init_database<R: Runtime>(app: AppHandle<R>) -> Result<DatabaseInfo, String> {
    let path = database_path(&app)?;
    initialize_database(&path)
}

#[tauri::command]
pub fn storage_upsert_library_snapshot<R: Runtime>(
    app: AppHandle<R>,
    snapshot: LibrarySnapshot,
) -> Result<LibrarySnapshot, String> {
    let path = database_path(&app)?;
    let mut connection = open_database(&path)?;
    upsert_library_snapshot(&mut connection, &snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
pub fn storage_get_library_snapshot<R: Runtime>(
    app: AppHandle<R>,
    manga_id: String,
) -> Result<Option<LibrarySnapshot>, String> {
    let path = database_path(&app)?;
    let connection = open_database(&path)?;
    get_library_snapshot(&connection, &manga_id)
}

#[tauri::command]
pub fn storage_upsert_reading_progress<R: Runtime>(
    app: AppHandle<R>,
    progress: ReadingProgressRecord,
) -> Result<ReadingProgressRecord, String> {
    let path = database_path(&app)?;
    let mut connection = open_database(&path)?;
    upsert_reading_progress(&mut connection, &progress)?;
    Ok(progress)
}

#[tauri::command]
pub fn storage_get_reading_progress<R: Runtime>(
    app: AppHandle<R>,
    chapter_id: String,
) -> Result<Option<ReadingProgressRecord>, String> {
    let path = database_path(&app)?;
    let connection = open_database(&path)?;
    get_reading_progress(&connection, &chapter_id)
}

pub fn initialize_database(path: &Path) -> Result<DatabaseInfo, String> {
    let connection = open_connection(path)?;
    ensure_schema(&connection)?;

    Ok(DatabaseInfo {
        path: path.to_string_lossy().into_owned(),
        schema_version: SCHEMA_VERSION,
    })
}

fn database_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|path| path.join(DATABASE_FILE_NAME))
        .map_err(|error| format!("Failed to resolve app config directory: {error}"))
}

fn open_database(path: &Path) -> Result<Connection, String> {
    let connection = open_connection(path)?;
    ensure_schema(&connection)?;

    Ok(connection)
}

fn open_connection(path: &Path) -> Result<Connection, String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create database directory: {error}"))?;
    }

    let connection =
        Connection::open(path).map_err(|error| format!("Failed to open database: {error}"))?;
    connection
        .execute_batch(
            "
            PRAGMA foreign_keys = ON;
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            ",
        )
        .map_err(|error| format!("Failed to configure database: {error}"))?;

    Ok(connection)
}

fn ensure_schema(connection: &Connection) -> Result<(), String> {
    let schema_version = current_schema_version(connection)?;

    if schema_version == 0 {
        apply_schema_v1(connection)?;
    } else if schema_version != SCHEMA_VERSION {
        return Err(format!(
            "Unsupported database schema version: {schema_version}"
        ));
    }

    Ok(())
}

fn current_schema_version(connection: &Connection) -> Result<i64, String> {
    connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|error| format!("Failed to read schema version: {error}"))
}

fn apply_schema_v1(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            CREATE TABLE source (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE manga (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                authors_json TEXT NOT NULL,
                status TEXT NOT NULL,
                source_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (source_id) REFERENCES source(id) ON DELETE RESTRICT
            );

            CREATE TABLE chapter (
                id TEXT PRIMARY KEY,
                manga_id TEXT NOT NULL,
                title TEXT NOT NULL,
                chapter_index INTEGER NOT NULL,
                source_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (manga_id) REFERENCES manga(id) ON DELETE CASCADE,
                FOREIGN KEY (source_id) REFERENCES source(id) ON DELETE RESTRICT
            );

            CREATE TABLE page (
                id TEXT PRIMARY KEY,
                chapter_id TEXT NOT NULL,
                page_index INTEGER NOT NULL,
                resource_json TEXT NOT NULL,
                display_name TEXT NOT NULL,
                width INTEGER,
                height INTEGER,
                FOREIGN KEY (chapter_id) REFERENCES chapter(id) ON DELETE CASCADE
            );

            CREATE TABLE library_item (
                id TEXT PRIMARY KEY,
                manga_id TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                favorite INTEGER NOT NULL CHECK (favorite IN (0, 1)),
                tags_json TEXT NOT NULL,
                rating REAL CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
                last_read_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (manga_id) REFERENCES manga(id) ON DELETE CASCADE
            );

            CREATE TABLE reading_progress (
                chapter_id TEXT PRIMARY KEY,
                page_id TEXT,
                page_index INTEGER NOT NULL,
                page_count INTEGER NOT NULL,
                completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
                updated_at TEXT NOT NULL,
                FOREIGN KEY (chapter_id) REFERENCES chapter(id) ON DELETE CASCADE,
                FOREIGN KEY (page_id) REFERENCES page(id) ON DELETE SET NULL
            );

            CREATE INDEX idx_manga_source_id ON manga(source_id);
            CREATE INDEX idx_chapter_manga_order ON chapter(manga_id, chapter_index);
            CREATE INDEX idx_page_chapter_order ON page(chapter_id, page_index);
            CREATE INDEX idx_library_item_updated_at ON library_item(updated_at);
            PRAGMA user_version = 1;
            ",
        )
        .map_err(|error| format!("Failed to initialize database schema: {error}"))
}

fn upsert_library_snapshot(
    connection: &mut Connection,
    snapshot: &LibrarySnapshot,
) -> Result<(), String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Failed to start database transaction: {error}"))?;

    upsert_source(&transaction, &snapshot.source)?;
    upsert_source(&transaction, &snapshot.manga.source)?;
    upsert_manga(&transaction, &snapshot.manga)?;
    for chapter in &snapshot.chapters {
        upsert_source(&transaction, &chapter.source)?;
        upsert_chapter(&transaction, chapter)?;
    }
    for page in &snapshot.pages {
        upsert_page(&transaction, page)?;
    }
    upsert_library_item(&transaction, &snapshot.library_item)?;

    transaction
        .commit()
        .map_err(|error| format!("Failed to commit library snapshot: {error}"))
}

fn upsert_source(connection: &Connection, source: &SourceRef) -> Result<(), String> {
    connection
        .execute(
            "
            INSERT INTO source (id, kind, name)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(id) DO UPDATE SET
                kind = excluded.kind,
                name = excluded.name,
                updated_at = CURRENT_TIMESTAMP
            ",
            params![source.id, source.kind, source.name],
        )
        .map(|_| ())
        .map_err(|error| format!("Failed to upsert source: {error}"))
}

fn upsert_manga(connection: &Connection, manga: &MangaRecord) -> Result<(), String> {
    let authors_json = serialize_json(&manga.authors)?;
    connection
        .execute(
            "
            INSERT INTO manga (id, title, authors_json, status, source_id, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                authors_json = excluded.authors_json,
                status = excluded.status,
                source_id = excluded.source_id,
                updated_at = excluded.updated_at
            ",
            params![
                manga.id,
                manga.title,
                authors_json,
                manga.status,
                manga.source.id,
                manga.created_at,
                manga.updated_at
            ],
        )
        .map(|_| ())
        .map_err(|error| format!("Failed to upsert manga: {error}"))
}

fn upsert_chapter(connection: &Connection, chapter: &ChapterRecord) -> Result<(), String> {
    connection
        .execute(
            "
            INSERT INTO chapter (id, manga_id, title, chapter_index, source_id, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ON CONFLICT(id) DO UPDATE SET
                manga_id = excluded.manga_id,
                title = excluded.title,
                chapter_index = excluded.chapter_index,
                source_id = excluded.source_id,
                updated_at = excluded.updated_at
            ",
            params![
                chapter.id,
                chapter.manga_id,
                chapter.title,
                chapter.index,
                chapter.source.id,
                chapter.created_at,
                chapter.updated_at
            ],
        )
        .map(|_| ())
        .map_err(|error| format!("Failed to upsert chapter: {error}"))
}

fn upsert_page(connection: &Connection, page: &PageRecord) -> Result<(), String> {
    let resource_json = serialize_json(&page.resource)?;
    connection
        .execute(
            "
            INSERT INTO page (id, chapter_id, page_index, resource_json, display_name, width, height)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ON CONFLICT(id) DO UPDATE SET
                chapter_id = excluded.chapter_id,
                page_index = excluded.page_index,
                resource_json = excluded.resource_json,
                display_name = excluded.display_name,
                width = excluded.width,
                height = excluded.height
            ",
            params![
                page.id,
                page.chapter_id,
                page.index,
                resource_json,
                page.display_name,
                page.width,
                page.height
            ],
        )
        .map(|_| ())
        .map_err(|error| format!("Failed to upsert page: {error}"))
}

fn upsert_library_item(connection: &Connection, item: &LibraryItemRecord) -> Result<(), String> {
    let tags_json = serialize_json(&item.tags)?;
    connection
        .execute(
            "
            INSERT INTO library_item (
                id, manga_id, title, favorite, tags_json, rating, last_read_at, created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ON CONFLICT(id) DO UPDATE SET
                manga_id = excluded.manga_id,
                title = excluded.title,
                favorite = excluded.favorite,
                tags_json = excluded.tags_json,
                rating = excluded.rating,
                last_read_at = excluded.last_read_at,
                updated_at = excluded.updated_at
            ",
            params![
                item.id,
                item.manga_id,
                item.title,
                bool_to_i64(item.favorite),
                tags_json,
                item.rating,
                item.last_read_at,
                item.created_at,
                item.updated_at
            ],
        )
        .map(|_| ())
        .map_err(|error| format!("Failed to upsert library item: {error}"))
}

fn get_library_snapshot(
    connection: &Connection,
    manga_id: &str,
) -> Result<Option<LibrarySnapshot>, String> {
    let manga = get_manga(connection, manga_id)?;
    let Some(manga) = manga else {
        return Ok(None);
    };

    let source = manga.source.clone();
    let chapters = get_chapters(connection, manga_id)?;
    let mut pages = Vec::new();
    for chapter in &chapters {
        pages.extend(get_pages(connection, &chapter.id)?);
    }
    let library_item = get_library_item(connection, manga_id)?;

    Ok(Some(LibrarySnapshot {
        source,
        manga,
        chapters,
        pages,
        library_item,
    }))
}

fn get_manga(connection: &Connection, manga_id: &str) -> Result<Option<MangaRecord>, String> {
    connection
        .query_row(
            "
            SELECT
                manga.id,
                manga.title,
                manga.authors_json,
                manga.status,
                manga.created_at,
                manga.updated_at,
                source.id,
                source.kind,
                source.name
            FROM manga
            INNER JOIN source ON source.id = manga.source_id
            WHERE manga.id = ?1
            ",
            params![manga_id],
            |row| {
                let authors_json: String = row.get(2)?;
                Ok(MangaRecord {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    authors: deserialize_json(&authors_json).map_err(json_error_to_sql)?,
                    status: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    source: SourceRef {
                        id: row.get(6)?,
                        kind: row.get(7)?,
                        name: row.get(8)?,
                    },
                })
            },
        )
        .optional()
        .map_err(|error| format!("Failed to read manga: {error}"))
}

fn get_chapters(connection: &Connection, manga_id: &str) -> Result<Vec<ChapterRecord>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
                chapter.id,
                chapter.manga_id,
                chapter.title,
                chapter.chapter_index,
                chapter.created_at,
                chapter.updated_at,
                source.id,
                source.kind,
                source.name
            FROM chapter
            INNER JOIN source ON source.id = chapter.source_id
            WHERE chapter.manga_id = ?1
            ORDER BY chapter.chapter_index ASC
            ",
        )
        .map_err(|error| format!("Failed to prepare chapter query: {error}"))?;

    let rows = statement
        .query_map(params![manga_id], |row| {
            Ok(ChapterRecord {
                id: row.get(0)?,
                manga_id: row.get(1)?,
                title: row.get(2)?,
                index: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                source: SourceRef {
                    id: row.get(6)?,
                    kind: row.get(7)?,
                    name: row.get(8)?,
                },
            })
        })
        .map_err(|error| format!("Failed to read chapters: {error}"))?;

    collect_rows(rows, "chapter")
}

fn get_pages(connection: &Connection, chapter_id: &str) -> Result<Vec<PageRecord>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, chapter_id, page_index, resource_json, display_name, width, height
            FROM page
            WHERE chapter_id = ?1
            ORDER BY page_index ASC
            ",
        )
        .map_err(|error| format!("Failed to prepare page query: {error}"))?;

    let rows = statement
        .query_map(params![chapter_id], |row| {
            let resource_json: String = row.get(3)?;
            Ok(PageRecord {
                id: row.get(0)?,
                chapter_id: row.get(1)?,
                index: row.get(2)?,
                resource: deserialize_json(&resource_json).map_err(json_error_to_sql)?,
                display_name: row.get(4)?,
                width: row.get(5)?,
                height: row.get(6)?,
            })
        })
        .map_err(|error| format!("Failed to read pages: {error}"))?;

    collect_rows(rows, "page")
}

fn get_library_item(connection: &Connection, manga_id: &str) -> Result<LibraryItemRecord, String> {
    connection
        .query_row(
            "
            SELECT id, manga_id, title, favorite, tags_json, rating, last_read_at, created_at, updated_at
            FROM library_item
            WHERE manga_id = ?1
            ",
            params![manga_id],
            |row| {
                let tags_json: String = row.get(4)?;
                let favorite: i64 = row.get(3)?;
                Ok(LibraryItemRecord {
                    id: row.get(0)?,
                    manga_id: row.get(1)?,
                    title: row.get(2)?,
                    favorite: favorite != 0,
                    tags: deserialize_json(&tags_json).map_err(json_error_to_sql)?,
                    rating: row.get(5)?,
                    last_read_at: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
        .map_err(|error| format!("Failed to read library item: {error}"))
}

fn upsert_reading_progress(
    connection: &mut Connection,
    progress: &ReadingProgressRecord,
) -> Result<(), String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Failed to start database transaction: {error}"))?;

    transaction
        .execute(
            "
            INSERT INTO reading_progress (
                chapter_id, page_id, page_index, page_count, completed, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(chapter_id) DO UPDATE SET
                page_id = excluded.page_id,
                page_index = excluded.page_index,
                page_count = excluded.page_count,
                completed = excluded.completed,
                updated_at = excluded.updated_at
            ",
            params![
                progress.chapter_id,
                progress.page_id,
                progress.page_index,
                progress.page_count,
                bool_to_i64(progress.completed),
                progress.updated_at
            ],
        )
        .map_err(|error| format!("Failed to upsert reading progress: {error}"))?;

    transaction
        .commit()
        .map_err(|error| format!("Failed to commit reading progress: {error}"))
}

fn get_reading_progress(
    connection: &Connection,
    chapter_id: &str,
) -> Result<Option<ReadingProgressRecord>, String> {
    connection
        .query_row(
            "
            SELECT chapter_id, page_id, page_index, page_count, completed, updated_at
            FROM reading_progress
            WHERE chapter_id = ?1
            ",
            params![chapter_id],
            |row| {
                let completed: i64 = row.get(4)?;
                Ok(ReadingProgressRecord {
                    chapter_id: row.get(0)?,
                    page_id: row.get(1)?,
                    page_index: row.get(2)?,
                    page_count: row.get(3)?,
                    completed: completed != 0,
                    updated_at: row.get(5)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("Failed to read reading progress: {error}"))
}

fn serialize_json<T: Serialize>(value: &T) -> Result<String, String> {
    serde_json::to_string(value).map_err(|error| format!("Failed to serialize JSON field: {error}"))
}

fn deserialize_json<T: for<'de> Deserialize<'de>>(value: &str) -> Result<T, serde_json::Error> {
    serde_json::from_str(value)
}

fn json_error_to_sql(error: serde_json::Error) -> rusqlite::Error {
    rusqlite::Error::ToSqlConversionFailure(Box::new(error))
}

fn collect_rows<T>(
    rows: rusqlite::MappedRows<'_, impl FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<T>>,
    label: &str,
) -> Result<Vec<T>, String> {
    rows.collect::<rusqlite::Result<Vec<T>>>()
        .map_err(|error| format!("Failed to collect {label} rows: {error}"))
}

fn bool_to_i64(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn initializes_schema_once() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let path = temp_dir.path().join("library.sqlite3");

        let first = initialize_database(&path).expect("first init");
        let second = initialize_database(&path).expect("second init");

        assert_eq!(first.schema_version, 1);
        assert_eq!(second.schema_version, 1);
        assert!(path.exists());
    }

    #[test]
    fn upserts_and_reads_library_snapshot() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let path = temp_dir.path().join("library.sqlite3");
        let mut connection = open_database(&path).expect("database");
        let snapshot = fixture_snapshot();

        upsert_library_snapshot(&mut connection, &snapshot).expect("upsert snapshot");
        let stored = get_library_snapshot(&connection, "manga:one")
            .expect("read snapshot")
            .expect("snapshot exists");

        assert_eq!(stored, snapshot);
    }

    #[test]
    fn upserts_and_reads_reading_progress() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let path = temp_dir.path().join("library.sqlite3");
        let mut connection = open_database(&path).expect("database");
        let snapshot = fixture_snapshot();
        upsert_library_snapshot(&mut connection, &snapshot).expect("upsert snapshot");
        let progress = ReadingProgressRecord {
            chapter_id: "chapter:one".to_string(),
            page_id: Some("page:one".to_string()),
            page_index: 0,
            page_count: 1,
            completed: false,
            updated_at: "2026-06-13T12:00:00Z".to_string(),
        };

        upsert_reading_progress(&mut connection, &progress).expect("upsert progress");
        let stored = get_reading_progress(&connection, "chapter:one")
            .expect("read progress")
            .expect("progress exists");

        assert_eq!(stored, progress);
    }

    fn fixture_snapshot() -> LibrarySnapshot {
        let source = SourceRef {
            id: "source:local".to_string(),
            kind: "local-folder".to_string(),
            name: "Local".to_string(),
        };
        let created_at = "2026-06-13T12:00:00Z".to_string();

        LibrarySnapshot {
            source: source.clone(),
            manga: MangaRecord {
                id: "manga:one".to_string(),
                title: "One".to_string(),
                authors: vec!["A. Writer".to_string()],
                status: "ongoing".to_string(),
                source: source.clone(),
                created_at: created_at.clone(),
                updated_at: created_at.clone(),
            },
            chapters: vec![ChapterRecord {
                id: "chapter:one".to_string(),
                manga_id: "manga:one".to_string(),
                title: "Chapter 1".to_string(),
                index: 0,
                source: source.clone(),
                created_at: created_at.clone(),
                updated_at: created_at.clone(),
            }],
            pages: vec![PageRecord {
                id: "page:one".to_string(),
                chapter_id: "chapter:one".to_string(),
                index: 0,
                resource: PageResource {
                    kind: "file".to_string(),
                    path: Some("D:/library/one/001.png".to_string()),
                    archive_path: None,
                    entry_path: None,
                    url: None,
                    key: None,
                },
                display_name: "001.png".to_string(),
                width: Some(1200),
                height: Some(1800),
            }],
            library_item: LibraryItemRecord {
                id: "library-item:one".to_string(),
                manga_id: "manga:one".to_string(),
                title: "One".to_string(),
                favorite: true,
                tags: vec!["demo".to_string()],
                rating: Some(4.5),
                last_read_at: None,
                created_at: created_at.clone(),
                updated_at: created_at,
            },
        }
    }
}
