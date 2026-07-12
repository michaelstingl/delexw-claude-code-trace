use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct VersionInfo {
    pub version: String,
    pub commit: String,
    pub branch: String,
    pub dirty: bool,
}

impl VersionInfo {
    pub fn display_string(&self) -> String {
        if self.dirty {
            format!(
                "{} · {} ({}, dirty)",
                self.version, self.branch, self.commit
            )
        } else {
            format!("{} · {} ({})", self.version, self.branch, self.commit)
        }
    }

    /// The parenthetical shown in the macOS About panel next to the short
    /// version, e.g. `"edge @ 94c9070"` or `"edge @ 94c9070, dirty"`. See
    /// `menu::about_metadata` for how this avoids doubling the version.
    pub fn about_parenthetical(&self) -> String {
        if self.dirty {
            format!("{} @ {}, dirty", self.branch, self.commit)
        } else {
            format!("{} @ {}", self.branch, self.commit)
        }
    }
}

pub fn current() -> VersionInfo {
    VersionInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        commit: option_env!("GIT_COMMIT").unwrap_or("unknown").to_string(),
        branch: option_env!("GIT_BRANCH").unwrap_or("unknown").to_string(),
        dirty: option_env!("GIT_DIRTY") == Some("true"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn display_string_formats_version_branch_commit_dirty() {
        let clean = VersionInfo {
            version: "0.11.0".into(),
            commit: "94c9070".into(),
            branch: "edge".into(),
            dirty: false,
        };
        assert_eq!(clean.display_string(), "0.11.0 · edge (94c9070)");
        let dirty = VersionInfo {
            version: "0.11.0".into(),
            commit: "94c9070".into(),
            branch: "edge".into(),
            dirty: true,
        };
        assert_eq!(dirty.display_string(), "0.11.0 · edge (94c9070, dirty)");
    }

    #[test]
    fn about_parenthetical_formats_branch_commit_dirty() {
        let clean = VersionInfo {
            version: "0.11.0".into(),
            commit: "94c9070".into(),
            branch: "edge".into(),
            dirty: false,
        };
        assert_eq!(clean.about_parenthetical(), "edge @ 94c9070");
        let dirty = VersionInfo {
            version: "0.11.0".into(),
            commit: "94c9070".into(),
            branch: "edge".into(),
            dirty: true,
        };
        assert_eq!(dirty.about_parenthetical(), "edge @ 94c9070, dirty");
    }

    #[test]
    fn current_has_a_nonempty_version_commit_and_branch_fallback() {
        let v = current();
        assert!(!v.version.is_empty()); // CARGO_PKG_VERSION always set
        assert!(!v.commit.is_empty()); // real short-sha or "unknown"
        assert!(!v.branch.is_empty()); // real branch name or "unknown"
    }
}
