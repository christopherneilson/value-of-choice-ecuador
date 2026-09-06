// gains.js — who gains from acting on preferences: a map of winners and losers, and the gain against
// the schooling of each family's neighbourhood. Runs the engine live (in the simulator's worker).
import { buildMarket } from "../engine/engine.js";
import { runJobs } from "../shared/simjobs.js";
import { t, nf, init as i18nInit, mountToggle, getLang } from "../shared/i18n.js";

const $ = s => document.querySelector(s);
const GRADE_EN = { 2: "Preschool 1", 3: "Preschool 2", 4: "Primary 1" };
const gradeName = g => t(`grade.${g}`, GRADE_EN[g]);
const EPS = 0.01;          // the paper's threshold for "essentially unaffected", in km-equivalents
const DRAWS = 30, CAP = 2; // colour scale saturates at +/- CAP km
const WIN = "#21918c", LOSE = "#b42318", FLAT = "#c9c9c9";
const SES_RAMP = ["#f3e79b", "#c9d98a", "#8ec5a0", "#5aa8b0", "#3d7fa6", "#37518f"];

// The paper's own figures (Section 6, "Who gains"). Preschool 2 and Primary 1 report only the losing
// share and the gradient; the paper scopes the quartile reading to the two preschool grades.
const PAPER = {
  2: { gain: 51.8, same: 31.1, lose: 17.1, gainKm: 1.43, loseKm: 0.32, q: [0.79, 0.68, 0.68, 0.59], grad: 0.196, ci: [0.011, 0.385] },
  3: { lose: 33.7, q: [0.49, 0.38, 0.34, 0.15], grad: 0.335, ci: [0.116, 0.545] },
  4: { lose: 57.4, q: null, grad: 0.075, ci: [-0.354, 0.485] },
};

const state = { grade: 2, colour: "gain" };
let schoolsJson = null, map, schoolLayer, homeLayer;
const appsJson = {}, markets = {};
let D = null;   // { apps, gain, ses, quart, dec, inc }

// ------------------------------------------------------------------------------ scales
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function gainColour(x) {
  if (!Number.isFinite(x)) return FLAT;
  if (Math.abs(x) <= EPS) return FLAT;
  const k = clamp(Math.abs(x) / CAP, 0.18, 1);
  const [r, g, b] = x > 0 ? [33, 145, 140] : [180, 35, 24];
  return `rgba(${r},${g},${b},${(0.25 + 0.75 * k).toFixed(2)})`;
}
const sesColour = (v, lo, hi) => !Number.isFinite(v) ? "#e6e6e6"
  : SES_RAMP[clamp(Math.floor((v - lo) / (hi - lo + 1e-9) * SES_RAMP.length), 0, SES_RAMP.length - 1)];

const quantile = (sorted, p) => { const i = (sorted.length - 1) * p, lo = Math.floor(i); return sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo); };
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;

// ---------------------------------------------------------------------------- compute
async function compute() {
  const g = state.grade;
  if (!appsJson[g]) {
    appsJson[g] = await fetch(`../data/applicants_g${g}.json`).then(r => r.json());
    markets[g] = buildMarket(schoolsJson, appsJson[g]);
  }
  const out = await runJobs(schoolsJson, appsJson[g], markets[g], { main: { draws: DRAWS, rules: ["dc", "da"], perFamily: true } });
  const pf = out.main.perFamily;
  const apps = appsJson[g].applicants;
  const gain = Array.from(apps, (_, i) => pf.da[i] - pf.dc[i]);
  const ses = apps.map(a => (a.ses === undefined ? NaN : a.ses));

  const fin = gain.filter(Number.isFinite);
  const inc = {
    gain: 100 * fin.filter(x => x > EPS).length / fin.length,
    same: 100 * fin.filter(x => Math.abs(x) <= EPS).length / fin.length,
    lose: 100 * fin.filter(x => x < -EPS).length / fin.length,
    gainKm: mean(fin.filter(x => x > EPS)) || 0,
    loseKm: -mean(fin.filter(x => x < -EPS)) || 0,
    mean: mean(fin),
  };

  // quartiles and deciles of the neighbourhood measure, each with its mean gain
  const paired = apps.map((a, i) => ({ s: ses[i], g: gain[i] })).filter(p => Number.isFinite(p.s) && Number.isFinite(p.g));
  const sortedS = paired.map(p => p.s).sort((a, b) => a - b);
  const bucket = (k) => {
    const cuts = Array.from({ length: k - 1 }, (_, j) => quantile(sortedS, (j + 1) / k));
    const bins = Array.from({ length: k }, () => []);
    for (const p of paired) { let b = 0; while (b < cuts.length && p.s > cuts[b]) b++; bins[b].push(p); }
    return bins.map(b => {
      const v = b.map(x => x.g), mu = v.length ? mean(v) : NaN;
      const se = v.length > 1 ? Math.sqrt(v.reduce((s, x) => s + (x - mu) ** 2, 0) / (v.length * (v.length - 1))) : NaN;
      return { n: b.length, s: b.length ? mean(b.map(x => x.s)) : NaN, g: mu, se };
    });
  };
  D = { apps, gain, ses, paired, inc, quart: bucket(4), dec: bucket(10),
        sesLo: sortedS.length ? sortedS[0] : 0, sesHi: sortedS.length ? sortedS[sortedS.length - 1] : 1,
        seats: Array.from(markets[g].caps).reduce((a, b) => a + b, 0) };
}

// -------------------------------------------------------------------------------- map
function initMap() {
  map = L.map("map", { preferCanvas: true, zoomControl: true });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
  homeLayer = L.layerGroup().addTo(map); schoolLayer = L.layerGroup().addTo(map);
  const m = markets[state.grade], pts = [];
  for (let j = 0; j < m.J; j++) pts.push([m.sLat[j], m.sLon[j]]);
  map.fitBounds(L.latLngBounds(pts).pad(0.06));
}

function drawMap() {
  const m = markets[state.grade];
  homeLayer.clearLayers(); schoolLayer.clearLayers();
  const kmWord = t("wg.tip.km", "km-equivalents"), sesWord = t("wg.tip.ses", "neighbourhood schooling");
  for (let i = 0; i < D.apps.length; i++) {
    const a = D.apps[i], x = D.gain[i];
    const col = state.colour === "gain" ? gainColour(x) : sesColour(D.ses[i], D.sesLo, D.sesHi);
    const r = state.colour === "gain" ? (Math.abs(x) <= EPS ? 2 : 2.2 + 1.6 * clamp(Math.abs(x) / CAP, 0, 1)) : 2.6;
    L.circleMarker([a.lat, a.lon], { radius: r, color: col, weight: 0.6, fillColor: col, fillOpacity: 0.85, bubblingMouseEvents: false })
      .bindTooltip(`${x >= 0 ? "+" : "−"}${nf(Math.abs(x), 2)} ${kmWord}` +
                   (Number.isFinite(D.ses[i]) ? `<br>${sesWord}: ${nf(D.ses[i], 1)} ${t("wg.years", "years")}` : ""), { direction: "top" })
      .addTo(homeLayer);
  }
  for (let j = 0; j < m.J; j++)
    L.circleMarker([m.sLat[j], m.sLon[j]], { radius: 2.6 + Math.sqrt(m.caps[j]) * 0.42, color: "#3a3a3a", weight: 1.1,
                                             fillColor: "#fff", fillOpacity: 0.85, interactive: false }).addTo(schoolLayer);

  $("#maplegend").innerHTML = state.colour === "gain"
    ? `<span><i style="background:${gainColour(-CAP)}"></i>${t("wg.leg.lose", "loses ground")}</span>` +
      `<span><i style="background:${FLAT}"></i>${t("wg.leg.same", "essentially unchanged")}</span>` +
      `<span><i style="background:${gainColour(CAP)}"></i>${t("wg.leg.win", "gains")}</span>` +
      `<span><i style="background:#fff;border:1px solid #3a3a3a"></i>${t("wg.leg.school", "school")}</span>`
    : `<span>${t("wg.leg.ses", "fewer years of schooling")}<span class=ramp style="background:linear-gradient(90deg,${SES_RAMP.join(",")})"></span>${t("wg.leg.ses2", "more")}</span>` +
      `<span><i style="background:#e6e6e6"></i>${t("wg.leg.nod", "no value for this cell")}</span>`;
  $("#mapnote").innerHTML = (state.colour === "gain"
    ? t("wg.map.note", "Each dot is a synthetic family, sized and coloured by what acting on its preferences is worth to it. The colour saturates at {cap} km-equivalents either way.", { cap: nf(CAP, 0) })
    : t("wg.map.note2", "Each dot is a synthetic family, coloured by the mean years of schooling of adults in the census blocks around its home. Families drawn from the same 300 m cell share one value.")) +
    ` <span class=src>${t("src.syn", "synthetic population")}</span>`;
}

// ---------------------------------------------------------------------------- scatter
function drawScatter() {
  const W = 490, H = 320, L0 = 46, R = 12, T = 12, B = 40;
  const xs = D.paired.map(p => p.s), ys = D.paired.map(p => p.g).sort((a, b) => a - b);
  const x0 = Math.min(...xs) - 0.2, x1 = Math.max(...xs) + 0.2;
  const y0 = Math.min(-0.5, quantile(ys, 0.02)), y1 = Math.max(1, quantile(ys, 0.98));
  const X = v => L0 + (v - x0) / (x1 - x0) * (W - L0 - R);
  const Y = v => T + (y1 - v) / (y1 - y0) * (H - T - B);
  const P = PAPER[state.grade];

  let g = "";
  // zero line and axes
  g += `<line x1="${L0}" y1="${Y(0).toFixed(1)}" x2="${W - R}" y2="${Y(0).toFixed(1)}" stroke="#bbb" stroke-width="1" stroke-dasharray="3 3"></line>`;
  g += `<line x1="${L0}" y1="${T}" x2="${L0}" y2="${H - B}" stroke="#ddd" stroke-width="1"></line>`;
  for (let k = 0; k <= 4; k++) {
    const v = y0 + (y1 - y0) * k / 4;
    g += `<text x="${L0 - 6}" y="${(Y(v) + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#888">${nf(v, 1)}</text>`;
  }
  const xt = [Math.ceil(x0), Math.round((x0 + x1) / 2), Math.floor(x1)];
  for (const v of xt) g += `<text x="${X(v).toFixed(1)}" y="${H - B + 15}" text-anchor="middle" font-size="10" fill="#888">${nf(v, 0)}</text>`;
  // the family cloud
  for (const p of D.paired)
    g += `<circle cx="${X(p.s).toFixed(1)}" cy="${Y(clamp(p.g, y0, y1)).toFixed(1)}" r="1.7" fill="${p.g > EPS ? WIN : p.g < -EPS ? LOSE : "#999"}" opacity="0.2"></circle>`;
  // decile means, as a line
  const dec = D.dec.filter(b => b.n > 0);
  g += `<polyline points="${dec.map(b => `${X(b.s).toFixed(1)},${Y(clamp(b.g, y0, y1)).toFixed(1)}`).join(" ")}" fill="none" stroke="#6a6a6a" stroke-width="1.5" opacity="0.9"></polyline>`;
  for (const b of dec) g += `<circle cx="${X(b.s).toFixed(1)}" cy="${Y(clamp(b.g, y0, y1)).toFixed(1)}" r="2.2" fill="#6a6a6a"></circle>`;
  // quartile means: the paper's (solid, real data) and this model's, with two standard errors
  const cuts = [x0, ...Array.from({ length: 3 }, (_, j) => quantile(xs.slice().sort((a, b) => a - b), (j + 1) / 4)), x1];
  D.quart.forEach((b, k) => {
    if (!b.n) return;
    const mid = (X(cuts[k]) + X(cuts[k + 1])) / 2;
    if (Number.isFinite(b.se))
      g += `<line x1="${mid.toFixed(1)}" y1="${Y(clamp(b.g - 2 * b.se, y0, y1)).toFixed(1)}" x2="${mid.toFixed(1)}" y2="${Y(clamp(b.g + 2 * b.se, y0, y1)).toFixed(1)}" stroke="${WIN}" stroke-width="1.4" opacity="0.9"></line>`;
    g += `<line x1="${X(cuts[k]).toFixed(1)}" y1="${Y(clamp(b.g, y0, y1)).toFixed(1)}" x2="${X(cuts[k + 1]).toFixed(1)}" y2="${Y(clamp(b.g, y0, y1)).toFixed(1)}" stroke="${WIN}" stroke-width="2.6"></line>`;
    if (P && P.q) g += `<line x1="${X(cuts[k]).toFixed(1)}" y1="${Y(clamp(P.q[k], y0, y1)).toFixed(1)}" x2="${X(cuts[k + 1]).toFixed(1)}" y2="${Y(clamp(P.q[k], y0, y1)).toFixed(1)}" stroke="#222" stroke-width="2.6" stroke-dasharray="6 3"></line>`;
  });
  g += `<text x="${((L0 + W - R) / 2).toFixed(0)}" y="${H - 6}" text-anchor="middle" font-size="10.5" fill="#666">${t("wg.x", "mean years of schooling in the neighbourhood")}</text>`;
  g += `<text transform="translate(11,${((T + H - B) / 2).toFixed(0)}) rotate(-90)" text-anchor="middle" font-size="10.5" fill="#666">${t("wg.y", "gain, km-equivalents")}</text>`;
  $("#scatter").innerHTML = g;

  const here = D.quart[0].g - D.quart[3].g;
  const seHere = Math.sqrt(D.quart[0].se ** 2 + D.quart[3].se ** 2);
  const flat = Math.abs(here) <= 2 * seHere;
  $("#scatlegend").innerHTML =
    (P && P.q ? `<span><b style="border-top-style:dashed;border-top-color:#222"></b>${t("wg.leg.qp", "the paper, by quartile")}</span>` : "") +
    `<span><b style="border-top-color:${WIN}"></b>${t("wg.leg.q", "this model, by quartile (±2 standard errors)")}</span>` +
    `<span><b style="border-top-color:#6a6a6a"></b>${t("wg.leg.dec", "this model, by decile")}</span>`;
  $("#scatnote").innerHTML = (P && P.q
    ? t("wg.grad.note", "In the paper the gain falls with status: <b>{paper} km</b> from the lowest quartile to the highest (95% interval {lo} to {hi}). In this model the same contrast is <b>{here} km</b>, give or take {se}, so it is <b>flat</b>. That is what a synthetic population can be expected to show — see below.",
        { here: nf(here, 2), se: nf(2 * seHere, 2), paper: nf(P.grad, 3), lo: nf(P.ci[0], 3), hi: nf(P.ci[1], 3) })
    : t("wg.grad.note4", "The paper's gradient for this grade is {paper} km and not distinguishable from zero (95% interval {lo} to {hi}); the aggregate gain here is near zero too, and the paper scopes its distributional reading to the two preschool grades. In this model the contrast is {here} km, give or take {se}.",
        { here: nf(here, 2), se: nf(2 * seHere, 2), paper: nf(P.grad, 3), lo: nf(P.ci[0], 3), hi: nf(P.ci[1], 3) })) +
    ` <span class=src>${t("src.syn", "synthetic population")}</span> <span class=src>${t("src.paper", "paper, real data")}</span>`;
  $("#scatter").setAttribute("aria-label", t("wg.scat.alt",
    "Each family's gain in kilometre-equivalents plotted against the mean years of schooling in its neighbourhood, for {grade}. In this synthetic model the quartile means are {a}, {b}, {c} and {d} kilometres, which is flat; the paper's own quartile means fall with status.",
    { grade: gradeName(state.grade), a: nf(D.quart[0].g, 2), b: nf(D.quart[1].g, 2), c: nf(D.quart[2].g, 2), d: nf(D.quart[3].g, 2) }));
  return flat;
}

// --------------------------------------------------------------------------- incidence
function drawIncidence() {
  const I = D.inc, P = PAPER[state.grade];
  $("#inchead").innerHTML = t("wg.inc.head", "<b>{g}%</b> of families gain, by <b>{k} km</b> each. <b>{s}%</b> are placed the same way under both rules.",
    { g: nf(I.gain, 0), k: nf(I.gainKm, 2), s: nf(I.same, 0) });
  const row = (lab, a, b) => `<tr><td>${lab}</td><td class=big>${a}</td><td>${b}</td></tr>`;
  const pc = v => v === undefined ? "—" : nf(v, 1) + "%";
  const km = v => v === undefined ? "—" : nf(v, 2);
  $("#incrows").innerHTML =
    row(t("wg.r.gain", "Gain (more than 0.01 km)"), nf(I.gain, 1) + "%", pc(P.gain)) +
    row(t("wg.r.same", "Essentially unaffected"), nf(I.same, 1) + "%", pc(P.same)) +
    row(t("wg.r.lose", "Lose ground"), nf(I.lose, 1) + "%", pc(P.lose)) +
    row(t("wg.r.gainkm", "Mean gain among those who gain, km"), km(I.gainKm), km(P.gainKm)) +
    row(t("wg.r.losekm", "Mean loss among those who lose, km"), km(I.loseKm), km(P.loseKm)) +
    row(t("wg.r.mean", "Mean over everyone, km"), km(I.mean), km(({ 2: 0.686, 3: 0.354, 4: 0.012 })[state.grade]));
  $("#incnote").innerHTML = t("wg.inc.note", "A family counts as unaffected when its mean gain across the lottery draws is within 0.01 km of zero, the paper's own threshold. The paper reports the full split for the entry grade and the losing share for the others.") +
    ` <span class=src>${t("src.syn", "synthetic population")}</span> <span class=src>${t("src.paper", "paper, real data")}</span>`;
}

function render() {
  $("#nline").textContent = t("wg.n", "{n} families · {seats} seats · mean of {d} lottery draws",
    { n: nf(D.apps.length), seats: nf(D.seats), d: DRAWS });
  drawMap(); drawScatter(); drawIncidence();
  window.VOC = { gains: true, homes: D.apps.length, schools: markets[state.grade].J };
}

// -------------------------------------------------------------------------------- wire
async function reload() {
  $("#nline").textContent = t("wg.running", "Running the lotteries…");
  await compute();
  render();
  const u = new URL(location.href); u.searchParams.set("grade", state.grade); u.searchParams.set("colour", state.colour);
  history.replaceState(null, "", u);
}

async function main() {
  schoolsJson = await fetch("../data/schools.json").then(r => r.json());
  const q = new URLSearchParams(location.search);
  if ([2, 3, 4].includes(+q.get("grade"))) state.grade = +q.get("grade");
  if (["gain", "ses"].includes(q.get("colour"))) state.colour = q.get("colour");
  for (const [sel, key, val] of [["#grades", "grade", b => +b.dataset.grade], ["#colour", "colour", b => b.dataset.c]])
    [...$(sel).children].forEach(b => { if (!b.dataset) return; const on = val(b) === state[key]; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  await compute();
  initMap();
  render();
  $("#grades").addEventListener("click", async e => { const b = e.target.closest("button"); if (!b) return;
    state.grade = +b.dataset.grade;
    [...$("#grades").children].forEach(x => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
    await reload();
    const m = markets[state.grade], pts = []; for (let j = 0; j < m.J; j++) pts.push([m.sLat[j], m.sLon[j]]);
    map.fitBounds(L.latLngBounds(pts).pad(0.06)); });
  $("#colour").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
    state.colour = b.dataset.c;
    [...$("#colour").children].forEach(x => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
    drawMap();
    const u = new URL(location.href); u.searchParams.set("colour", state.colour); history.replaceState(null, "", u); });
  window.addEventListener("langchange", render);
}

i18nInit(); mountToggle("#langtoggle");
const TITLES = { en: "Who gains? — The Value of Choice", es: "¿Quién gana? — El valor de elegir" };
if (getLang() === "es") document.title = TITLES.es;
window.addEventListener("langchange", e => { document.title = TITLES[e.detail.lang] || TITLES.en; });
main().catch(err => { $("#nline").textContent = t("load.fail", "Could not load data"); console.error(err); });
