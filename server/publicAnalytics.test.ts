import { describe, expect, it } from "vitest";
import { calculateTrendPercent, mergeActivityTrend } from "../shared/analytics";
import { isEventFull, validatePublicRegistration } from "../shared/eventPublic";

describe("public event registration helpers", () => {
  it("detects capacity reached without treating unlimited events as full", () => {
    expect(isEventFull(10, 10)).toBe(true);
    expect(isEventFull(9, 10)).toBe(false);
    expect(isEventFull(100, null)).toBe(false);
  });

  it("validates public attendee name and email", () => {
    expect(
      validatePublicRegistration({ name: "A", email: "guest@example.com" })
    ).toBe("Enter your full name");
    expect(
      validatePublicRegistration({ name: "Guest Name", email: "invalid" })
    ).toBe("Enter a valid email address");
    expect(
      validatePublicRegistration({
        name: "Guest Name",
        email: "guest@example.com",
      })
    ).toBeNull();
  });
});

describe("analytics trend helpers", () => {
  it("merges click and scan rows by day", () => {
    expect(
      mergeActivityTrend([
        { day: "2026-08-13", eventType: "click", count: 4 },
        { day: "2026-08-13", eventType: "scan", count: 2 },
        { day: "2026-08-14", eventType: "click", count: 7 },
      ])
    ).toEqual([
      { day: "2026-08-13", clicks: 4, scans: 2 },
      { day: "2026-08-14", clicks: 7, scans: 0 },
    ]);
  });

  it("calculates preceding-period change", () => {
    expect(calculateTrendPercent(150, 100)).toBe(50);
    expect(calculateTrendPercent(0, 0)).toBe(0);
    expect(calculateTrendPercent(4, 0)).toBe(100);
  });
});
