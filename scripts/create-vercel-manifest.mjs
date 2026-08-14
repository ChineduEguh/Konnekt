import fs from "node:fs";
import path from "node:path";

const root = "/home/ubuntu/konnekt-platform";
const ignored = new Set(["node_modules", ".git", ".manus-logs", "dist", ".manus"]);
const files = [];
function walk(current) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) walk(full);
    else {
      const relative = path.relative(root, full).split(path.sep).join("/");
      files.push({ file: relative, data: fs.readFileSync(full, "utf8"), encoding: "utf-8" });
    }
  }
}
walk(root);
fs.writeFileSync("/tmp/konnekt-vercel-input.json", JSON.stringify({ name: "konnekt-platform", target: "production", teamId: "team_XG9F1T4a9e4VWPXjObuory5T", projectSettings: { framework: "vite", buildCommand: "pnpm build", installCommand: "pnpm install" }, files }));
console.log(`Prepared ${files.length} deployment files`);
