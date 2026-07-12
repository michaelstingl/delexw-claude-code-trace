//! macOS application menu, built explicitly so the standard Edit/Window
//! shortcuts (Cmd+C, Cmd+V, Cmd+Q, ...) keep working even though we install a
//! custom menu (which, on macOS, replaces Tauri's default one).

use tauri::menu::{AboutMetadata, AboutMetadataBuilder, Menu, MenuBuilder, SubmenuBuilder};
use tauri::{Manager, Runtime};

/// The About metadata shown in the "Claude Code Trace ▸ About Claude Code
/// Trace" panel.
///
/// macOS renders this as "Version {short_version} ({version})". If
/// `short_version` is left unset, it falls back to the bundle's
/// `CFBundleShortVersionString` (the crate version), so setting only
/// `.version(...)` to our full display string doubles the version, e.g.
/// "Version 0.11.0 (0.11.0 · edge (94c9070))". To avoid that we set
/// `short_version` to the plain version ourselves, and `version` to just the
/// branch/commit parenthetical (`crate::version::VersionInfo::about_parenthetical`),
/// producing "Version 0.11.0 (edge @ 94c9070)". Note: `comments` is not
/// rendered by macOS, so it can't be used for this instead.
pub fn about_metadata() -> AboutMetadata<'static> {
    let v = crate::version::current();
    // Empirically on macOS the `version` field renders as the leading line and
    // `short_version` in the trailing parentheses (the reverse of what the
    // docs.rs notes imply). So: version = plain semver (leads), short_version =
    // "branch @ commit" (parens) -> "0.11.0 (edge @ 94c9070)".
    AboutMetadataBuilder::new()
        .version(Some(v.version.clone()))
        .short_version(Some(v.about_parenthetical()))
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
    fn about_metadata_builds_from_short_version_and_parenthetical() {
        // AboutMetadata doesn't expose getters, so we can't read the built
        // struct's fields back directly; instead verify the source of truth
        // it's built from (version = plain semver, short_version = the
        // about_parenthetical helper) and that construction succeeds.
        let v = crate::version::current();
        assert_eq!(v.version, env!("CARGO_PKG_VERSION"));
        let parenthetical = v.about_parenthetical();
        assert!(parenthetical.contains(&v.branch));
        assert!(parenthetical.contains(&v.commit));
        assert!(parenthetical.contains('@'));

        let metadata = about_metadata();
        let _ = metadata; // metadata built successfully from short_version + parenthetical
    }

    #[test]
    fn about_parenthetical_does_not_repeat_the_version() {
        // Regression guard for the macOS doubling bug: the parenthetical
        // that goes into `.version(...)` must not itself contain the crate
        // version, since macOS already renders "Version {short_version} (...)".
        let v = crate::version::current();
        assert!(!v.about_parenthetical().contains(&v.version));
    }
}
