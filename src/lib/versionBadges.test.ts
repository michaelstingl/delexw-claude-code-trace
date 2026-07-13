import { describe, it, expect, vi } from "vitest";
import * as versions from "./versions";
import { logVersionBadges } from "./versionBadges";

describe("logVersionBadges", () => {
  it("logs a frontend badge immediately and a backend badge after fetch", async () => {
    vi.spyOn(versions, "getWebVersion").mockReturnValue("cctrace Web UI 0.10.0 (x1y2z3)");
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    await logVersionBadges(async () => "cctrace 0.11.0 (a1b2c3d)");
    // one call for web, one for backend; both use %c styling
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls.every((c) => String(c[0]).startsWith("%c"))).toBe(true);
    spy.mockRestore();
  });
});
