import { getWebVersion } from "./versions";

const STYLE =
  "background:#1f2430;color:#fff;font-weight:600;padding:2px 6px;border-radius:3px";

export async function logVersionBadges(getBackend: () => Promise<string>): Promise<void> {
  console.info(`%c cctrace Web UI ${getWebVersion()} `, STYLE);
  try {
    console.info(`%c cctrace ${await getBackend()} `, STYLE);
  } catch {
    // backend unreachable (rare) — the web badge already logged; stay quiet
  }
}
