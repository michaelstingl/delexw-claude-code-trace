import { describe, it, expect, beforeEach, vi } from "vitest";
import { SHOW_BOOKMARKS_KEY, loadShowBookmarks, saveShowBookmarks } from "./showBookmarks";

describe("showBookmarks", () => {
  beforeEach(() => localStorage.clear());
  it("defaults to true when unset", () => {
    expect(loadShowBookmarks()).toBe(true);
  });
  it("round-trips false", () => {
    saveShowBookmarks(false);
    expect(localStorage.getItem(SHOW_BOOKMARKS_KEY)).toBe("false");
    expect(loadShowBookmarks()).toBe(false);
  });
  it("ignores write failures", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => saveShowBookmarks(false)).not.toThrow();
    spy.mockRestore();
  });
});
