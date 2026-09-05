// calibration.js — every synthetic-market moment beside its paper target, read from data/calibration.json.
import { t, nf, init as i18nInit, mountToggle, getLang } from "../shared/i18n.js";
const $ = s => document.querySelector(s);
const GRADES = [["Preschool 1", "2"], ["Preschool 2", "3"], ["Primary 1", "4"]];
const gname = (name, k) => t("grade." + k, name);
const src = key => `<span class=src>${key === "paper" ? t("src.paper", "paper, real data") : t("src.syn", "synthetic population")}</span>`;
let D;

// |synthetic − paper| within `tol` → ok; otherwise gap. `nocmp` rows are shown grey.
const cls = (a, b, tol) => (a === null || b === null || b === undefined) ? "" : Math.abs(a - b) <= tol ? "ok" : "gap";
const arrow = (a, b, d) => `${nf(a, d)} → ${nf(b, d)}`;
const tr = (label, syn, pap, c = "") => `<tr><td>${label}</td><td class="n ${c}">${syn}</td><td class=n>${pap}</td></tr>`;
const head = () => `<thead><tr><th></th><th class=n>${t("cal.th.syn", "synthetic")}</th><th class=n>${t("cal.th.paper", "paper")}</th></tr></thead>`;

function render() {
  const P = D.pooled, T = D.targets, G = D.grid;
  $("#meta").textContent = t("cal.meta", "Generator settings: homes from a {cell} m density grid ({cells} cells, at least {min} households each, covering {cov}% of the estimation sample); {draws} lottery draws, seed {seed}; welfare in kilometre-equivalents.",
    { cell: nf(G.cell_m, 0), cells: nf(G.grids["0"].n_cells), min: G.min_count, cov: nf(100 * G.grids["0"].coverage, 0), draws: D.draws, seed: D.seed });

  $("#pooled").innerHTML = `<table>${head()}<tbody>` +
    tr(t("cal.m.listed", "Placed in a school the family listed, %"), arrow(P.dc.listed, P.da.listed, 1), arrow(T.listed_dc, T.listed_da, 2), cls(P.da.listed - P.dc.listed, T.listed_da - T.listed_dc, 8)) +
    tr(t("cal.m.first", "Placed in the first choice, %"), arrow(P.dc.first, P.da.first, 1), arrow(T.first_dc, T.first_da, 2), cls(P.da.first - P.dc.first, T.first_da - T.first_dc, 4)) +
    tr(t("cal.m.km", "Mean distance travelled, km"), arrow(P.dc.km, P.da.km, 2), arrow(T.km_dc, T.km_da, 2), cls(P.da.km - P.dc.km, T.km_da - T.km_dc, 0.15)) +
    `</tbody></table><p class=tiny>${t("cal.pooled.note", "Rows compare the change from the distance rule to preference-based assignment; a row is green when the synthetic change is within a few points of the paper's.")} ${src("syn")} ${src("paper")}</p>`;

  let rows = "";
  for (const [name, k] of GRADES) {
    const c = D.per_grade[name];
    const pg = key => (T[key] && T[key][k] !== undefined) ? T[key][k] : null;
    rows += `<tr class=g><td colspan=3>${gname(name, k)}</td></tr>`;
    rows += tr(t("cal.m.dalisted", "Preference-based: placed in a listed school, %"), nf(c.da.listed, 1), pg("listed_da_g") === null ? "—" : nf(pg("listed_da_g"), 0), cls(c.da.listed, pg("listed_da_g"), 5));
    rows += tr(t("cal.m.dafirst", "Preference-based: first choice, %"), nf(c.da.first, 1), pg("first_da_g") === null ? "—" : nf(pg("first_da_g"), 0), cls(c.da.first, pg("first_da_g"), 5));
    rows += tr(t("cal.m.dclisted", "Distance rule: placed in a listed school, %"), nf(c.dc.listed, 1), pg("listed_dc_g") === null ? "—" : nf(pg("listed_dc_g"), 0), cls(c.dc.listed, pg("listed_dc_g"), 9));
    rows += tr(t("cal.m.rec", "Share of the distance-rule → benchmark range recovered, %"), nf(c.recovered_share, 1), nf(T.rec[k], 1), k === "4" ? "gap" : cls(c.recovered_share, T.rec[k], 10));
    rows += tr(t("cal.m.gain", "Welfare gain over the distance rule, km-equivalents"), nf(c.gain_km_da_over_dc, 2), pg("gain_km_g") === null ? "—" : nf(pg("gain_km_g"), 2), pg("gain_km_g") === null ? "" : "gap");
    rows += tr(t("cal.m.near", "Rank the nearest school first, %"), nf(100 * c.nearest_first, 0), nf(100 * T.nearest_first[k], 0), cls(100 * c.nearest_first, 100 * T.nearest_first[k], 4));
    rows += tr(t("cal.m.nearkm", "Distance to the nearest school, km (p10 / median / p90)"), c.near_km_p10_p50_p90.map(x => nf(x, 2)).join(" / "), T.near_km[k].map(x => nf(x, 2)).join(" / "), cls(c.near_km_p10_p50_p90[1], T.near_km[k][1], 0.05));
  }
  $("#bygrade").innerHTML = `<table>${head()}<tbody>${rows}</tbody></table><p class=tiny>${t("cal.grade.note", "Paper values are the published estimates for each grade; a dash means the paper reports no directly comparable number. Primary 1's recovered share is marked as a gap by construction: see below.")} ${src("syn")} ${src("paper")}</p>`;

  const R = [["dc", t("cal.rule.dc", "Distance rule")], ["da", t("cal.rule.da", "Deferred acceptance")], ["sic", t("cal.rule.sic", "Constrained-efficient benchmark (stable improvement cycles)")], ["ttc", t("cal.rule.ttc", "Top trading cycles")]];
  let m = `<table><thead><tr><th></th><th class=n>${t("cal.th.listed", "listed %")}</th><th class=n>${t("cal.th.first", "first choice %")}</th><th class=n>${t("cal.th.km", "mean km")}</th><th class=n>${t("cal.th.u", "utility, km-eq")}</th></tr></thead><tbody>`;
  for (const [name, k] of GRADES) {
    const c = D.per_grade[name];
    m += `<tr class=g><td colspan=5>${gname(name, k)}</td></tr>`;
    for (const [r, lab] of R) if (c[r]) m += `<tr><td>${lab}</td><td class=n>${nf(c[r].listed, 1)}</td><td class=n>${nf(c[r].first, 1)}</td><td class=n>${nf(c[r].km, 2)}</td><td class=n>${nf(c[r].utility, 3)}</td></tr>`;
  }
  $("#mech").innerHTML = m + `</tbody></table><p class=tiny>${t("cal.mech.note", "Means over the lottery draws. The benchmark and top trading cycles coincide up to lottery noise, as the paper's Proposition 2 says they must.")} ${src("syn")}</p>`;
}

async function main() {
  D = await fetch("../data/calibration.json").then(r => r.json());
  window.addEventListener("langchange", render);
  render();
}
i18nInit(); mountToggle("#langtoggle");
const TITLES = { en: "Does the synthetic market reproduce the paper? — The Value of Choice", es: "¿Reproduce el mercado sintético al artículo? — El valor de elegir" };
if (getLang() === "es") document.title = TITLES.es;
window.addEventListener("langchange", e => { document.title = TITLES[e.detail.lang] || TITLES.en; });
main().catch(err => { $("#meta").textContent = t("load.fail", "Could not load data"); console.error(err); });
