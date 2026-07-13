#[cfg(feature = "desktop")]
use crate::version::{current, VersionInfo};

#[cfg(feature = "desktop")]
#[tauri::command]
pub async fn get_version() -> Result<VersionInfo, String> {
    Ok(current())
}

#[cfg(test)]
mod tests {
    #[test]
    fn version_response_serializes_expected_fields() {
        let v = crate::version::current();
        let json = serde_json::to_value(&v).expect("serializes");
        assert!(json.get("version").is_some());
        assert!(json.get("commit").is_some());
        assert!(json.get("dirty").is_some());
    }
}
