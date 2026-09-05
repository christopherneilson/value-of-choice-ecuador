// check_links.mjs — every local href/src in the site's HTML must resolve to a file (or a directory
// with index.html). External links, mailto:, data: and anchors are skipped. Query strings ignored.
//   node tools/check_links.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith(".html")) htmlFiles.push(p);
  }
})(root);

let bad = 0, checked = 0;
for (const f of htmlFiles) {
  // strip scripts and styles: template literals inside them (src=${d.thumb}) are not links
  const html = fs.readFileSync(f, "utf8").replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "");
  const re = /(?:href|src)=["']?([^"'\s>]+)/g;
  let m;
  while ((m = re.exec(html))) {
    let ref = m[1];
    if (/^(https?:)?\/\//.test(ref) || /^(mailto:|data:|#|javascript:)/.test(ref)) continue;
    ref = ref.split("#")[0].split("?")[0];
    if (!ref) continue;
    const target = ref.startsWith("/") ? path.join(root, ref) : path.resolve(path.dirname(f), ref);
    const ok = fs.existsSync(target) && (fs.statSync(target).isFile() || fs.existsSync(path.join(target, "index.html")));
    checked++;
    if (!ok) { bad++; console.log(`  [XX ] ${path.relative(root, f)} -> ${m[1]}`); }
  }
}
console.log(`${checked} local links checked in ${htmlFiles.length} HTML files; ${bad} broken`);
process.exitCode = bad ? 1 : 0;
