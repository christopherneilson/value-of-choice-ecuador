// hero.js — the landing page's opening picture: the same synthetic market under both rules, cross-fading.
// It ships a precomputed 9 KB draw (tools/make_hero.mjs), not the engine, so the front door stays light.
import { t, nf } from "./shared/i18n.js";

const W = 330, H = 330, C = { dc: "#7b3294", da: "#21918c" }, GREY = "#cdcdcd";
const $ = s => document.querySelector(s);
const esc = n => String(n);
let D, rule = "dc", timer = null;

// Trim the far outliers so the core of the market fills the frame; anything outside is clipped.
function projector(pts) {
  const la = pts.map(p => p[0]).sort((a, b) => a - b), lo = pts.map(p => p[1]).sort((a, b) => a - b);
  const q = (v, p) => v[Math.round(p * (v.length - 1))];
  const la0 = q(la, 0.02), la1 = q(la, 0.98), lo0 = q(lo, 0.02), lo1 = q(lo, 0.98);
  const k = Math.cos((la0 + la1) / 2 * Math.PI / 180);
  const sx = W / ((lo1 - lo0) * k), sy = H / (la1 - la0), s = Math.min(sx, sy);
  const ox = (W - (lo1 - lo0) * k * s) / 2, oy = (H - (la1 - la0) * s) / 2;
  return (lat, lon) => [ox + (lon - lo0) * k * s, oy + (la1 - lat) * s];
}

function groupFor(r, P) {
  const o = D[r], col = C[r];
  let lines = "", dots = "";
  for (let i = 0; i < D.homes.length; i++) {
    const [hx, hy] = P(D.homes[i][0], D.homes[i][1]);
    const j = o.s[i], c = o.c[i];
    if (j >= 0) {
      const [sx, sy] = P(D.schools[j][0], D.schools[j][1]);
      lines += `<line x1="${esc(hx.toFixed(1))}" y1="${esc(hy.toFixed(1))}" x2="${esc(sx.toFixed(1))}" y2="${esc(sy.toFixed(1))}" stroke="${c > 0 ? col : GREY}" stroke-width="0.6" opacity="${c > 0 ? 0.3 : 0.42}"></line>`;
    }
    dots += `<circle cx="${esc(hx.toFixed(1))}" cy="${esc(hy.toFixed(1))}" r="${c === 2 ? 2.2 : 1.9}" fill="${c > 0 ? col : GREY}" opacity="${c === 2 ? 0.95 : c === 1 ? 0.55 : 0.95}"></circle>`;
  }
  return `<g class="hg" data-rule="${r}">${lines}${dots}</g>`;
}

function render() {
  const P = projector([...D.homes, ...D.schools.map(s => [s[0], s[1]])]);
  // Schools are drawn as hollow rings: the colour in this picture belongs to the families, whose dots
  // turn from grey to the rule's colour when they are placed somewhere they asked for.
  const schools = D.schools.map(s => {
    const [x, y] = P(s[0], s[1]);
    return `<circle cx="${esc(x.toFixed(1))}" cy="${esc(y.toFixed(1))}" r="${(2.4 + Math.sqrt(s[2]) * 0.42).toFixed(1)}" fill="#ffffff" fill-opacity="0.85" stroke="#4a4a4a" stroke-width="1"></circle>`;
  }).join("");
  $("#herosvg").innerHTML = groupFor("dc", P) + groupFor("da", P) + `<g>${schools}</g>`;
  paint();
}

function paint() {
  document.querySelectorAll("#herosvg .hg").forEach(g => { g.style.opacity = g.dataset.rule === rule ? 1 : 0; });
  document.querySelectorAll("#herobar [data-rule]").forEach(b => {
    const on = b.dataset.rule === rule;
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", on);
    b.style.color = on ? C[b.dataset.rule] : "";
  });
  const o = D[rule], got = o.c.filter(x => x > 0).length;
  $("#herostat").innerHTML = t("hero.stat", "<b>{p}%</b> are placed in a school the family asked for",
    { p: nf(100 * got / o.c.length, 0) });
  const leg = $("#heroleg");
  if (leg) leg.innerHTML =
    `<span><i style="background:${C[rule]}"></i>${t("hero.leg.got", "a family placed where it asked")}</span>` +
    `<span><i style="background:${GREY}"></i>${t("hero.leg.not", "placed somewhere it did not")}</span>` +
    `<span><i style="background:#fff;border:1px solid #4a4a4a"></i>${t("hero.leg.school", "school")}</span>`;
  $("#herosvg").setAttribute("aria-label", t("hero.alt",
    "A map of the synthetic Manta. Each dot is a family, coloured when it is placed in a school it asked for and grey when it is not, with a line to the school it was given. Currently showing: {r}.",
    { r: t(`rule.${rule}`, rule === "dc" ? "Distance rule" : "Deferred acceptance") }));
}

function setRule(r, stop) {
  rule = r;
  if (stop && timer) { clearInterval(timer); timer = null; }
  paint();
}

async function main() {
  const host = $("#hero");
  if (!host) return;
  D = await fetch("data/hero_lines.json").then(r => r.json());
  $("#heronote").innerHTML = t("hero.note",
    "One lottery draw of the synthetic Manta, all three entry grades. The paper's own figures for the same two shares are {a}% and {b}%.",
    { a: nf(D.paper.dc, 0), b: nf(D.paper.da, 0) });
  render();
  host.hidden = false;
  $("#herobar").addEventListener("click", e => { const b = e.target.closest("[data-rule]"); if (b) setRule(b.dataset.rule, true); });
  window.addEventListener("langchange", paint);
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    timer = setInterval(() => setRule(rule === "dc" ? "da" : "dc", false), 3600);
  else setRule("da", true);
  window.VOC = { hero: true };
}
main().catch(err => console.warn("hero unavailable:", err));
