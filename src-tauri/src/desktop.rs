use tauri::menu::{MenuBuilder, SubmenuBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{App, AppHandle, Manager, Runtime, WebviewWindow, WindowEvent};

const MAIN_WINDOW_LABEL: &str = "main";
const MENU_SHOW: &str = "show";
const MENU_HIDE: &str = "hide";
const MENU_QUIT: &str = "quit";

pub fn configure<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.setup(|app| {
        setup_app_menu(app)?;
        setup_tray(app)?;
        setup_main_window_behavior(app);
        Ok(())
    })
}

fn setup_app_menu<R: Runtime>(app: &App<R>) -> tauri::Result<()> {
    let handle = app.handle();
    let app_menu = SubmenuBuilder::new(handle, "Inkline")
        .text(MENU_SHOW, "Show Inkline")
        .text(MENU_HIDE, "Hide Inkline")
        .separator()
        .quit_with_text("Quit Inkline")
        .build()?;
    let edit_menu = SubmenuBuilder::new(handle, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;
    let window_menu = SubmenuBuilder::new(handle, "Window")
        .minimize()
        .maximize()
        .fullscreen()
        .close_window()
        .build()?;
    let menu = MenuBuilder::new(handle)
        .item(&app_menu)
        .item(&edit_menu)
        .item(&window_menu)
        .build()?;

    app.set_menu(menu)?;
    app.on_menu_event(handle_menu_event);

    Ok(())
}

fn setup_tray<R: Runtime>(app: &App<R>) -> tauri::Result<()> {
    let handle = app.handle();
    let show =
        tauri::menu::MenuItem::with_id(handle, MENU_SHOW, "Show Inkline", true, None::<&str>)?;
    let hide =
        tauri::menu::MenuItem::with_id(handle, MENU_HIDE, "Hide Inkline", true, None::<&str>)?;
    let quit =
        tauri::menu::MenuItem::with_id(handle, MENU_QUIT, "Quit Inkline", true, None::<&str>)?;
    let separator = tauri::menu::PredefinedMenuItem::separator(handle)?;
    let menu = tauri::menu::Menu::with_items(handle, &[&show, &hide, &separator, &quit])?;

    TrayIconBuilder::with_id("main-tray")
        .tooltip("Inkline")
        .icon(
            app.default_window_icon()
                .expect("default window icon")
                .clone(),
        )
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(handle_menu_event)
        .on_tray_icon_event(|tray, event| {
            let TrayIconEvent::Click {
                button,
                button_state,
                ..
            } = event
            else {
                return;
            };

            if button == MouseButton::Left && button_state == MouseButtonState::Up {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

fn setup_main_window_behavior<R: Runtime>(app: &App<R>) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return;
    };

    window.on_window_event({
        let window = window.clone();
        move |event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                hide_window(&window);
            }
        }
    });
}

fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event: tauri::menu::MenuEvent) {
    match event.id().0.as_str() {
        MENU_SHOW => show_main_window(app),
        MENU_HIDE => {
            if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                hide_window(&window);
            }
        }
        MENU_QUIT => app.exit(0),
        _ => {}
    }
}

fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return;
    };

    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
}

fn hide_window<R: Runtime>(window: &WebviewWindow<R>) {
    let _ = window.hide();
}
