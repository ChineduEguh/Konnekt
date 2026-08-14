type PatternStyle = "square" | "dots" | "rounded";
type CornerStyle = "square" | "rounded" | "circle";
type FrameStyle = "minimal" | "pill" | "bold";

function shape(
  x: number,
  y: number,
  size: number,
  style: PatternStyle | CornerStyle,
  fill: string
) {
  if (style === "dots" || style === "circle") {
    return `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size * 0.42}" fill="${fill}"/>`;
  }
  const radius = style === "rounded" ? size * 0.18 : 0;
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${fill}"/>`;
}

export function buildStyledQrSvg(
  modules: boolean[][],
  foreground: string,
  background: string,
  pattern: PatternStyle,
  corner: CornerStyle,
  logoDataUrl?: string,
  foregroundEnd?: string | null,
  frameLabel?: string,
  frameStyle: FrameStyle = "minimal"
) {
  const count = modules.length;
  const quiet = 48;
  const size = 720;
  const cell = (size - quiet * 2) / count;
  const finder = (row: number, column: number) =>
    (row < 7 && column < 7) ||
    (row < 7 && column >= count - 7) ||
    (row >= count - 7 && column < 7);
  const fill = foregroundEnd ? "url(#qr-foreground-gradient)" : foreground;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    ...(foregroundEnd
      ? [
          `<defs><linearGradient id="qr-foreground-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${foreground}"/><stop offset="100%" stop-color="${foregroundEnd}"/></linearGradient></defs>`,
        ]
      : []),
    `<rect width="100%" height="100%" fill="${background}"/>`,
  ];
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (modules[row]?.[column] && !finder(row, column)) {
        parts.push(
          shape(quiet + column * cell, quiet + row * cell, cell, pattern, fill)
        );
      }
    }
  }
  const eye = (offsetX: number, offsetY: number) => {
    const x = quiet + offsetX * cell;
    const y = quiet + offsetY * cell;
    parts.push(shape(x, y, cell * 7, corner, fill));
    parts.push(
      `<rect x="${x + cell}" y="${y + cell}" width="${cell * 5}" height="${cell * 5}" fill="${background}"/>`
    );
    parts.push(shape(x + cell * 2, y + cell * 2, cell * 3, corner, fill));
  };
  eye(0, 0);
  eye(count - 7, 0);
  eye(0, count - 7);
  if (logoDataUrl) {
    parts.push(
      `<image href="${logoDataUrl}" x="35%" y="35%" width="30%" height="30%" preserveAspectRatio="xMidYMid slice"/>`
    );
  }
  if (frameLabel?.trim()) {
    const strokeWidth =
      frameStyle === "bold" ? 14 : frameStyle === "pill" ? 8 : 5;
    const radius =
      frameStyle === "pill" ? 42 : frameStyle === "minimal" ? 28 : 10;
    parts.push(
      `<rect x="${strokeWidth / 2}" y="${strokeWidth / 2}" width="${size - strokeWidth}" height="${size - strokeWidth}" rx="${radius}" fill="none" stroke="${foreground}" stroke-width="${strokeWidth}"/>`
    );
    const frameY = size - 24;
    const frameWeight = frameStyle === "bold" ? 700 : 600;
    const frameSize = frameStyle === "pill" ? 24 : 18;
    parts.push(
      `<text x="${size / 2}" y="${frameY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${frameSize}" font-weight="${frameWeight}" letter-spacing="2" fill="${foreground}">${frameLabel.replace(/[<&>\"]|'/g, "")}</text>`
    );
  }
  parts.push("</svg>");
  return parts.join("");
}
