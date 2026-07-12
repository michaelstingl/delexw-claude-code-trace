import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BookmarkStar } from "./BookmarkStar";

vi.mock("../lib/bookmarks", () => ({
  addBookmark: vi.fn(async () => [{ session_id: "s1" }]),
  removeBookmark: vi.fn(async () => []),
}));
import { addBookmark, removeBookmark } from "../lib/bookmarks";

const session = { session_id: "s1" } as any;

describe("BookmarkStar", () => {
  beforeEach(() => vi.clearAllMocks());
  it("adds when not bookmarked", async () => {
    const onChange = vi.fn();
    render(<BookmarkStar session={session} bookmarked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(addBookmark).toHaveBeenCalledWith(session));
    expect(onChange).toHaveBeenCalled();
  });
  it("removes when already bookmarked", async () => {
    render(<BookmarkStar session={session} bookmarked={true} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(removeBookmark).toHaveBeenCalledWith("s1"));
  });
});
