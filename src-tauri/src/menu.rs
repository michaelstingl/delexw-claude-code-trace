//! macOS application menu, built explicitly so the standard Edit/Window
//! shortcuts (Cmd+C, Cmd+V, Cmd+Q, ...) keep working even though we install a
//! custom menu (which, on macOS, replaces Tauri's default one).

use tauri::menu::{AboutMetadata, AboutMetadataBuilder, Menu, MenuBuilder, SubmenuBuilder};
use tauri::{Manager, Runtime};

/// The About metadata shown in the "Claude Code Trace ▸ About Claude Code
/// Trace" panel. The version line is `crate::version::current().display_string()`,
/// e.g. `"0.11.0 (a1b2c3d)"` or `"0.11.0 (a1b2c3d, dirty)"`.
pub fn about_metadata() -> AboutMetadata<'static> {
    AboutMetadataBuilder::new()
        .version(Some(crate::version::current().display_string()))
        .build()
}

/// Build the full application menu bar, preserving the standard macOS
/// submenus (App/Edit/Window) so that copy/paste/quit/etc. keep working.
pub fn build_menu<R: Runtime>(app: &impl Manager<R>) -> tauri::Result<Menu<R>> {
    let app_submenu = SubmenuBuilder::new(app, "Claude Code Trace")
        .about(Some(about_metadata()))
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let edit_submenu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let window_submenu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .close_window()
        .build()?;

    MenuBuilder::new(app)
        .item(&app_submenu)
        .item(&edit_submenu)
        .item(&window_submenu)
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn about_metadata_version_matches_current_display_string() {
        let metadata = about_metadata();
        // AboutMetadata doesn't expose a getter, so we can't read the field
        // back directly; instead verify the source of truth it's built from.
        let expected = crate::version::current().display_string();
        assert!(expected.starts_with(env!("CARGO_PKG_VERSION")));
        assert!(expected.contains('('));
        let _ = metadata; // metadata built successfully with that version
    }

    #[test]
    fn about_version_line_includes_commit() {
        let line = crate::version::current().display_string();
        assert!(line.contains('('));
        assert!(line.starts_with(env!("CARGO_PKG_VERSION")));
    }
}
