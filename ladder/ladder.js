// ladder.js — Figure 6 live: two stacked welfare decompositions on a common (100%) scale.
import { t, nf, init as i18nInit, mountToggle, getLang } from "../shared/i18n.js";
const $ = s => document.querySelector(s);
const COL = { reform: "#21918c", algo: "#5ec962", other: "#c9c9c9" };

// Values as printed in the paper's figure code (fig_welfare_ladder.py). NY in miles of willingness
// to travel (total 18.96); Manta in km-equivalent, Preschool 1 (levels: DC -0.1036, DA 0.5832,
// TTC 0.5857, unconstrained 0.6807 -> total 0.7843).
const NY = { total: 18.96, unit: "mi", bands: [
  { key: "ny0", v: 6.69, kind: "other" }, { key: "ny1", v: 8.54, kind: "reform" }, { key: "ny2", v: 0.62, kind: "algo" }, { key: "ny3", v: 3.11, kind: "other" } ] };
const MA = { total: 0.6807 + 0.1036, unit: "km", bands: [
  { key: "ma1", v: 0.5832 + 0.1036, kind: "reform" }, { key: "ma2", v: 0.5857 - 0.5832, kind: "algo" }, { key: "ma3", v: 0.6807 - 0.5857, kind: "other" } ] };

const TXT = () => ({
  ny0: [t("lad.ny0.h", "From no choice to an uncoordinated choice system"), t("lad.ny0.b", "New York's first step: families could choose at all, but through an uncoordinated process with multiple offers and unfilled seats. 35.3% of the range. Manta has no counterpart — it already had a coordinated system before the reform.")],
  ny1: [t("lad.ny1.h", "Coordinating assignment"), t("lad.ny1.b", "A single coordinated round replaces the uncoordinated process: 45.0% of the range. This band bundles three changes at once — coordination, digitization and acting on families' preferences — and the New York evidence cannot attribute it to any one of them.")],
  ny2: [t("lad.ny2.h", "Algorithm refinements among coordinated mechanisms"), t("lad.ny2.b", "What a more efficient priority-respecting mechanism would add over deferred acceptance: 3.3% of the range (0.62 miles).")],
  ny3: [t("lad.ny3.h", "Beyond any stable mechanism"), t("lad.ny3.b", "The distance from the best stable mechanism to the unconstrained utilitarian optimum: 16.4% (3.11 miles). No mechanism that respects priorities can reach it.")],
  ma1: [t("lad.ma1.h", "Acting on elicited preferences"), t("lad.ma1.b", "Manta's move from the distance rule to deferred acceptance: 87.6% of the range (0.687 km-equivalent per family). Coordination and digitization were held fixed, so this is the value of acting on preferences, alone.")],
  ma2: [t("lad.ma2.h", "Algorithm refinements"), t("lad.ma2.b", "From deferred acceptance to the constrained-efficient benchmark: 0.3% of the range (0.003 km). In the entry grade 93% of families already hold their first choice; there is almost nothing left to trade.")],
  ma3: [t("lad.ma3.h", "Beyond any priority-respecting mechanism"), t("lad.ma3.b", "From the benchmark to the unconstrained cardinal maximum: 12.1% (0.095 km). Reaching it would require overriding priorities.")],
});

let selected = null;

function bar(x, w, spec, label, H, top) {
  let y = top + H, out = "";
  const scale = H / spec.total;
  for (const b of spec.bands) {
    const h = b.v * scale; y -= h;
    const pct = 100 * b.v / spec.total;
    out += `<rect class="band${selected === b.key ? " on" : ""}" data-key="${b.key}" x="${x}" y="${y.toFixed(2)}" width="${w}" height="${Math.max(h, 1.2).toFixed(2)}" fill="${COL[b.kind]}" stroke="#fff" stroke-width="1"></rect>`;
    if (h > 14) out += `<text x="${x + w / 2}" y="${(y + h / 2 + 4).toFixed(2)}" font-size="12" text-anchor="middle" fill="${b.kind === "other" ? "#333" : "#fff"}" pointer-events="none">${nf(pct, 1)}%</text>`;
    else out += `<text x="${x + w + 6}" y="${(y + h / 2 + 4).toFixed(2)}" font-size="11" fill="#333" pointer-events="none">${nf(pct, 1)}%</text>`;
  }
  out += `<text x="${x + w / 2}" y="${top + H + 20}" font-size="13" text-anchor="middle" fill="#111" font-weight="600">${label}</text>`;
  out += `<text x="${x + w / 2}" y="${top + H + 36}" font-size="11" text-anchor="middle" fill="#666">${nf(spec.total, 2)} ${spec.unit} = 100%</text>`;
  return out;
}

function render() {
  const W = 620, H = 380, top = 30, bh = 300;
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t("lad.aria", "Two stacked bars: New York and Manta welfare decompositions on a common scale")}">
    ${[0, 25, 50, 75, 100].map(p => `<line x1="60" x2="${W - 20}" y1="${(top + bh - bh * p / 100).toFixed(1)}" y2="${(top + bh - bh * p / 100).toFixed(1)}" stroke="#eee"></line><text x="52" y="${(top + bh - bh * p / 100 + 4).toFixed(1)}" font-size="11" text-anchor="end" fill="#666">${p}%</text>`).join("")}
    ${bar(110, 150, NY, t("lad.ny.label", "New York City (2003–04)"), bh, top)}
    ${bar(380, 150, MA, t("lad.ma.label", "Manta (2021), Preschool 1"), bh, top)}
  </svg>`;
  $("#fig").innerHTML = svg;
  $("#fig").querySelectorAll(".band").forEach(r => r.addEventListener("click", () => { selected = r.dataset.key; render(); }));
  const T = TXT();
  if (selected && T[selected]) {
    $("#sel_title").textContent = T[selected][0];
    $("#sel_body").innerHTML = T[selected][1] + `<span class=src>${selected.startsWith("ma") ? t("src.paper", "paper, real data") : t("lad.src.ny", "Abdulkadiroğlu, Agarwal & Pathak (2017)")}</span>`;
  } else { $("#sel_title").textContent = t("lad.sel.hint", "Click a band"); $("#sel_body").textContent = ""; }
}

i18nInit(); mountToggle("#langtoggle");
if (getLang() === "es") document.title = "Dos escaleras de bienestar — El valor de elegir";
window.addEventListener("langchange", e => { document.title = e.detail.lang === "es" ? "Dos escaleras de bienestar — El valor de elegir" : "Two welfare ladders — The Value of Choice"; render(); });
render();
