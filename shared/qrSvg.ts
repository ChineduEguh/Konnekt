type PatternStyle = "square" | "dots" | "rounded";
type CornerStyle = "square" | "rounded" | "circle";

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
  logoDataUrl?: string
) {
  const count = modules.length;
  const quiet = 48;
  const size = 720;
  const cell = (size - quiet * 2) / count;
  const finder = (row: number, column: number) =>
    (row < 7 && column < 7) ||
    (row < 7 && column >= count - 7) ||
    (row >= count - 7 && column < 7);
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<rect width="100%" height="100%" fill="${background}"/>`,
  ];
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (modules[row]?.[column] && !finder(row, column)) {
        parts.push(
          shape(
            quiet + column * cell,
            quiet + row * cell,
            cell,
            pattern,
            foreground
          )
        );
      }
    }
  }
  const eye = (offsetX: number, offsetY: number) => {
    const x = quiet + offsetX * cell;
    const y = quiet + offsetY * cell;
    parts.push(shape(x, y, cell * 7, corner, foreground));
    parts.push(
      `<rect x="${x + cell}" y="${y + cell}" width="${cell * 5}" height="${cell * 5}" fill="${background}"/>`
    );
    parts.push(shape(x + cell * 2, y + cell * 2, cell * 3, corner, foreground));
  };
  eye(0, 0);
  eye(count - 7, 0);
  eye(0, count - 7);
  if (logoDataUrl) {
    parts.push(
      `<image href="${logoDataUrl}" x="35%" y="35%" width="30%" height="30%" preserveAspectRatio="xMidYMid slice"/>`
    );
  }
  parts.push("</svg>");
  return parts.join("");
}
