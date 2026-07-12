use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct VersionInfo {
    pub version: String,
    pub commit: String,
    pub dirty: bool,
}

impl VersionInfo {
    pub fn display_string(&self) -> String {
        if self.dirty {
            format!("{} ({}, dirty)", self.version, self.commit)
        } else {
            format!("{} ({})", self.version, self.commit)
        }
    }
}

pub fn current() -> VersionInfo {
    VersionInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        commit: option_env!("GIT_COMMIT").unwrap_or("unknown").to_string(),
        dirty: option_env!("GIT_DIRTY") == Some("true"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn display_string_formats_version_commit_dirty() {
        let clean = VersionInfo {
            version: "0.11.0".into(),
            commit: "a1b2c3d".into(),
            dirty: false,
        };
        assert_eq!(clean.display_string(), "0.11.0 (a1b2c3d)");
        let dirty = VersionInfo {
            version: "0.11.0".into(),
            commit: "a1b2c3d".into(),
            dirty: true,
        };
        assert_eq!(dirty.display_string(), "0.11.0 (a1b2c3d, dirty)");
    }

    #[test]
    fn current_has_a_nonempty_version_and_a_commit_fallback() {
        let v = current();
        assert!(!v.version.is_empty()); // CARGO_PKG_VERSION always set
        assert!(!v.commit.is_empty()); // real short-sha or "unknown"
    }
}
