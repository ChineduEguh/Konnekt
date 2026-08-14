import { describe, expect, it } from "vitest";
import { scansToCsv, scansToTsv } from "../shared/export";

describe("analytics exports", () => {
  const rows = [{ day: "2026-08-14", scans: 7 }];

  it("creates a quoted CSV with headers", () => {
    expect(scansToCsv(rows)).toBe('date,qr_scans\n"2026-08-14","7"');
  });

  it("creates a Google Sheets compatible TSV", () => {
    expect(scansToTsv(rows)).toBe("date\tqr_scans\n2026-08-14\t7");
  });

  it("keeps an empty-range preview as a valid header-only TSV", () => {
    expect(scansToTsv([])).toBe("date\tqr_scans");
  });

  it("preserves row order for the copied preview", () => {
    expect(
      scansToTsv([
        { day: "2026-08-13", scans: 2 },
        { day: "2026-08-14", scans: 7 },
      ])
    ).toBe("date\tqr_scans\n2026-08-13\t2\n2026-08-14\t7");
  });
});
