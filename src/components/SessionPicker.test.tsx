import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { SessionPicker } from "./SessionPicker";
import type { SessionInfo, Bookmark } from "../types";
import type { ViewActions } from "../hooks/useViewActions";

vi.mock("../lib/bookmarks", () => ({
  listBookmarks: vi.fn(async () => []),
  addBookmark: vi.fn(async () => []),
  removeBookmark: vi.fn(async () => []),
  isBookmarked: (list: Bookmark[], sessionId: string) =>
    list.some((b) => b.session_id === sessionId),
}));
import { listBookmarks } from "../lib/bookmarks";

type IOCallback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

class FakeIO {
  static last: FakeIO | null = null;
  cb: IOCallback;
  observed: Element[] = [];
  observe = (el: Element) => {
    this.observed.push(el);
  };
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => [] as IntersectionObserverEntry[]);
  root = null;
  rootMargin = "";
  thresholds: number[] = [];
  constructor(cb: IOCallback) {
    this.cb = cb;
    FakeIO.last = this;
  }
  trigger(els: Element[]) {
    const entries = els.map(
      (el) =>
        ({
          target: el,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: new DOMRect(),
          intersectionRect: new DOMRect(),
          rootBounds: new DOMRect(),
          time: 0,
        }) as unknown as IntersectionObserverEntry,
    );
    this.cb(entries, this as unknown as IntersectionObserver);
  }
}

function makeSession(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    path: "/home/user/.claude/projects/proj/session1.jsonl",
    session_id: "session1",
    mod_time: new Date().toISOString(),
    first_message: "Hello world",
    recap: null,
    recap_turn: 0,
    turn_count: 5,
    is_ongoing: false,
    total_tokens: 2000,
    input_tokens: 1000,
    output_tokens: 1000,
    cache_read_tokens: 0,
    cache_creation_tokens: 0,
    context_tokens: 0,
    cost_usd: 0.05,
    duration_ms: 30000,
    model: "claude-sonnet-4-20250514",
    cwd: "/home/user/proj",
    git_branch: "main",
    permission_mode: "default",
    ...overrides,
  };
}

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    session_id: "session1",
    label: "Frozen label",
    recap: null,
    meta: {
      model: "claude-sonnet-4-20250514",
      turn_count: 3,
      recap_turn: 3,
      total_tokens: 1000,
      input_tokens: 500,
      output_tokens: 500,
      cache_read_tokens: 0,
      cache_creation_tokens: 0,
      context_tokens: 99000,
      cost_usd: 0.1,
      duration_ms: 10000,
      mod_time: new Date().toISOString(),
      size_bytes: 0,
    },
    bookmarked_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("SessionPicker", () => {
  beforeEach(() => {
    vi.mocked(listBookmarks).mockResolvedValue([]);
  });

  it("shows a pinned session live when its JSONL is present", async () => {
    vi.mocked(listBookmarks).mockResolvedValue([
      makeBookmark({ session_id: "session1", label: "Frozen name" }),
    ]);
    const sessions = [makeSession({ session_id: "session1", name: "Live name" })];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Pinned/)).toBeInTheDocument());
    // Live name wins over the frozen label.
    expect(screen.getAllByText("Live name").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Frozen name")).not.toBeInTheDocument();
  });

  it("keeps the ACTIVE label on a pinned session that is still ongoing", async () => {
    vi.mocked(listBookmarks).mockResolvedValue([
      makeBookmark({ session_id: "session1", label: "Frozen name" }),
    ]);
    const sessions = [makeSession({ session_id: "session1", name: "Live name", is_ongoing: true })];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Pinned/)).toBeInTheDocument());
    // The pinned (deduped-from-the-normal-list) row must still show ACTIVE.
    const pinned = document.querySelector(".picker__session--pinned");
    expect(pinned?.querySelector(".picker__session-ongoing")).not.toBeNull();
    expect(pinned).toHaveTextContent("ACTIVE");
  });

  it("does not duplicate a pinned session in the normal date-group list", async () => {
    vi.mocked(listBookmarks).mockResolvedValue([
      makeBookmark({ session_id: "session1", label: "Frozen name" }),
    ]);
    const sessions = [makeSession({ session_id: "session1", name: "Live name" })];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Pinned/)).toBeInTheDocument());
    // Rendered exactly once (in ★ Pinned) — not again in the "Today" date group.
    expect(screen.getAllByText("Live name")).toHaveLength(1);
    expect(document.querySelectorAll(".picker__session--pinned")).toHaveLength(1);
    expect(
      document.querySelectorAll(".picker__session:not(.picker__session--pinned)"),
    ).toHaveLength(0);
    // Its date-group header ("Today") has no other sessions either, so it's omitted.
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
  });

  it("does not render an Update snapshot button on a live pinned row", async () => {
    vi.mocked(listBookmarks).mockResolvedValue([
      makeBookmark({ session_id: "session1", label: "Frozen name" }),
    ]);
    const sessions = [makeSession({ session_id: "session1", name: "Live name" })];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Pinned/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /update snapshot/i })).not.toBeInTheDocument();
  });

  it("does not render an Update snapshot button on a frozen (unavailable) pinned row", async () => {
    vi.mocked(listBookmarks).mockResolvedValue([
      makeBookmark({ session_id: "gone", label: "Frozen", recap: "R" }),
    ]);
    render(
      <SessionPicker
        sessions={[]}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText("Frozen")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /update snapshot/i })).not.toBeInTheDocument();
  });

  it("pinned row: recap has no age marker when the live session still has a recap", async () => {
    vi.mocked(listBookmarks).mockResolvedValue([
      makeBookmark({ session_id: "session1", label: "Frozen name", recap: "old recap" }),
    ]);
    const sessions = [
      makeSession({ session_id: "session1", name: "Live name", recap: "R", turn_count: 30 }),
    ];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Pinned/)).toBeInTheDocument());
    const label = document.querySelector(".picker__session--pinned .picker__recap-label")!;
    expect(label.textContent).toBe("Recap:");
    expect(label.querySelector(".picker__recap-label__stale")).toBeNull();
  });

  it("pinned row: shows a stale age marker and the frozen recap when the live session has no recap", async () => {
    vi.mocked(listBookmarks).mockResolvedValue([
      makeBookmark({
        session_id: "session1",
        label: "Frozen name",
        recap: "R",
        meta: { ...makeBookmark().meta, recap_turn: 18 },
      }),
    ]);
    const sessions = [
      makeSession({ session_id: "session1", name: "Live name", recap: null, turn_count: 30 }),
    ];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Pinned/)).toBeInTheDocument());
    const label = document.querySelector(".picker__session--pinned .picker__recap-label")!;
    expect(label.textContent).toBe("Recap · +12 turns ago:");
    const stale = label.querySelector(".picker__recap-label__stale")!;
    expect(stale.textContent).toBe(" · +12 turns ago");
  });

  it("pinned row: legacy bookmark with recap_turn 0 shows no age marker on a live working session", async () => {
    vi.mocked(listBookmarks).mockResolvedValue([
      makeBookmark({
        session_id: "session1",
        label: "Frozen name",
        recap: "R",
        meta: { ...makeBookmark().meta, recap_turn: 0 },
      }),
    ]);
    const sessions = [
      makeSession({ session_id: "session1", name: "Live name", recap: null, turn_count: 30 }),
    ];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Pinned/)).toBeInTheDocument());
    const label = document.querySelector(".picker__session--pinned .picker__recap-label")!;
    expect(label.textContent).toBe("Recap:");
    expect(label.querySelector(".picker__recap-label__stale")).toBeNull();
  });

  it("pinned row: falls back to the bookmark label when the session has no name", async () => {
    vi.mocked(listBookmarks).mockResolvedValue([
      makeBookmark({ session_id: "session1", label: "Pinned name" }),
    ]);
    const sessions = [makeSession({ session_id: "session1", name: null, first_message: "fm" })];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    await waitFor(() => expect(document.querySelector(".picker__session--pinned")).not.toBeNull());
    const pinned = document.querySelector(".picker__session--pinned")!;
    expect(pinned).toHaveTextContent("Pinned name");
    expect(pinned).not.toHaveTextContent("fm");
  });

  it("pinned row: honors pickerFields toggles (tok stat hidden when off, shown when on)", async () => {
    vi.mocked(listBookmarks).mockResolvedValue([
      makeBookmark({ session_id: "session1", label: "Frozen name" }),
    ]);
    const sessions = [
      makeSession({ session_id: "session1", name: "Live name", total_tokens: 2000 }),
    ];
    const { rerender } = render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
        pickerFields={{
          model: true,
          turns: true,
          ctx: true,
          tok: false,
          cost: true,
          duration: true,
          totals: true,
        }}
      />,
    );
    await waitFor(() => expect(screen.getByText(/Pinned/)).toBeInTheDocument());
    expect(document.querySelector(".picker__session--pinned")!.textContent).not.toContain("tok");

    rerender(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
        pickerFields={{
          model: true,
          turns: true,
          ctx: true,
          tok: true,
          cost: true,
          duration: true,
          totals: true,
        }}
      />,
    );
    await waitFor(() =>
      expect(document.querySelector(".picker__session--pinned")!.textContent).toContain("tok"),
    );
  });

  it("falls back to the frozen snapshot with disabled actions when the JSONL is gone", async () => {
    vi.mocked(listBookmarks).mockResolvedValue([
      makeBookmark({ session_id: "gone", label: "Frozen", recap: "R" }),
    ]);
    render(
      <SessionPicker
        sessions={[]}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText("Frozen")).toBeInTheDocument());
    const row = screen.getByText("Frozen").closest(".session-row--unavailable");
    expect(row).not.toBeNull();
    const detailBtn = row!.querySelector(".message__detail-btn") as HTMLButtonElement | null;
    expect(detailBtn).not.toBeNull();
    expect(detailBtn!.disabled).toBe(true);
  });

  it("shows loading spinner when loading", () => {
    render(
      <SessionPicker
        sessions={[]}
        loading={true}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Discovering sessions/)).toBeInTheDocument();
  });

  it("shows 'No sessions found' when empty and no search", () => {
    render(
      <SessionPicker
        sessions={[]}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    expect(screen.getByText("No sessions found")).toBeInTheDocument();
  });

  it("shows 'No matching sessions' when empty and searching", () => {
    render(
      <SessionPicker
        sessions={[]}
        loading={false}
        searchQuery="xyz"
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    expect(screen.getByText("No matching sessions")).toBeInTheDocument();
  });

  it("renders sessions grouped by date", () => {
    const sessions = [makeSession()];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    // Should show "Today" group header since mod_time is now
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText(/Hello world/)).toBeInTheDocument();
  });

  it("prefers the session name as title, with first_message as subtitle", () => {
    const sessions = [makeSession({ name: "valkey-admin-contribution" })];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    // Name is the primary title; first_message survives as the subtitle.
    const title = screen.getByText("valkey-admin-contribution");
    expect(title).toBeInTheDocument();
    // Named sessions get the accent-highlight modifier class.
    expect(title).toHaveClass("picker__session-preview--named");
    expect(screen.getByText(/Hello world/)).toBeInTheDocument();
  });

  it("falls back to first_message when no name is set", () => {
    const sessions = [makeSession({ name: null })];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Hello world/)).toBeInTheDocument();
  });

  it("unnamed session: keeps first_message as the main line and adds the recap as the subtitle", () => {
    const sessions = [
      makeSession({ name: null, first_message: "just do it", recap: "Migrated X, decided Y" }),
    ];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
        recapPreview={true}
      />,
    );
    // Main line is left untouched (the first message); the recap is a second line below it.
    expect(screen.getByText(/just do it/)).toBeInTheDocument();
    expect(screen.getByText(/Migrated X, decided Y/)).toBeInTheDocument();
  });

  it("unnamed session: no recap subtitle when recapPreview is off", () => {
    const sessions = [
      makeSession({ name: null, first_message: "just do it", recap: "Migrated X" }),
    ];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
        recapPreview={false}
      />,
    );
    expect(screen.getByText(/just do it/)).toBeInTheDocument();
    expect(screen.queryByText(/Migrated X/)).not.toBeInTheDocument();
  });

  it("named session: keeps the name as title and shows the recap as the subtitle", () => {
    const sessions = [
      makeSession({
        name: "home-lab-4e",
        first_message: "bitte lies issue 13",
        recap: "VictoriaLogs migration planned",
      }),
    ];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
        recapPreview={true}
      />,
    );
    // Name stays the title (a `/rename` or derived name is never replaced)...
    expect(screen.getByText("home-lab-4e")).toHaveClass("picker__session-preview--named");
    // ...and the recap takes the subtitle line, replacing the first message.
    expect(screen.getByText(/VictoriaLogs migration planned/)).toBeInTheDocument();
    expect(screen.queryByText(/bitte lies issue 13/)).not.toBeInTheDocument();
  });

  it("named session: keeps the first_message subtitle when recapPreview is off", () => {
    const sessions = [
      makeSession({
        name: "home-lab-4e",
        first_message: "bitte lies issue 13",
        recap: "VictoriaLogs migration planned",
      }),
    ];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
        recapPreview={false}
      />,
    );
    expect(screen.getByText("home-lab-4e")).toBeInTheDocument();
    expect(screen.getByText(/bitte lies issue 13/)).toBeInTheDocument();
    expect(screen.queryByText(/VictoriaLogs/)).not.toBeInTheDocument();
  });

  it("shows active badge for ongoing sessions", () => {
    const sessions = [makeSession({ is_ongoing: true })];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });

  it("shows model, tokens, cost, duration, and time", () => {
    const sessions = [
      makeSession({
        model: "claude-sonnet-4-20250514",
        total_tokens: 5000,
        cost_usd: 1.23,
        duration_ms: 60000,
      }),
    ];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    expect(screen.getByText("sonnet4")).toBeInTheDocument();
    // Tokens appear in both header and session row
    expect(screen.getAllByText(/5\.0k/).length).toBeGreaterThanOrEqual(1);
    // Cost appears in both header and session row
    expect(screen.getAllByText("1.23")).toHaveLength(2);
    expect(screen.getByText("1m 0s")).toBeInTheDocument();
  });

  it("search input updates on change", () => {
    const onSearchChange = vi.fn();
    render(
      <SessionPicker
        sessions={[]}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={onSearchChange}
      />,
    );
    const input = screen.getByPlaceholderText("Search sessions...");
    fireEvent.change(input, { target: { value: "test" } });
    expect(onSearchChange).toHaveBeenCalledWith("test");
  });

  it("selected session is highlighted", () => {
    const sessions = [makeSession()];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    const sessionEl = screen.getByText(/Hello world/).closest(".picker__session")!;
    expect(sessionEl).toHaveClass("picker__session--selected");
  });

  it("clicking session calls onSelect", () => {
    const onSelect = vi.fn();
    const sessions = [makeSession()];
    render(
      <SessionPicker
        sessions={sessions}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={onSelect}
        onSearchChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText(/Hello world/).closest(".picker__session")!);
    expect(onSelect).toHaveBeenCalledWith(sessions[0]);
  });

  it("does not show loading spinner when not loading", () => {
    render(
      <SessionPicker
        sessions={[makeSession()]}
        loading={false}
        searchQuery=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Discovering sessions/)).not.toBeInTheDocument();
  });

  describe("viewport-aware visibility tracking", () => {
    beforeEach(() => {
      FakeIO.last = null;
      (globalThis as { IntersectionObserver: unknown }).IntersectionObserver = FakeIO;
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("observes each session card and reports visible paths via onVisiblePathsChange", () => {
      const onVisible = vi.fn();
      const sessions = [
        makeSession({ path: "/a.jsonl", session_id: "a", first_message: "alpha" }),
        makeSession({ path: "/b.jsonl", session_id: "b", first_message: "beta" }),
      ];
      render(
        <SessionPicker
          sessions={sessions}
          loading={false}
          searchQuery=""
          selectedIndex={0}
          onSelect={vi.fn()}
          onSearchChange={vi.fn()}
          onVisiblePathsChange={onVisible}
        />,
      );
      expect(FakeIO.last).not.toBeNull();
      expect(FakeIO.last!.observed).toHaveLength(2);

      act(() => {
        FakeIO.last!.trigger(FakeIO.last!.observed);
        vi.advanceTimersByTime(150);
      });
      expect(onVisible).toHaveBeenCalledExactlyOnceWith(
        expect.arrayContaining(["/a.jsonl", "/b.jsonl"]),
      );
    });

    it("works without onVisiblePathsChange (no-op observer)", () => {
      const sessions = [makeSession()];
      expect(() =>
        render(
          <SessionPicker
            sessions={sessions}
            loading={false}
            searchQuery=""
            selectedIndex={0}
            onSelect={vi.fn()}
            onSearchChange={vi.fn()}
          />,
        ),
      ).not.toThrow();
    });
  });

  describe("toolbar scroll actions", () => {
    it("registers scrollToTop/scrollToBottom that scroll the session list", () => {
      const viewActionsRef = { current: {} as ViewActions };
      const sessions = [
        makeSession(),
        makeSession({ session_id: "s2", path: "/home/user/.claude/projects/proj/s2.jsonl" }),
      ];

      render(
        <SessionPicker
          sessions={sessions}
          loading={false}
          searchQuery=""
          selectedIndex={0}
          onSelect={vi.fn()}
          onSearchChange={vi.fn()}
          viewActionsRef={viewActionsRef}
        />,
      );

      const list = document.querySelector(".picker__list") as HTMLElement;
      // jsdom has no layout: fake a scrollable height so top != bottom.
      Object.defineProperty(list, "scrollHeight", { value: 5000, configurable: true });
      const scrollTo = vi.fn();
      list.scrollTo = scrollTo as unknown as typeof list.scrollTo;

      act(() => viewActionsRef.current.scrollToBottom?.());
      expect(scrollTo).toHaveBeenCalledWith({ top: 5000, behavior: "smooth" });

      act(() => viewActionsRef.current.scrollToTop?.());
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    });
  });

  describe("pickerFields", () => {
    it("hides a field when off and keeps others when its pref is false", () => {
      const sessions = [makeSession({ cost_usd: 1.23, duration_ms: 45000 })];
      render(
        <SessionPicker
          sessions={sessions}
          loading={false}
          searchQuery=""
          selectedIndex={0}
          onSelect={vi.fn()}
          onSearchChange={vi.fn()}
          pickerFields={{
            model: true,
            turns: true,
            ctx: true,
            tok: true,
            cost: false,
            duration: true,
            totals: true,
          }}
        />,
      );
      expect(document.querySelector(".picker__session-stat--cost")).not.toBeInTheDocument();
      expect(screen.getByText(/5 turns/)).toBeInTheDocument();
    });

    it("hides the ctx stat when the ctx field is off, and shows it when on", () => {
      const sessions = [makeSession({ context_tokens: 12345 })];
      const { rerender } = render(
        <SessionPicker
          sessions={sessions}
          loading={false}
          searchQuery=""
          selectedIndex={0}
          onSelect={vi.fn()}
          onSearchChange={vi.fn()}
          pickerFields={{
            model: true,
            turns: true,
            ctx: false,
            tok: true,
            cost: true,
            duration: true,
            totals: true,
          }}
        />,
      );
      expect(screen.queryByText(/ctx /)).not.toBeInTheDocument();

      rerender(
        <SessionPicker
          sessions={sessions}
          loading={false}
          searchQuery=""
          selectedIndex={0}
          onSelect={vi.fn()}
          onSearchChange={vi.fn()}
          pickerFields={{
            model: true,
            turns: true,
            ctx: true,
            tok: true,
            cost: true,
            duration: true,
            totals: true,
          }}
        />,
      );
      expect(screen.getByText(/ctx /)).toBeInTheDocument();
    });

    it("hides the header totals when the totals field is off", () => {
      const sessions = [makeSession({ total_tokens: 2000, cost_usd: 1.23 })];
      render(
        <SessionPicker
          sessions={sessions}
          loading={false}
          searchQuery=""
          selectedIndex={0}
          onSelect={vi.fn()}
          onSearchChange={vi.fn()}
          pickerFields={{
            model: true,
            turns: true,
            ctx: true,
            tok: true,
            cost: true,
            duration: true,
            totals: false,
          }}
        />,
      );
      expect(document.querySelector(".picker__total-tokens")).not.toBeInTheDocument();
      expect(document.querySelector(".picker__total-cost")).not.toBeInTheDocument();
    });

    it("shows all fields by default when pickerFields is not supplied", () => {
      const sessions = [makeSession({ cost_usd: 1.23 })];
      render(
        <SessionPicker
          sessions={sessions}
          loading={false}
          searchQuery=""
          selectedIndex={0}
          onSelect={vi.fn()}
          onSearchChange={vi.fn()}
        />,
      );
      expect(document.querySelector(".picker__session-stat--cost")).toBeInTheDocument();
    });
  });

  describe("showBookmarks", () => {
    it("hides the pinned group and the per-row star when off", async () => {
      vi.mocked(listBookmarks).mockResolvedValue([
        makeBookmark({ session_id: "session1", label: "Frozen name" }),
      ]);
      const sessions = [makeSession({ session_id: "session1", name: "Live name" })];
      render(
        <SessionPicker
          sessions={sessions}
          loading={false}
          searchQuery=""
          selectedIndex={0}
          onSelect={vi.fn()}
          onSearchChange={vi.fn()}
          showBookmarks={false}
        />,
      );
      await waitFor(() => expect(listBookmarks).toHaveBeenCalled());
      expect(screen.queryByText(/Pinned/)).not.toBeInTheDocument();
      expect(document.querySelector(".picker__session--pinned")).not.toBeInTheDocument();
      expect(document.querySelector(".bookmark-star")).not.toBeInTheDocument();
      // The session still renders (undeduped) since there's no pinned group to show it in.
      expect(screen.getByText("Live name")).toBeInTheDocument();
    });

    it("shows the pinned group and the per-row star by default", async () => {
      vi.mocked(listBookmarks).mockResolvedValue([]);
      const sessions = [makeSession({ session_id: "session1", name: "Live name" })];
      render(
        <SessionPicker
          sessions={sessions}
          loading={false}
          searchQuery=""
          selectedIndex={0}
          onSelect={vi.fn()}
          onSearchChange={vi.fn()}
        />,
      );
      await waitFor(() => expect(listBookmarks).toHaveBeenCalled());
      expect(document.querySelector(".bookmark-star")).toBeInTheDocument();
    });
  });
});
