use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ThemeName {
    Default,
    Inkline,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ThemeMode {
    System,
    Light,
    Dark,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub enum Language {
    #[serde(rename = "zh-CN")]
    ZhCn,
    #[serde(rename = "en-US")]
    EnUs,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum CloseBehavior {
    HideToTray,
    Exit,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    theme_name: ThemeName,
    theme_mode: ThemeMode,
    language: Language,
    close_behavior: CloseBehavior,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme_name: ThemeName::Inkline,
            theme_mode: ThemeMode::System,
            language: Language::ZhCn,
            close_behavior: CloseBehavior::HideToTray,
        }
    }
}

#[tauri::command]
pub fn get_app_settings<R: Runtime>(app: AppHandle<R>) -> Result<AppSettings, String> {
    read_settings(&app)
}

#[tauri::command]
pub fn set_app_settings<R: Runtime>(
    app: AppHandle<R>,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    write_settings(&app, &settings)?;
    Ok(settings)
}

fn read_settings<R: Runtime>(app: &AppHandle<R>) -> Result<AppSettings, String> {
    let path = settings_path(app)?;

    if !path.exists() {
        return Ok(AppSettings::default());
    }

    let content = fs::read_to_string(&path)
        .map_err(|error| format!("Failed to read settings file: {error}"))?;

    serde_json::from_str(&content)
        .map_err(|error| format!("Failed to parse settings file: {error}"))
}

fn write_settings<R: Runtime>(app: &AppHandle<R>, settings: &AppSettings) -> Result<(), String> {
    let path = settings_path(app)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create settings directory: {error}"))?;
    }

    let content = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("Failed to serialize settings: {error}"))?;
    let temp_path = path.with_extension("json.tmp");

    fs::write(&temp_path, content)
        .map_err(|error| format!("Failed to write settings file: {error}"))?;
    if path.exists() {
        fs::remove_file(&path)
            .map_err(|error| format!("Failed to remove old settings file: {error}"))?;
    }
    fs::rename(&temp_path, &path)
        .map_err(|error| format!("Failed to replace settings file: {error}"))?;

    Ok(())
}

fn settings_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|path| path.join("settings.json"))
        .map_err(|error| format!("Failed to resolve app config directory: {error}"))
}
