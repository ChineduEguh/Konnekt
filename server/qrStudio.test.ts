import { describe, expect, it } from "vitest";
import {
  appendLogoToSvg,
  canSaveQr,
  getQrExportFilename,
} from "../shared/qrStudio";

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

  it("embeds a central logo in SVG exports when provided", () => {
    const svg = "<svg><path /></svg>";
    expect(appendLogoToSvg(svg)).toBe(svg);
    expect(appendLogoToSvg(svg, "data:image/png;base64,abc")).toContain(
      'href="data:image/png;base64,abc"'
    );
  });
});
