import { describe, expect, it } from "vitest";
import {
  appendLogoToSvg,
  canSaveQr,
  getQrExportFilename,
  isQrCornerStyle,
  isQrPatternStyle,
  QR_THEMES,
} from "../shared/qrStudio";
import { buildStyledQrSvg } from "../shared/qrSvg";

describe("QR Studio helpers", () => {
  it("requires exactly one valid destination source", () => {
    expect(canSaveQr({})).toBe(false);
    expect(canSaveQr({ smartLinkId: 4, destinationUrl: "" })).toBe(true);
    expect(
      canSaveQr({ destinationUrl: "google.com", isValidManualUrl: true })
    ).toBe(true);
    expect(
      canSaveQr({ destinationUrl: "google.com", isValidManualUrl: false })
    ).toBe(false);
    expect(
      canSaveQr({
        smartLinkId: 4,
        destinationUrl: "google.com",
        isValidManualUrl: true,
      })
    ).toBe(false);
  });

  it("creates safe multi-format download filenames", () => {
    expect(getQrExportFilename("Spring Launch 2026", "png")).toBe(
      "spring-launch-2026.png"
    );
    expect(getQrExportFilename("", "pdf")).toBe("konnekt-qr.pdf");
  });

  it("exposes preset themes and validates pattern and corner-eye styles", () => {
    expect(QR_THEMES.length).toBeGreaterThanOrEqual(5);
    expect(isQrPatternStyle("dots")).toBe(true);
    expect(isQrPatternStyle("invalid")).toBe(false);
    expect(isQrCornerStyle("circle")).toBe(true);
    expect(isQrCornerStyle("invalid")).toBe(false);
  });

  it("preserves styled modules, corner eyes, and logos in SVG exports", () => {
    const modules = [
      [true, false, true, false, true, false, true],
      [false, true, false, true, false, true, false],
      [true, false, true, false, true, false, true],
      [false, true, false, true, false, true, false],
      [true, false, true, false, true, false, true],
      [false, true, false, true, false, true, false],
      [true, false, true, false, true, false, true],
    ];
    const svg = buildStyledQrSvg(
      modules,
      "#003D32",
      "#DDF8EC",
      "dots",
      "circle",
      "data:image/png;base64,abc"
    );
    expect(svg).toContain("<circle");
    expect(svg).toContain('href="data:image/png;base64,abc"');
    expect(svg).toContain('fill="#DDF8EC"');
  });

  it("embeds a central logo in SVG exports when provided", () => {
    const svg = "<svg><path /></svg>";
    expect(appendLogoToSvg(svg)).toBe(svg);
    expect(appendLogoToSvg(svg, "data:image/png;base64,abc")).toContain(
      'href="data:image/png;base64,abc"'
    );
  });
});
