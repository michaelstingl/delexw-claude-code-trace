use crate::parser::session::SessionInfo;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct BookmarkMeta {
    #[serde(default)]
    pub model: String,
    #[serde(default)]
    pub turn_count: i32,
    #[serde(default)]
    pub total_tokens: i64,
    #[serde(default)]
    pub input_tokens: i64,
    #[serde(default)]
    pub output_tokens: i64,
    #[serde(default)]
    pub cache_read_tokens: i64,
    #[serde(default)]
    pub cache_creation_tokens: i64,
    #[serde(default)]
    pub context_tokens: i64,
    #[serde(default)]
    pub cost_usd: f64,
    #[serde(default)]
    pub duration_ms: i64,
    #[serde(default)]
    pub mod_time: String,
    #[serde(default)]
    pub size_bytes: i64,
    /// `recap_turn` snapshot at the time `recap` was last synced from the live
    /// session (see [`reconcile_one`]). Lets the reconcile pass tell a fresh
    /// recap from a stale one without re-deriving it from the transcript.
    #[serde(default)]
    pub recap_turn: i32,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Bookmark {
    #[serde(default)]
    pub session_id: String,
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub recap: Option<String>,
    #[serde(default)]
    pub meta: BookmarkMeta,
    #[serde(default)]
    pub bookmarked_at: String,
}

fn bookmarks_path() -> Result<PathBuf, String> {
    let config = dirs::config_dir().ok_or("no config directory")?;
    Ok(config.join("claude-code-trace").join("bookmarks.json"))
}

pub fn load_bookmarks() -> Vec<Bookmark> {
    bookmarks_path()
        .ok()
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save_bookmarks(list: &[Bookmark]) -> Result<(), String> {
    let path = bookmarks_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(list).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}

pub fn upsert(list: &mut Vec<Bookmark>, b: Bookmark) {
    list.retain(|x| x.session_id != b.session_id);
    list.insert(0, b);
}

pub fn remove(list: &mut Vec<Bookmark>, session_id: &str) {
    list.retain(|x| x.session_id != session_id);
}

// Copy every numeric snapshot field from the live session onto the stored
// bookmark metadata. Shared by the fresh-recap and settled-numbers paths in
// `reconcile_one` so both sync the exact same fields.
fn copy_numbers(meta: &mut BookmarkMeta, s: &SessionInfo) {
    meta.model = s.model.clone();
    meta.turn_count = s.turn_count;
    meta.total_tokens = s.total_tokens;
    meta.input_tokens = s.input_tokens;
    meta.output_tokens = s.output_tokens;
    meta.cache_read_tokens = s.cache_read_tokens;
    meta.cache_creation_tokens = s.cache_creation_tokens;
    meta.context_tokens = s.context_tokens;
    meta.cost_usd = s.cost_usd;
    meta.duration_ms = s.duration_ms;
    meta.mod_time = s.mod_time.to_rfc3339();
}

// Reconcile a stored bookmark from the live session it mirrors.
// Sticky + monotonic (never clobber a good value with an empty one),
// diff-gated (return false = nothing changed = caller must not persist).
pub fn reconcile_one(b: &mut Bookmark, s: &SessionInfo) -> bool {
    let mut changed = false;

    // Freshest non-empty /rename name wins; never fall back to nothing.
    if let Some(name) = s.name.as_deref().map(str::trim).filter(|n| !n.is_empty()) {
        if b.label != name {
            b.label = name.to_string();
            changed = true;
        }
    }

    // Freshest non-empty recap wins; never overwrite with null (the footgun).
    if let Some(recap) = s.recap.as_deref().filter(|r| !r.is_empty()) {
        if b.recap.as_deref() != Some(recap) {
            b.recap = Some(recap.to_string());
            changed = true;
        }
        if b.meta.recap_turn != s.recap_turn {
            b.meta.recap_turn = s.recap_turn;
            changed = true;
        }
    }

    // Numbers: piggyback on a name/recap change, OR sync once when the session
    // has settled (not ongoing) and the stored snapshot lags. Never per-turn.
    let numbers_lag = b.meta.model != s.model
        || b.meta.turn_count != s.turn_count
        || b.meta.total_tokens != s.total_tokens
        || b.meta.input_tokens != s.input_tokens
        || b.meta.output_tokens != s.output_tokens
        || b.meta.cache_read_tokens != s.cache_read_tokens
        || b.meta.cache_creation_tokens != s.cache_creation_tokens
        || b.meta.context_tokens != s.context_tokens
        || b.meta.cost_usd != s.cost_usd
        || b.meta.duration_ms != s.duration_ms;
    if numbers_lag && (changed || !s.is_ongoing) {
        copy_numbers(&mut b.meta, s); // model, turn_count, *_tokens, cost_usd, duration_ms, mod_time
        changed = true;
    }

    changed
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample(id: &str, label: &str) -> Bookmark {
        Bookmark {
            session_id: id.into(),
            label: label.into(),
            recap: None,
            meta: BookmarkMeta::default(),
            bookmarked_at: "2026-07-12T00:00:00Z".into(),
        }
    }

    #[test]
    fn upsert_dedupes_and_puts_newest_first() {
        let mut list = vec![sample("a", "A"), sample("b", "B")];
        upsert(&mut list, sample("a", "A2")); // re-pin a with a new snapshot
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].session_id, "a"); // moved to front
        assert_eq!(list[0].label, "A2"); // snapshot replaced
    }

    #[test]
    fn remove_drops_by_session_id() {
        let mut list = vec![sample("a", "A"), sample("b", "B")];
        remove(&mut list, "a");
        assert_eq!(
            list.iter()
                .map(|b| b.session_id.clone())
                .collect::<Vec<_>>(),
            vec!["b"]
        );
    }

    #[test]
    fn deserialize_partial_record_uses_defaults() {
        let one: Bookmark = serde_json::from_str(r#"{"session_id":"x","label":"L"}"#).unwrap();
        assert_eq!(one.recap, None);
        assert_eq!(one.meta.context_tokens, 0);
    }

    // --- reconcile_one -----------------------------------------------------

    fn sample_session() -> SessionInfo {
        SessionInfo {
            path: "p".into(),
            session_id: "a".into(),
            mod_time: chrono::Utc::now(),
            first_message: String::new(),
            recap: None,
            recap_turn: 0,
            name: None,
            liveness: None,
            turn_count: 5,
            is_ongoing: false,
            total_tokens: 100,
            input_tokens: 10,
            output_tokens: 20,
            cache_read_tokens: 30,
            cache_creation_tokens: 40,
            context_tokens: 50,
            cost_usd: 1.5,
            duration_ms: 1000,
            model: "claude-x".into(),
            cwd: String::new(),
            git_branch: String::new(),
            permission_mode: String::new(),
        }
    }

    fn sample_bookmark() -> Bookmark {
        Bookmark {
            session_id: "a".into(),
            label: "A".into(),
            recap: Some("A".into()),
            meta: BookmarkMeta {
                model: "claude-x".into(),
                turn_count: 5,
                total_tokens: 100,
                input_tokens: 10,
                output_tokens: 20,
                cache_read_tokens: 30,
                cache_creation_tokens: 40,
                context_tokens: 50,
                cost_usd: 1.5,
                duration_ms: 1000,
                recap_turn: 5,
                ..BookmarkMeta::default()
            },
            bookmarked_at: "2026-07-12T00:00:00Z".into(),
        }
    }

    #[test]
    fn reconcile_fresh_recap_updates_recap_and_recap_turn() {
        let mut b = sample_bookmark();
        let mut s = sample_session();
        s.recap = Some("B".into());
        s.recap_turn = 30;

        assert!(reconcile_one(&mut b, &s));
        assert_eq!(b.recap, Some("B".to_string()));
        assert_eq!(b.meta.recap_turn, 30);
    }

    #[test]
    fn reconcile_never_overwrites_recap_with_null() {
        let mut b = sample_bookmark();
        let mut s = sample_session();
        s.recap = None;
        b.recap = Some("A".into());

        assert!(!reconcile_one(&mut b, &s));
        assert_eq!(b.recap, Some("A".to_string()));
    }

    #[test]
    fn reconcile_sticky_name_adopts_new_name() {
        let mut b = sample_bookmark();
        let mut s = sample_session();
        s.name = Some("New".into());

        assert!(reconcile_one(&mut b, &s));
        assert_eq!(b.label, "New");
    }

    #[test]
    fn reconcile_sticky_name_keeps_existing_label_when_live_name_absent() {
        let mut b = sample_bookmark();
        let s = sample_session(); // s.name = None, b.label already "A"

        assert!(!reconcile_one(&mut b, &s));
        assert_eq!(b.label, "A");
    }

    #[test]
    fn reconcile_is_diff_gated_when_nothing_changed() {
        let mut b = sample_bookmark();
        let s = sample_session();

        assert!(!reconcile_one(&mut b, &s));
    }

    #[test]
    fn reconcile_settles_numbers_once_session_stops_being_ongoing() {
        let mut b = sample_bookmark();
        let mut s = sample_session();
        s.is_ongoing = false;
        s.turn_count = 9; // stored b.meta.turn_count (5) lags behind

        assert!(reconcile_one(&mut b, &s));
        assert_eq!(b.meta.turn_count, 9);
    }

    #[test]
    fn reconcile_does_not_sync_numbers_per_turn_while_ongoing() {
        let mut b = sample_bookmark();
        let mut s = sample_session();
        s.is_ongoing = true;
        s.turn_count = 9; // number changed, but name/recap identical

        assert!(!reconcile_one(&mut b, &s));
        assert_eq!(b.meta.turn_count, 5); // unchanged
    }

    #[test]
    fn reconcile_settles_model_change_when_other_numbers_are_unchanged() {
        let mut b = sample_bookmark();
        let mut s = sample_session();
        s.is_ongoing = false;
        s.model = "claude-y".into(); // only the model differs from the stored snapshot

        assert!(reconcile_one(&mut b, &s));
        assert_eq!(b.meta.model, "claude-y");
    }

    #[test]
    fn reconcile_self_heals_recap_turn_when_recap_text_is_unchanged() {
        let mut b = sample_bookmark();
        let mut s = sample_session();
        s.recap = Some(b.recap.clone().unwrap()); // same recap text
        s.recap_turn = 12; // but stored recap_turn (5) is stale/legacy

        assert!(reconcile_one(&mut b, &s));
        assert_eq!(b.meta.recap_turn, 12);
    }
}
