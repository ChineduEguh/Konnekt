export const QR_THEMES = [
  {
    id: "konnekt",
    label: "Konnekt Green",
    foreground: "#003D32",
    background: "#DDF8EC",
  },
  {
    id: "midnight",
    label: "Midnight Blue",
    foreground: "#102A43",
    background: "#E6F0FF",
  },
  {
    id: "coral",
    label: "Coral Signal",
    foreground: "#9B2C2C",
    background: "#FFF0EC",
  },
  {
    id: "violet",
    label: "Violet Studio",
    foreground: "#4C1D95",
    background: "#F3E8FF",
  },
  {
    id: "mono",
    label: "Classic Mono",
    foreground: "#111827",
    background: "#FFFFFF",
  },
] as const;

export const QR_PATTERN_STYLES = ["square", "dots", "rounded"] as const;
export const QR_CORNER_STYLES = ["square", "rounded", "circle"] as const;

export function isQrPatternStyle(
  value: string
): value is (typeof QR_PATTERN_STYLES)[number] {
  return QR_PATTERN_STYLES.includes(
    value as (typeof QR_PATTERN_STYLES)[number]
  );
}

export function isQrCornerStyle(
  value: string
): value is (typeof QR_CORNER_STYLES)[number] {
  return QR_CORNER_STYLES.includes(value as (typeof QR_CORNER_STYLES)[number]);
}

export function canSaveQr(input: {
  smartLinkId?: number | null;
  destinationUrl?: string | null;
  isValidManualUrl?: boolean;
}) {
  const hasSmartLink = Boolean(input.smartLinkId);
  const hasManualUrl = Boolean(input.destinationUrl?.trim());
  if (hasSmartLink === hasManualUrl) return false;
  return hasSmartLink || Boolean(input.isValidManualUrl && hasManualUrl);
}

export function getQrExportFilename(name: string, extension: string) {
  const stem = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "konnekt-qr";
  return `${stem}.${extension}`;
}

export function appendLogoToSvg(svg: string, logoDataUrl?: string) {
  if (!logoDataUrl) return svg;
  return svg.replace(
    "</svg>",
    `<image href="${logoDataUrl}" x="35%" y="35%" width="30%" height="30%" preserveAspectRatio="xMidYMid slice" />` +
      "</svg>"
  );
}
