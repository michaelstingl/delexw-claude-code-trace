import { describe, it, expect } from "vitest";
import { formatVersion } from "./versions";

describe("formatVersion", () => {
  it("formats version + commit", () => {
    expect(formatVersion({ version: "0.11.0", commit: "a1b2c3d", dirty: false })).toBe(
      "0.11.0 (a1b2c3d)",
    );
  });
  it("marks dirty", () => {
    expect(formatVersion({ version: "0.11.0", commit: "a1b2c3d", dirty: true })).toBe(
      "0.11.0 (a1b2c3d, dirty)",
    );
  });
});
