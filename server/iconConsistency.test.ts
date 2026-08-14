import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("shared icon consistency layer", () => {
  const css = readFileSync(
    resolve(process.cwd(), "client/src/index.css"),
    "utf8"
  );

  it("defines shared icon dimensions and stroke treatment", () => {
    expect(css).toContain(".metric-icon svg");
    expect(css).toContain("width: 18px");
    expect(css).toContain("height: 18px");
    expect(css).toContain("stroke-width: 2.1");
  });

  it("defines light and dark semantic icon tokens", () => {
    expect(css).toContain("--icon-green-bg: #e0f6eb");
    expect(css).toContain("--icon-green-bg: #1b4b3d");
    expect(css).toContain("--icon-orange-fg: #ffc49a");
    expect(css).toContain("--icon-blue-fg: #b8c8ff");
    expect(css).toContain("--icon-purple-fg: #e0beff");
    expect(css).toContain(".dark .metric-icon");
  });
});
