// check_syntax.mjs — parse every front-end JavaScript module, so a syntax error cannot reach the site.
//   node tools/check_syntax.mjs
// Root .js files are ES modules but there is no package.json at the root, so `node --check` would read
// them as CommonJS and reject every `export`. Copy each to a temp .mjs and check that instead.
// This exists because a stray double quote inside a double-quoted string in shared/i18n.js once broke
// every page at once, and only the browser tests noticed.
import { readdirSync, statSync, copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set(["node_modules", ".git", "og", "data", "downloads"]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.m?js$/.test(name)) out.push(p);
  }
  return out;
}

const tmp = mkdtempSync(path.join(os.tmpdir(), "voc-syntax-"));
const files = walk(root).sort();
let bad = 0;
for (const f of files) {
  const t = path.join(tmp, path.relative(root, f).replace(/[\\/]/g, "__").replace(/\.js$/, ".mjs"));
  copyFileSync(f, t);
  try {
    execFileSync(process.execPath, ["--check", t], { stdio: "pipe" });
  } catch (e) {
    bad++;
    const msg = String(e.stderr || e.message).split("\n").filter(Boolean).slice(0, 4).join("\n    ");
    console.log(`  [XX ] ${path.relative(root, f)}\n    ${msg}`);
  }
}
rmSync(tmp, { recursive: true, force: true });
console.log(`${files.length} JavaScript modules parsed; ${bad} with syntax errors`);
process.exitCode = bad ? 1 : 0;
