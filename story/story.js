// story.js — scrollytelling: a sticky map + readout driven by the engine, steps that scroll past.
import { buildMarket, rescale, simulate } from "../engine/engine.js";

const $ = s => document.querySelector(s);
const C = { dc: "#7b3294", da: "#21918c", sic: "#5ec962", near: "#4a4a4a", away: "#e6791f", grey: "#d9d9d9" };
const BANDS = ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"];
const fmt = (x, d = 0) => Number.isFinite(x) ? x.toFixed(d) : "—";

let map, schoolLayer, homeLayer, lineLayer;
const S = { m: null, res: null, sweep: null, alike: null, diverse: null, congested: null, ready: false };

async function load() {
  const [schools, a2] = await Promise.all(["schools.json", "applicants_g2.json"].map(f => fetch(`../data/${f}`).then(r => r.json())));
  S.schools = schools;
  S.m = buildMarket(schools, a2);
  S.res = simulate(S.m, { draws: 10, seed: 7 });
  // congestion sweep (light draws), sigma_eps cases, and the x0.6 scene for the map
  const scale = k => ({ ...S.m, caps: Int32Array.from(S.m.caps, c => Math.max(0, Math.round(c * k))) });
  S.sweep = [1.6, 1.4, 1.2, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5].map(k => ({ k, r: simulate(scale(k), { draws: 3, seed: 7 }) }));
  S.congested = simulate(scale(0.6), { draws: 10, seed: 7 });
  const b = S.m.base;
  S.alike = simulate(rescale(S.m, { sxi: b.sxi, seps: b.seps * 0.2, sgam: b.sgam, lam: b.lam }), { draws: 10, seed: 7 });
  S.diverse = simulate(rescale(S.m, { sxi: b.sxi, seps: b.seps * 3, sgam: b.sgam, lam: b.lam }), { draws: 10, seed: 7 });
  S.ready = true;
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

// colour families by a function i -> {fill, op, r}; optional links for a sample
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
const src = (s) => `<span class=src>${s}</span>`;

function chartSweep() {
  // small inline SVG: DA first-choice share and share of gap closed vs seats factor
  const W = 340, H = 150, L0 = 36, R0 = 10, T0 = 12, B0 = 26;
  const xs = S.sweep.map(s => s.k), x = k => L0 + (W - L0 - R0) * (1.6 - k) / (1.6 - 0.5);
  const y = v => T0 + (H - T0 - B0) * (1 - Math.max(0, Math.min(100, v)) / 100);
  // NB: inside innerHTML, unquoted SVG attribute values swallow a trailing "/" (stroke=#eee/> parses
  // as stroke="#eee/" with no self-close), so every attribute is quoted and every tag closed explicitly.
  const line = (vals, col) => `<polyline fill="none" stroke="${col}" stroke-width="2.2" points="${vals.map((v, i) => `${x(xs[i])},${y(v)}`).join(" ")}"></polyline>`;
  const first = S.sweep.map(s => s.r.rules.da.first), rec = S.sweep.map(s => Math.max(0, s.r.recoveredShare));
  const ticks = [1.5, 1.0, 0.75, 0.5].map(k => `<text x="${x(k)}" y="${H - 8}" font-size="10" text-anchor="middle" fill="#666">×${k}</text>`).join("");
  const grid = [0, 50, 100].map(v => `<line x1="${L0}" x2="${W - R0}" y1="${y(v)}" y2="${y(v)}" stroke="#eee"></line><text x="${L0 - 4}" y="${y(v) + 3}" font-size="10" text-anchor="end" fill="#666">${v}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="First-choice share and share of the gap closed as seats shrink">${grid}${line(first, C.da)}${line(rec, "#333")}${ticks}
  <text x="${L0}" y="10" font-size="10" fill="${C.da}">DA: % in first choice</text><text x="${L0 + 140}" y="10" font-size="10" fill="#333">% of the gap DA closes</text></svg>`;
}

const STEPS = {
  hero() { drawHomes(() => null); readout(`<div class=big>55 schools · 1,098 families</div><div class=sub>Preschool 1, the entry grade. Schools sized by seats and coloured by desirability band; the families are synthetic, drawn from the paper's estimated model.</div>`); },
  nearest() {
    drawHomes(nearestFirstColor());
    const r = S.res;
    readout(`<div class=big style="color:${C.away}">${fmt(100 * (1 - r.nearestFirst))}% want a school that is not their nearest</div>
      <div class=sub>${fmt(100 * r.nearestFirst)}% rank their nearest school first; the rest accept a median ${fmt(r.medianExtraKm, 2)} km more travel for their first choice ${src("engine, synthetic")}<br>Paper: 65% nearest-first in this grade; across grades more than a quarter choose elsewhere and pay a median 0.6 km for it ${src("paper, real data")}</div>`);
  },
  distance() {
    drawHomes(outcomeColor("dc", S.res), S.res.last.dc);
    const d = S.res.rules.dc;
    readout(`<div class=big style="color:${C.dc}">${fmt(d.first)}% get their first choice</div><div class=sub>${fmt(d.listed)}% land in a school they listed at all; mean ${fmt(d.km, 2)} km to school ${src("engine, synthetic")}<br>Paper: under the distance rule 42% of applicants got their first choice and 50% any listed school ${src("paper, real data, all grades")}</div>`);
  },
  da() {
    drawHomes(outcomeColor("da", S.res), S.res.last.da);
    const d = S.res.rules.da, c = S.res.rules.dc;
    readout(`<div class=big style="color:${C.da}">${fmt(d.first)}% get their first choice</div><div class=sub>up from ${fmt(c.first)}% — same families, same schools, same seats; only the objective changed. ${fmt(d.listed)}% in a listed school; travel rises from ${fmt(c.km, 2)} to ${fmt(d.km, 2)} km ${src("engine, synthetic")}<br>Paper: 42% → 70% first choice, 50% → 78% listed, +0.32 km ${src("paper, real data")}</div>`);
  },
  benchmark() {
    drawHomes(outcomeColor("sic", S.res), S.res.last.sic);
    const d = S.res.rules.da, s = S.res.rules.sic;
    readout(`<div class=big style="color:${C.sic}">${fmt(s.first)}% — versus ${fmt(d.first)}% under DA</div><div class=sub>The benchmark is the most any priority-respecting mechanism can do. DA already closes ${fmt(S.res.recoveredShare, 1)}% of the gap between the distance rule and it ${src("engine, synthetic")}<br>Paper: 99.6% in Preschool 1; algorithm refinements are worth 0.3% of the range, acting on preferences 87.6% ${src("paper, real data")}</div>`);
  },
  congestion() {
    drawHomes(outcomeColor("da", S.congested), S.congested.last.da);
    drawSchools(Int32Array.from(S.m.caps, c => Math.round(c * 0.6)));
    const d = S.congested.rules.da;
    readout(`<div class=big style="color:${C.da}">seats ×0.6: ${fmt(d.first)}% first choice, ${fmt(S.congested.recoveredShare)}% of the gap closed</div>${chartSweep()}<div class=sub>As seats shrink, deferred acceptance places fewer families in their first choice and the value it adds over the distance rule collapses ${src("engine, synthetic")}<br>Paper: DA first-choice share 93% in Preschool 1, 58% in Preschool 2, 33% in Primary 1 — the congested grade gains least ${src("paper, real data")}</div>`);
  },
  whogains() {
    drawSchools(S.m.caps);
    drawHomes(outcomeColor("da", S.res), null);
    readout(`<div class=big style="color:${C.da}">The gains are progressive</div><div class=sub>Mean gain by neighbourhood-schooling quartile, lowest to highest — Preschool 1: <b>+0.79, +0.68, +0.68, +0.59</b> km; Preschool 2: <b>+0.49, +0.38, +0.34, +0.15</b> km. Lowest-minus-highest: +0.20 km in Preschool 1 (95% interval +0.01 to +0.39). In Preschool 1, 51.8% of families gain, by about 1.4 km each ${src("paper, real data")}<br>The synthetic population has no socioeconomic layer yet, so the map keeps the deferred-acceptance colouring.</div>`);
  },
  planner() {
    drawHomes(outcomeColor("da", S.alike), S.alike.last.da);
    const a = S.alike, dv = S.diverse, r = S.res;
    readout(`<div class=big>What choice is worth depends on how much families differ</div><div class=sub>Gain from acting on preferences, km-equivalent per family — families alike (σ<sub>ε</sub>×0.2): <b>${fmt(a.gainKmDaOverDc, 2)}</b> · as estimated: <b>${fmt(r.gainKmDaOverDc, 2)}</b> · very diverse (×3): <b>${fmt(dv.gainKmDaOverDc, 2)}</b>. Making every <em>school</em> identical instead changes almost nothing ${src("engine, synthetic")}<br>Paper: even with ten imagery-derived attributes and learned image features, most of what makes a school desirable to a given family stays unexplained ${src("paper, real data")}</div>`);
  },
  end() { drawSchools(S.m.caps); drawHomes(outcomeColor("da", S.res), S.res.last.da); readout(`<div class=big style="color:${C.da}">Try it yourself</div><div class=sub>The simulator lets you switch rules, tighten seats and change tastes on the same families.</div>`); },
};

function wireScroll() {
  const steps = [...document.querySelectorAll(".step")];
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) {
      steps.forEach(s => s.classList.toggle("active", s === e.target));
      const fn = STEPS[e.target.dataset.step]; if (fn && S.ready) fn();
    }
  }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
  steps.forEach(s => io.observe(s));
}

$("#readout").innerHTML = `<div class=sub>Computing the scenarios…</div>`;
load().then(() => { initMap(); wireScroll(); STEPS.hero(); $("#loading").hidden = true; }).catch(err => { $("#readout").textContent = "Could not load data: " + err; console.error(err); });
