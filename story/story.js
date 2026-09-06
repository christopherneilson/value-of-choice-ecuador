// story.js — scrollytelling: a sticky map + readout driven by the engine, steps that scroll past.
import { buildMarket } from "../engine/engine.js";
import { runJobs } from "../shared/simjobs.js";
import { t, nf, init as i18nInit, mountToggle, getLang } from "../shared/i18n.js";

const $ = s => document.querySelector(s);
const C = { dc: "#7b3294", da: "#21918c", sic: "#5ec962", near: "#4a4a4a", away: "#e6791f", grey: "#d9d9d9" };
const BANDS = ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"];
const fmt = (x, d = 0) => nf(x, d);

let map, schoolLayer, homeLayer, lineLayer, activeStep = "hero";
const S = { m: null, res: null, sweep: null, alike: null, diverse: null, congested: null, ready: false };

async function load() {
  const [schools, a2] = await Promise.all(["schools.json", "applicants_g2.json"].map(f => fetch(`../data/${f}`).then(r => r.json())));
  S.schools = schools;
  S.m = buildMarket(schools, a2);
  // All the scenes' lotteries run in the simulator's worker (main thread if it cannot start): the base
  // scene, the congestion sweep (only where every family is seated), the x0.6 scene, and the sigma_eps cases.
  const KS = [1.6, 1.4, 1.2, 1.0, 0.9, 0.8, 0.7, 0.6];
  const jobs = { base: { draws: 10 }, congested: { seats: 0.6, draws: 10 }, alike: { seps: 0.2, draws: 10 }, diverse: { seps: 3, draws: 10 } };
  for (const k of KS) jobs["sweep" + k] = { seats: k, draws: 6 };
  const out = await runJobs(schools, a2, S.m, jobs);
  S.res = out.base; S.congested = out.congested; S.alike = out.alike; S.diverse = out.diverse;
  S.sweep = KS.map(k => ({ k, r: out["sweep" + k] }));
  S.ready = true;
  window.VOC = { story: true };
}

function initMap() {
  map = L.map("map", { preferCanvas: true, zoomControl: false, scrollWheelZoom: false, dragging: false, doubleClickZoom: false, touchZoom: false, attributionControl: true });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
  lineLayer = L.layerGroup().addTo(map); homeLayer = L.layerGroup().addTo(map); schoolLayer = L.layerGroup().addTo(map);
  const m = S.m, pts = [];
  for (let j = 0; j < m.J; j++) pts.push([m.sLat[j], m.sLon[j]]);
  map.fitBounds(L.latLngBounds(pts).pad(0.06));
  drawSchools(m.caps);
}

function drawSchools(caps) {
  schoolLayer.clearLayers();
  const m = S.m, byId = new Map(S.schools.schools.map(s => [s.id, s]));
  for (let j = 0; j < m.J; j++) {
    const band = byId.get(m.ids[j]).grades["2"].xi_band;
    L.circleMarker([m.sLat[j], m.sLon[j]], { radius: 3.5 + Math.sqrt(caps[j]) * 0.9, color: "#222", weight: 1.2, fillColor: BANDS[band - 1], fillOpacity: 0.85, interactive: false }).addTo(schoolLayer);
  }
}

function drawHomes(colorOf, assign) {
  homeLayer.clearLayers(); lineLayer.clearLayers();
  const m = S.m;
  for (let i = 0; i < m.n; i++) {
    const c = colorOf(i);
    if (!c) continue;
    L.circleMarker([m.aLat[i], m.aLon[i]], { radius: c.r ?? 2.6, color: c.fill, weight: 1, fillColor: c.fill, fillOpacity: c.op ?? 0.85, opacity: c.op ?? 0.85, interactive: false }).addTo(homeLayer);
  }
  if (assign) {
    const step = Math.max(1, Math.floor(m.n / 140));
    for (let i = 0; i < m.n; i += step) {
      const p = assign[i]; if (p < 0) continue;
      const c = colorOf(i);
      L.polyline([[m.aLat[i], m.aLon[i]], [m.sLat[p], m.sLon[p]]], { color: c ? c.fill : "#999", weight: 1, opacity: 0.3, interactive: false }).addTo(lineLayer);
    }
  }
}

function outcomeColor(rule, res) {
  const m = S.m, a = res.last[rule], col = C[rule];
  return i => {
    const p = a[i];
    if (p < 0) return { fill: "#e41a1c" };
    if (m.rol[i][0] === p) return { fill: col, r: 3 };
    if (m.rol[i].includes(p)) return { fill: col, op: 0.4 };
    return { fill: C.grey, op: 0.9 };
  };
}

function nearestFirstColor() {
  const m = S.m, J = m.J;
  return i => {
    let jn = 0; for (let j = 1; j < J; j++) if (m.d[i * J + j] < m.d[i * J + jn]) jn = j;
    return m.rol[i][0] === jn ? { fill: C.near, op: 0.55, r: 2.4 } : { fill: C.away, r: 3.2 };
  };
}

function readout(html) { $("#readout").innerHTML = html; }
const src1 = () => `<span class=src>${t("src.engine", "engine, synthetic")}</span>`;
const src2 = (all) => `<span class=src>${all ? t("src.paper.all", "paper, real data, all grades") : t("src.paper", "paper, real data")}</span>`;
const big = (txt, col) => `<div class=big${col ? ` style="color:${col}"` : ""}>${txt}</div>`;
const sub = (txt) => `<div class=sub>${txt}</div>`;

function chartSweep() {
  const W = 340, H = 150, L0 = 36, R0 = 10, T0 = 12, B0 = 26;
  const xs = S.sweep.map(s => s.k), x = k => L0 + (W - L0 - R0) * (1.6 - k) / (1.6 - 0.6);
  const y = v => T0 + (H - T0 - B0) * (1 - Math.max(0, Math.min(100, v)) / 100);
  // NB: inside innerHTML, unquoted SVG attribute values swallow a trailing "/" (stroke=#eee/> parses
  // as stroke="#eee/" with no self-close), so every attribute is quoted and every tag closed explicitly.
  const line = (vals, col) => `<polyline fill="none" stroke="${col}" stroke-width="2.2" points="${vals.map((v, i) => `${x(xs[i])},${y(v)}`).join(" ")}"></polyline>`;
  const first = S.sweep.map(s => s.r.rules.da.first), rec = S.sweep.map(s => Math.max(0, s.r.recoveredShare));
  const ticks = [1.5, 1.0, 0.75, 0.6].map(k => `<text x="${x(k)}" y="${H - 8}" font-size="10" text-anchor="middle" fill="#666">×${nf(k, k === 1 ? 0 : k === 0.75 ? 2 : 1)}</text>`).join("");
  const grid = [0, 50, 100].map(v => `<line x1="${L0}" x2="${W - R0}" y1="${y(v)}" y2="${y(v)}" stroke="#eee"></line><text x="${L0 - 4}" y="${y(v) + 3}" font-size="10" text-anchor="end" fill="#666">${v}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${t("story.chart.aria", "First-choice share and share of the gap closed as seats shrink")}">${grid}${line(first, C.da)}${line(rec, "#333")}${ticks}
  <text x="${L0}" y="10" font-size="10" fill="${C.da}">${t("story.chart.first", "DA: % in first choice")}</text><text x="${L0 + 140}" y="10" font-size="10" fill="#333">${t("story.chart.rec", "% of the gap DA closes")}</text></svg>`;
}

const STEPS = {
  hero() {
    drawHomes(() => null);
    readout(big(t("story.r.hero.h", "55 schools · 1,098 families")) + sub(t("story.r.hero.s", "Preschool 1, the entry grade. Schools sized by seats and coloured by desirability band; the families are synthetic, drawn from the paper's estimated model.")));
  },
  nearest() {
    drawHomes(nearestFirstColor());
    const r = S.res;
    readout(big(t("story.r.nearest.h", "{p}% want a school that is not their nearest", { p: fmt(100 * (1 - r.nearestFirst)) }), C.away) +
      sub(t("story.r.nearest.s", "{near}% rank their nearest school first; the rest accept a median {extra} km more travel for their first choice {src1}<br>Paper: across grades more than a quarter of families choose a school other than their nearest and pay a median 0.6 km for it {src2}. The 65% nearest-first figure for this grade is the authors' calculation from the application data, not a number the paper reports.",
        { near: fmt(100 * r.nearestFirst), extra: fmt(r.medianExtraKm, 2), src1: src1(), src2: src2() })));
  },
  distance() {
    drawHomes(outcomeColor("dc", S.res), S.res.last.dc);
    const d = S.res.rules.dc;
    readout(big(t("story.r.distance.h", "{p}% get their first choice", { p: fmt(d.first) }), C.dc) +
      sub(t("story.r.distance.s", "{listed}% land in a school they listed at all; mean {km} km to school {src1}<br>Paper: under the distance rule 42% of applicants got their first choice and 50% any listed school {src2}",
        { listed: fmt(d.listed), km: fmt(d.km, 2), src1: src1(), src2: src2(true) })));
  },
  da() {
    drawHomes(outcomeColor("da", S.res), S.res.last.da);
    const d = S.res.rules.da, c = S.res.rules.dc;
    readout(big(t("story.r.da.h", "{p}% get their first choice", { p: fmt(d.first) }), C.da) +
      sub(t("story.r.da.s", "up from {p0}% — same families, same schools, same seats; only the objective changed. {listed}% in a listed school; travel rises from {km0} to {km} km {src1}<br>Paper: 42% → 70% first choice, 50% → 78% listed, +0.32 km {src2}",
        { p0: fmt(c.first), listed: fmt(d.listed), km0: fmt(c.km, 2), km: fmt(d.km, 2), src1: src1(), src2: src2() })));
  },
  benchmark() {
    drawHomes(outcomeColor("sic", S.res), S.res.last.sic);
    const d = S.res.rules.da, s = S.res.rules.sic;
    readout(big(t("story.r.benchmark.h", "{p}% — versus {p0}% under DA", { p: fmt(s.first), p0: fmt(d.first) }), C.sic) +
      sub(t("story.r.benchmark.s", "The benchmark is the most any priority-respecting mechanism can do. DA already closes {rec}% of the gap between the distance rule and it {src1}<br>Paper: 99.6% in Preschool 1; algorithm refinements are worth 0.3% of the range, acting on preferences 87.6% {src2}",
        { rec: fmt(S.res.recoveredShare, 1), src1: src1(), src2: src2() })));
  },
  congestion() {
    drawHomes(outcomeColor("da", S.congested), S.congested.last.da);
    drawSchools(Int32Array.from(S.m.caps, c => Math.round(c * 0.6)));
    const d = S.congested.rules.da;
    readout(big(t("story.r.congestion.h", "seats ×0.6: {p}% first choice, {rec}% of the gap closed", { p: fmt(d.first), rec: fmt(S.congested.recoveredShare) }), C.da) + chartSweep() +
      sub(t("story.r.congestion.s", "As seats shrink, deferred acceptance places fewer families in their first choice and the value it adds over the distance rule collapses {src1}<br>Paper: DA first-choice share 93% in Preschool 1, 58% in Preschool 2, 33% in Primary 1 — the congested grade gains least {src2}",
        { src1: src1(), src2: src2() })));
  },
  whogains() {
    drawSchools(S.m.caps);
    drawHomes(outcomeColor("da", S.res), null);
    readout(big(t("story.r.whogains.h", "The gains are progressive"), C.da) +
      sub(t("story.r.whogains.s", "Mean gain by neighbourhood-schooling quartile, lowest to highest — Preschool 1: <b>+0.79, +0.68, +0.68, +0.59</b> km; Preschool 2: <b>+0.49, +0.38, +0.34, +0.15</b> km. Lowest-minus-highest: +0.20 km in Preschool 1 (95% interval +0.01 to +0.39). In Preschool 1, 51.8% of families gain, by about 1.4 km each {src2}<br>The <a href='../gains/'>who-gains page</a> maps this family by family and puts the paper’s gradient beside what this model can reproduce.",
        { src2: src2() })));
  },
  planner() {
    drawHomes(outcomeColor("da", S.alike), S.alike.last.da);
    const a = S.alike, dv = S.diverse, r = S.res;
    readout(big(t("story.r.planner.h", "What choice is worth depends on how much families differ")) +
      sub(t("story.r.planner.s", "Gain from acting on preferences, km-equivalent per family — families alike (σ<sub>ε</sub>×0.2): <b>{a}</b> · as estimated: <b>{b}</b> · very diverse (×3): <b>{c}</b>. Making every <em>school</em> identical instead changes almost nothing {src1}<br>Paper: even with ten imagery-derived attributes and learned image features, most of what makes a school desirable to a given family stays unexplained {src2}",
        { a: fmt(a.gainKmDaOverDc, 2), b: fmt(r.gainKmDaOverDc, 2), c: fmt(dv.gainKmDaOverDc, 2), src1: src1(), src2: src2() })));
  },
  end() {
    drawSchools(S.m.caps); drawHomes(outcomeColor("da", S.res), S.res.last.da);
    readout(big(t("story.r.end.h", "Try it yourself"), C.da) + sub(t("story.r.end.s", "The simulator lets you switch rules, tighten seats and change tastes on the same families.")));
  },
};

function wireScroll() {
  const steps = [...document.querySelectorAll(".step")];
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) {
      steps.forEach(s => s.classList.toggle("active", s === e.target));
      activeStep = e.target.dataset.step;
      const fn = STEPS[activeStep]; if (fn && S.ready) fn();
    }
  }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
  steps.forEach(s => io.observe(s));
}

i18nInit(); mountToggle("#langtoggle");
if (getLang() === "es") document.title = "Por qué importa elegir — El valor de elegir";
window.addEventListener("langchange", e => { document.title = e.detail.lang === "es" ? "Por qué importa elegir — El valor de elegir" : "Why choice matters — The Value of Choice"; if (S.ready) STEPS[activeStep](); });
$("#readout").innerHTML = `<div class=sub>${t("story.loading", "Computing the scenarios…")}</div>`;
load().then(() => { initMap(); wireScroll(); STEPS.hero(); $("#loading").hidden = true; }).catch(err => { $("#readout").textContent = t("load.fail", "Could not load data") + ": " + err; console.error(err); });
