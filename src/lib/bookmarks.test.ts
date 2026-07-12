import { describe, it, expect } from "vitest";
import { freezeSnapshot } from "./bookmarks";
import type { SessionInfo } from "../types";

const base = (over: Partial<SessionInfo>): SessionInfo =>
  ({
    session_id: "s1",
    path: "/p/s1.jsonl",
    first_message: "first",
    recap: null,
    name: null,
    liveness: null,
    turn_count: 3,
    total_tokens: 100,
    input_tokens: 1,
    output_tokens: 1,
    cache_read_tokens: 1,
    cache_creation_tokens: 1,
    context_tokens: 42,
    cost_usd: 0.5,
    duration_ms: 1000,
    model: "opus",
    mod_time: "2026-07-12T00:00:00Z",
    ...over,
  }) as SessionInfo;

describe("freezeSnapshot", () => {
  it("prefers the /rename name for the label", () => {
    expect(freezeSnapshot(base({ name: "My run" })).label).toBe("My run");
  });
  it("falls back to recap then first_message when unnamed", () => {
    expect(freezeSnapshot(base({ name: null, recap: "did X" })).label).toBe("did X");
    expect(freezeSnapshot(base({ name: null, recap: null })).label).toBe("first");
  });
  it("freezes context_tokens and recap into the snapshot", () => {
    const b = freezeSnapshot(base({ recap: "R" }));
    expect(b.meta.context_tokens).toBe(42);
    expect(b.recap).toBe("R");
    expect(b.session_id).toBe("s1");
  });
});
