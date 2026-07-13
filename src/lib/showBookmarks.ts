/** Whether the picker shows the ★ bookmark star and the pinned group.
 *  Persisted in localStorage so it survives reloads. Default ON. */
export const SHOW_BOOKMARKS_KEY = "cct.showBookmarks";
const DEFAULT_SHOW_BOOKMARKS = true;

export function loadShowBookmarks(): boolean {
  if (typeof localStorage === "undefined") return DEFAULT_SHOW_BOOKMARKS;
  const raw = localStorage.getItem(SHOW_BOOKMARKS_KEY);
  if (raw === null) return DEFAULT_SHOW_BOOKMARKS;
  return raw !== "false";
}

export function saveShowBookmarks(on: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SHOW_BOOKMARKS_KEY, String(on));
  } catch {
    // Storage may be full or disabled; the in-memory setting still applies.
  }
}
