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
