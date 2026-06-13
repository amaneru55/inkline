use std::cmp::Ordering;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Manager, Runtime};

use super::database::{
    self, ChapterRecord, LibraryItemRecord, LibrarySnapshot, MangaRecord, PageRecord, PageResource,
    SourceRef,
};

const IMAGE_EXTENSIONS: [&str; 6] = ["avif", "gif", "jpeg", "jpg", "png", "webp"];

#[tauri::command]
pub fn storage_import_local_folder<R: Runtime>(
    app: AppHandle<R>,
    path: String,
) -> Result<LibrarySnapshot, String> {
    let database_path = app
        .path()
        .app_config_dir()
        .map(|path| path.join("library.sqlite3"))
        .map_err(|error| format!("Failed to resolve app config directory: {error}"))?;
    let imported_at = current_timestamp()?;
    let snapshot = create_local_folder_snapshot(Path::new(&path), &imported_at)?;
    let mut connection = database::open_database(&database_path)?;

    database::upsert_library_snapshot(&mut connection, &snapshot)?;

    Ok(snapshot)
}

pub fn create_local_folder_snapshot(
    root: &Path,
    imported_at: &str,
) -> Result<LibrarySnapshot, String> {
    if !root.is_dir() {
        return Err(format!(
            "Import path is not a directory: {}",
            display_path(root)
        ));
    }

    let folder_name = root
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.trim().is_empty())
        .unwrap_or("Untitled")
        .to_string();
    let slug = create_stable_slug(&folder_name);
    let source = SourceRef {
        id: format!("source:local-folder:{slug}"),
        kind: "local-folder".to_string(),
        name: folder_name.clone(),
    };
    let manga_id = format!("manga:{slug}");
    let chapter_id = format!("chapter:{slug}:001");
    let mut image_paths = collect_image_paths(root)?;

    image_paths.sort_by(|left, right| compare_natural_paths(left, right));

    let pages = image_paths
        .iter()
        .enumerate()
        .map(|(index, path)| PageRecord {
            id: format!("page:{slug}:{}", format!("{:04}", index + 1)),
            chapter_id: chapter_id.clone(),
            index: index as i64,
            resource: PageResource {
                kind: "file".to_string(),
                path: Some(display_path(path)),
                archive_path: None,
                entry_path: None,
                url: None,
                key: None,
            },
            display_name: file_stem(path),
            width: None,
            height: None,
        })
        .collect();

    Ok(LibrarySnapshot {
        source: source.clone(),
        manga: MangaRecord {
            id: manga_id.clone(),
            title: folder_name.clone(),
            authors: Vec::new(),
            status: "unknown".to_string(),
            source: source.clone(),
            created_at: imported_at.to_string(),
            updated_at: imported_at.to_string(),
        },
        chapters: vec![ChapterRecord {
            id: chapter_id,
            manga_id: manga_id.clone(),
            title: folder_name.clone(),
            index: 0,
            source: source.clone(),
            created_at: imported_at.to_string(),
            updated_at: imported_at.to_string(),
        }],
        pages,
        library_item: LibraryItemRecord {
            id: format!("library-item:{slug}"),
            manga_id,
            title: folder_name,
            favorite: false,
            tags: Vec::new(),
            rating: None,
            last_read_at: None,
            created_at: imported_at.to_string(),
            updated_at: imported_at.to_string(),
        },
    })
}

fn collect_image_paths(root: &Path) -> Result<Vec<PathBuf>, String> {
    let mut pending = vec![root.to_path_buf()];
    let mut image_paths = Vec::new();

    while let Some(directory) = pending.pop() {
        let entries = fs::read_dir(&directory).map_err(|error| {
            format!(
                "Failed to read directory {}: {error}",
                display_path(&directory)
            )
        })?;

        for entry in entries {
            let entry = entry.map_err(|error| {
                format!(
                    "Failed to read directory entry in {}: {error}",
                    display_path(&directory)
                )
            })?;
            let path = entry.path();
            let file_type = entry.file_type().map_err(|error| {
                format!(
                    "Failed to read file type for {}: {error}",
                    display_path(&path)
                )
            })?;

            if file_type.is_dir() {
                pending.push(path);
            } else if file_type.is_file() && is_supported_image_path(&path) {
                image_paths.push(path);
            }
        }
    }

    Ok(image_paths)
}

fn is_supported_image_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| {
            let lower = extension.to_lowercase();
            IMAGE_EXTENSIONS
                .iter()
                .any(|supported| supported == &lower.as_str())
        })
        .unwrap_or(false)
}

fn compare_natural_paths(left: &Path, right: &Path) -> Ordering {
    let left_parts = path_parts(left);
    let right_parts = path_parts(right);
    let max_length = left_parts.len().max(right_parts.len());

    for index in 0..max_length {
        let Some(left_part) = left_parts.get(index) else {
            return Ordering::Less;
        };
        let Some(right_part) = right_parts.get(index) else {
            return Ordering::Greater;
        };
        let comparison = compare_natural_text(left_part, right_part);

        if comparison != Ordering::Equal {
            return comparison;
        }
    }

    Ordering::Equal
}

fn compare_natural_text(left: &str, right: &str) -> Ordering {
    let left_tokens = natural_tokens(left);
    let right_tokens = natural_tokens(right);
    let max_length = left_tokens.len().max(right_tokens.len());

    for index in 0..max_length {
        let Some(left_token) = left_tokens.get(index) else {
            return Ordering::Less;
        };
        let Some(right_token) = right_tokens.get(index) else {
            return Ordering::Greater;
        };
        let comparison = match (left_token, right_token) {
            (NaturalToken::Number(left), NaturalToken::Number(right)) => left.cmp(right),
            (NaturalToken::Text(left), NaturalToken::Text(right)) => left.cmp(right),
            (NaturalToken::Number(_), NaturalToken::Text(_)) => Ordering::Less,
            (NaturalToken::Text(_), NaturalToken::Number(_)) => Ordering::Greater,
        };

        if comparison != Ordering::Equal {
            return comparison;
        }
    }

    Ordering::Equal
}

#[derive(Debug, PartialEq, Eq)]
enum NaturalToken {
    Number(u64),
    Text(String),
}

fn natural_tokens(value: &str) -> Vec<NaturalToken> {
    let mut tokens = Vec::new();
    let mut buffer = String::new();
    let mut buffer_is_digit: Option<bool> = None;

    for character in value.chars() {
        let is_digit = character.is_ascii_digit();

        if buffer_is_digit == Some(is_digit) || buffer_is_digit.is_none() {
            buffer.push(character);
            buffer_is_digit = Some(is_digit);
            continue;
        }

        push_natural_token(&mut tokens, &buffer, buffer_is_digit.unwrap_or(false));
        buffer.clear();
        buffer.push(character);
        buffer_is_digit = Some(is_digit);
    }

    if !buffer.is_empty() {
        push_natural_token(&mut tokens, &buffer, buffer_is_digit.unwrap_or(false));
    }

    tokens
}

fn push_natural_token(tokens: &mut Vec<NaturalToken>, value: &str, is_digit: bool) {
    if is_digit {
        tokens.push(NaturalToken::Number(
            value.parse::<u64>().unwrap_or(u64::MAX),
        ));
    } else {
        tokens.push(NaturalToken::Text(value.to_lowercase()));
    }
}

fn path_parts(path: &Path) -> Vec<String> {
    path.components()
        .filter_map(|component| component.as_os_str().to_str())
        .map(|part| part.trim().to_string())
        .filter(|part| !part.is_empty())
        .collect()
}

fn create_stable_slug(value: &str) -> String {
    let mut slug = String::new();
    let mut previous_dash = false;

    for character in value.trim().to_lowercase().chars() {
        if character.is_ascii_alphanumeric() {
            slug.push(character);
            previous_dash = false;
        } else if character.is_whitespace() || !previous_dash {
            slug.push('-');
            previous_dash = true;
        }
    }

    let trimmed = slug.trim_matches('-').to_string();

    if trimmed.is_empty() {
        "untitled".to_string()
    } else {
        trimmed
    }
}

fn file_stem(path: &Path) -> String {
    path.file_stem()
        .and_then(|stem| stem.to_str())
        .filter(|stem| !stem.trim().is_empty())
        .unwrap_or("Untitled")
        .to_string()
}

fn display_path(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn current_timestamp() -> Result<String, String> {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("System clock is before UNIX epoch: {error}"))?;

    Ok(format!("unix-ms:{}", duration.as_millis()))
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;

    #[test]
    fn creates_snapshot_from_supported_images() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let root = temp_dir.path().join("Inkline");
        fs::create_dir(&root).expect("root");
        fs::write(root.join("010.png"), "").expect("010");
        fs::write(root.join("002.webp"), "").expect("002");
        fs::write(root.join("001.JPG"), "").expect("001");
        fs::write(root.join("notes.txt"), "").expect("notes");

        let snapshot =
            create_local_folder_snapshot(&root, "2026-06-13T12:00:00Z").expect("snapshot");

        assert_eq!(snapshot.source.id, "source:local-folder:inkline");
        assert_eq!(snapshot.manga.id, "manga:inkline");
        assert_eq!(snapshot.library_item.id, "library-item:inkline");
        assert_eq!(
            snapshot
                .pages
                .iter()
                .map(|page| page.display_name.as_str())
                .collect::<Vec<_>>(),
            vec!["001", "002", "010"]
        );
        assert_eq!(snapshot.pages.len(), 3);
    }

    #[test]
    fn scans_nested_directories_in_natural_order() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let root = temp_dir.path().join("Book");
        fs::create_dir(&root).expect("root");
        fs::create_dir(root.join("chapter 10")).expect("chapter 10");
        fs::create_dir(root.join("chapter 2")).expect("chapter 2");
        fs::write(root.join("chapter 10").join("001.png"), "").expect("c10");
        fs::write(root.join("chapter 2").join("010.png"), "").expect("c2 010");
        fs::write(root.join("chapter 2").join("002.png"), "").expect("c2 002");

        let snapshot =
            create_local_folder_snapshot(&root, "2026-06-13T12:00:00Z").expect("snapshot");

        assert_eq!(
            snapshot
                .pages
                .iter()
                .map(|page| page.display_name.as_str())
                .collect::<Vec<_>>(),
            vec!["002", "010", "001"]
        );
    }

    #[test]
    fn rejects_non_directory_import_path() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let file_path = temp_dir.path().join("page.png");
        fs::write(&file_path, "").expect("file");

        assert!(create_local_folder_snapshot(&file_path, "2026-06-13T12:00:00Z").is_err());
    }
}
