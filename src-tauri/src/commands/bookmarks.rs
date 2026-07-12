use crate::bookmarks::Bookmark;
#[cfg(feature = "desktop")]
use std::sync::Arc;
#[cfg(feature = "desktop")]
use tauri::State;

#[cfg(feature = "desktop")]
use crate::state::AppState;

// Shared mutation used by both surfaces (Tauri commands + HTTP handlers).
// Persistence errors are propagated rather than swallowed — a silent save
// failure would leave the in-memory list and the on-disk file out of sync
// without either surface ever finding out.
//
// Transactional: the mutation is applied to a clone first, and the clone is
// only committed into `state_list` once `save_bookmarks` succeeds. On error,
// `state_list` is left untouched, so memory and disk never diverge.
pub fn apply_add(state_list: &mut Vec<Bookmark>, b: Bookmark) -> Result<Vec<Bookmark>, String> {
    let mut new_list = state_list.clone();
    crate::bookmarks::upsert(&mut new_list, b);
    crate::bookmarks::save_bookmarks(&new_list)?;
    *state_list = new_list;
    Ok(state_list.clone())
}

pub fn apply_remove(
    state_list: &mut Vec<Bookmark>,
    session_id: &str,
) -> Result<Vec<Bookmark>, String> {
    let mut new_list = state_list.clone();
    crate::bookmarks::remove(&mut new_list, session_id);
    crate::bookmarks::save_bookmarks(&new_list)?;
    *state_list = new_list;
    Ok(state_list.clone())
}

#[cfg(feature = "desktop")]
#[tauri::command]
pub async fn list_bookmarks(state: State<'_, Arc<AppState>>) -> Result<Vec<Bookmark>, String> {
    Ok(state.bookmarks.lock().map_err(|e| e.to_string())?.clone())
}

#[cfg(feature = "desktop")]
#[tauri::command]
pub async fn add_bookmark(
    bookmark: Bookmark,
    state: State<'_, Arc<AppState>>,
) -> Result<Vec<Bookmark>, String> {
    let mut g = state.bookmarks.lock().map_err(|e| e.to_string())?;
    apply_add(&mut g, bookmark)
}

#[cfg(feature = "desktop")]
#[tauri::command]
pub async fn remove_bookmark(
    session_id: String,
    state: State<'_, Arc<AppState>>,
) -> Result<Vec<Bookmark>, String> {
    let mut g = state.bookmarks.lock().map_err(|e| e.to_string())?;
    apply_remove(&mut g, &session_id)
}

// Note: `apply_add`/`apply_remove` are deliberately not unit-tested here —
// they call `save_bookmarks`, which writes to the real per-user config
// directory (see `bookmarks::bookmarks_path`), and this module has no way to
// inject a test path. Their pure logic (upsert/remove semantics) is covered
// below via the Task-2 helpers directly, with no disk I/O. The full
// add/remove-through-state-and-disk path is exercised by Task 7's play-through.
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mutation_helper_list_add_remove_roundtrip() {
        let mut list: Vec<Bookmark> = vec![];
        let b = Bookmark {
            session_id: "s1".into(),
            label: "L".into(),
            ..Default::default()
        };
        crate::bookmarks::upsert(&mut list, b);
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].session_id, "s1");
        crate::bookmarks::remove(&mut list, "s1");
        assert!(list.is_empty());
    }
}
