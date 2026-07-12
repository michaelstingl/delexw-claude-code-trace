use std::process::Command;

fn git(args: &[&str]) -> Option<String> {
    let out = Command::new("git").args(args).output().ok()?;
    if !out.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if s.is_empty() {
        None
    } else {
        Some(s)
    }
}

fn main() {
    let commit = git(&["rev-parse", "--short", "HEAD"]).unwrap_or_else(|| "unknown".into());
    let dirty = git(&["status", "--porcelain"])
        .map(|s| !s.is_empty())
        .unwrap_or(false);
    // May be "HEAD" for detached-HEAD builds (e.g. some CI/release checkouts); that's fine.
    let branch = git(&["rev-parse", "--abbrev-ref", "HEAD"]).unwrap_or_else(|| "unknown".into());
    println!("cargo:rustc-env=GIT_COMMIT={commit}");
    println!("cargo:rustc-env=GIT_DIRTY={dirty}");
    println!("cargo:rustc-env=GIT_BRANCH={branch}");
    println!("cargo:rerun-if-changed=build.rs");
    // Best-effort: re-run when HEAD moves. In a worktree .git is a file; this
    // path may not exist, which is fine — a real release build recompiles.
    println!("cargo:rerun-if-changed=../.git/HEAD");

    // The Tauri build step (context codegen, etc.) is only needed for the
    // desktop app. Headless-only builds (`--no-default-features`) skip it so
    // they don't require the tauri-build dependency or a frontend bundle.
    #[cfg(feature = "desktop")]
    tauri_build::build();
}
