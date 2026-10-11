import { describe, expect, it } from "vitest";
import { getDisplayStatus, percentOf, resultsVisible } from "./elections";

const now = new Date("2026-05-10T12:00:00Z");
const base = { start_at: "2026-05-09T00:00:00Z", end_at: "2026-05-11T00:00:00Z" };

describe("election status", () => {
  it("draft elections stay draft", () => {
    expect(getDisplayStatus({ ...base, status: "draft" }, now)).toBe("draft");
  });
  it("open election inside its window is active", () => {
    expect(getDisplayStatus({ ...base, status: "open" }, now)).toBe("active");
  });
  it("open election before its start is upcoming", () => {
    expect(getDisplayStatus({ ...base, status: "open" }, new Date("2026-05-01T00:00:00Z"))).toBe("upcoming");
  });
  it("open election past its end is completed", () => {
    expect(getDisplayStatus({ ...base, status: "open" }, new Date("2026-06-01T00:00:00Z"))).toBe("completed");
  });
  it("closed election is completed even inside its window", () => {
    expect(getDisplayStatus({ ...base, status: "closed" }, now)).toBe("completed");
  });
});

describe("results visibility", () => {
  it("hidden while open and unpublished", () => {
    expect(resultsVisible({ status: "open", results_published: false })).toBe(false);
  });
  it("visible when published", () => {
    expect(resultsVisible({ status: "open", results_published: true })).toBe(true);
  });
  it("visible when closed", () => {
    expect(resultsVisible({ status: "closed", results_published: false })).toBe(true);
  });
});

describe("percentages", () => {
  it("142 of 260 is 54.6%", () => expect(percentOf(142, 260)).toBe(54.6));
  it("zero total gives 0", () => expect(percentOf(0, 0)).toBe(0));
});
