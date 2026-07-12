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
}
