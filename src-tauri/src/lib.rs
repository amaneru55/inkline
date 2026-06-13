#[cfg(desktop)]
mod desktop;
mod settings;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            settings::get_app_settings,
            settings::set_app_settings
        ]);

    #[cfg(desktop)]
    let builder = desktop::configure(builder);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
