import type { VersionInfo } from "../types";
import { API_BASE } from "./config";

export function formatVersion(info: VersionInfo): string {
  return info.dirty
    ? `${info.version} (${info.commit}, dirty)`
    : `${info.version} (${info.commit})`;
}

export function getWebVersion(): string {
  return formatVersion({
    version: __APP_VERSION__,
    commit: __GIT_COMMIT__,
    dirty: __GIT_DIRTY__,
  });
}

export async function getBackendVersion(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/version`);
  const info = (await res.json()) as VersionInfo;
  return formatVersion(info);
}
