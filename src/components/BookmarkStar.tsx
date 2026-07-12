import { useState } from "react";
import { VscStarFull, VscStarEmpty } from "react-icons/vsc";
import type { SessionInfo, Bookmark } from "../types";
import { addBookmark, removeBookmark } from "../lib/bookmarks";

export function BookmarkStar({
  session,
  bookmarked,
  onChange,
}: {
  session: SessionInfo;
  bookmarked: boolean;
  onChange: (list: Bookmark[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // don't open the session when starring
    if (busy) return;
    setBusy(true);
    try {
      const list = bookmarked ? await removeBookmark(session.session_id) : await addBookmark(session);
      onChange(list);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      className={`bookmark-star${bookmarked ? " bookmark-star--on" : ""}`}
      onClick={toggle}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark session"}
      title={bookmarked ? "Remove bookmark" : "Bookmark session"}
    >
      {bookmarked ? <VscStarFull aria-hidden /> : <VscStarEmpty aria-hidden />}
    </button>
  );
}
