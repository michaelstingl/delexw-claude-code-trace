import { invoke } from "./invoke";
import type { SessionInfo, Bookmark } from "../types";

/** Freezes the current state of a session into a `Bookmark` snapshot.
 * Label prefers the /rename name, then the recap, then the first message,
 * falling back to the session id. */
export function freezeSnapshot(s: SessionInfo): Bookmark {
  const label =
    (s.name && s.name.trim()) || (s.recap && s.recap.trim()) || s.first_message || s.session_id;
  return {
    session_id: s.session_id,
    label,
    recap: s.recap ?? null,
    meta: {
      model: s.model,
      turn_count: s.turn_count,
      recap_turn: s.recap_turn,
      total_tokens: s.total_tokens,
      input_tokens: s.input_tokens,
      output_tokens: s.output_tokens,
      cache_read_tokens: s.cache_read_tokens,
      cache_creation_tokens: s.cache_creation_tokens,
      context_tokens: s.context_tokens,
      cost_usd: s.cost_usd,
      duration_ms: s.duration_ms,
      mod_time: s.mod_time,
      size_bytes: 0,
    },
    bookmarked_at: new Date().toISOString(),
  };
}

export const listBookmarks = (): Promise<Bookmark[]> => invoke("list_bookmarks");

export const addBookmark = (s: SessionInfo): Promise<Bookmark[]> =>
  invoke("add_bookmark", { bookmark: freezeSnapshot(s) });

export const removeBookmark = (sessionId: string): Promise<Bookmark[]> =>
  invoke("remove_bookmark", { sessionId });

export const isBookmarked = (list: Bookmark[], sessionId: string): boolean =>
  list.some((b) => b.session_id === sessionId);
