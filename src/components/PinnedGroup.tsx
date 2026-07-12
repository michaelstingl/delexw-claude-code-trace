import type { SessionInfo, Bookmark } from "../types";
import { BookmarkStar } from "./BookmarkStar";
import {
  formatTokens,
  formatDuration,
  formatExactTime,
  formatCost,
  truncate,
  shortModel,
} from "../lib/format";
import { getModelColor } from "../lib/theme";
import { BsClaude } from "react-icons/bs";
import { ForwardIcon, CostIcon } from "./Icons";

interface PinnedGroupProps {
  bookmarks: Bookmark[];
  sessions: SessionInfo[];
  onSelect: (session: SessionInfo) => void;
  onBookmarksChange: (list: Bookmark[]) => void;
}

/** Renders the "★ Pinned" group above the normal session list. Each bookmark is
 *  joined to the live discovered session (by session_id) when its JSONL is still
 *  present — in that case the row shows live name/recap/numbers, same as a normal
 *  row. When the JSONL is gone, the row falls back to the frozen `Bookmark`
 *  snapshot, is marked `.session-row--unavailable`, and its actions are disabled. */
export function PinnedGroup({
  bookmarks,
  sessions,
  onSelect,
  onBookmarksChange,
}: PinnedGroupProps) {
  if (bookmarks.length === 0) return null;

  return (
    <div className="picker__pinned-group">
      <div className="picker__group-header">★ Pinned</div>
      {bookmarks.map((bookmark) => {
        const live = sessions.find((s) => s.session_id === bookmark.session_id);
        return live ? (
          <LivePinnedRow
            key={bookmark.session_id}
            session={live}
            onSelect={onSelect}
            onBookmarksChange={onBookmarksChange}
          />
        ) : (
          <FrozenPinnedRow key={bookmark.session_id} bookmark={bookmark} />
        );
      })}
    </div>
  );
}

function LivePinnedRow({
  session,
  onSelect,
  onBookmarksChange,
}: {
  session: SessionInfo;
  onSelect: (session: SessionInfo) => void;
  onBookmarksChange: (list: Bookmark[]) => void;
}) {
  const model = shortModel(session.model);
  const modelClr = getModelColor(session.model);
  return (
    <div className="picker__session picker__session--pinned" onClick={() => onSelect(session)}>
      <div className="picker__session-top">
        <span className="picker__session-icon">
          <BsClaude />
        </span>
        <BookmarkStar session={session} bookmarked={true} onChange={onBookmarksChange} />
        <span
          className={`picker__session-preview${session.name ? " picker__session-preview--named" : ""}`}
        >
          {truncate(session.name || session.first_message || session.session_id, 80)}
        </span>
        <button
          className="message__detail-btn"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(session);
          }}
        >
          Detail <ForwardIcon />
        </button>
      </div>
      {session.recap && (
        <div className="picker__session-subtitle picker__session-subtitle--recap">
          <span className="picker__recap-label">Recap:</span> {session.recap}
        </div>
      )}
      <div className="picker__session-meta">
        <span className="picker__session-model" style={{ color: modelClr }}>
          {model}
        </span>
        <span className="picker__session-stat">{session.turn_count} turns</span>
        {session.total_tokens > 0 && (
          <span className="picker__session-stat">{formatTokens(session.total_tokens)} tok</span>
        )}
        {session.context_tokens > 0 && (
          <span className="picker__session-stat">ctx {formatTokens(session.context_tokens)}</span>
        )}
        {session.cost_usd > 0 && (
          <span className="picker__session-stat picker__session-stat--cost">
            <CostIcon /> {formatCost(session.cost_usd)}
          </span>
        )}
        {session.duration_ms > 0 && (
          <span className="picker__session-stat">{formatDuration(session.duration_ms)}</span>
        )}
        {session.mod_time && (
          <span className="picker__session-time">{formatExactTime(session.mod_time)}</span>
        )}
      </div>
    </div>
  );
}

/** Rendered when the bookmarked session's JSONL is no longer on disk: the row shows
 *  the frozen snapshot (label/recap/meta) instead of live data, and its actions
 *  (Detail, the bookmark star) are disabled since there is nothing to open or
 *  re-freeze — only the backend-driven removal in Task 7 can clear it. */
function FrozenPinnedRow({ bookmark }: { bookmark: Bookmark }) {
  const model = shortModel(bookmark.meta.model);
  const modelClr = getModelColor(bookmark.meta.model);
  return (
    <div className="picker__session picker__session--pinned session-row--unavailable">
      <div className="picker__session-top">
        <span className="picker__session-icon">
          <BsClaude />
        </span>
        <button
          className="bookmark-star bookmark-star--on"
          disabled
          aria-label="Session unavailable"
        >
          ★
        </button>
        <span className="picker__session-preview">{truncate(bookmark.label, 80)}</span>
        <span className="picker__session-unavailable-badge">unavailable</span>
        <button className="message__detail-btn" disabled>
          Detail <ForwardIcon />
        </button>
      </div>
      {bookmark.recap && (
        <div className="picker__session-subtitle picker__session-subtitle--recap">
          <span className="picker__recap-label">Recap:</span> {bookmark.recap}
        </div>
      )}
      <div className="picker__session-meta">
        <span className="picker__session-model" style={{ color: modelClr }}>
          {model}
        </span>
        <span className="picker__session-stat">{bookmark.meta.turn_count} turns</span>
        {bookmark.meta.total_tokens > 0 && (
          <span className="picker__session-stat">
            {formatTokens(bookmark.meta.total_tokens)} tok
          </span>
        )}
        {bookmark.meta.context_tokens > 0 && (
          <span className="picker__session-stat">
            ctx {formatTokens(bookmark.meta.context_tokens)}
          </span>
        )}
        {bookmark.meta.cost_usd > 0 && (
          <span className="picker__session-stat picker__session-stat--cost">
            <CostIcon /> {formatCost(bookmark.meta.cost_usd)}
          </span>
        )}
        {bookmark.meta.duration_ms > 0 && (
          <span className="picker__session-stat">{formatDuration(bookmark.meta.duration_ms)}</span>
        )}
      </div>
    </div>
  );
}
