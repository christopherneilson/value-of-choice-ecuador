// app.js — "Choose the rule": map + rule toggle + metrics + sliders, on top of ../engine/engine.js
import { buildMarket, rescale, simulate } from "../engine/engine.js";

const GRADE_NAME = { 2: "Preschool 1", 3: "Preschool 2", 4: "Primary 1" };
// the paper's real-data numbers by grade, for context (assignment shares from the grade tables)
const PAPER = {
  2: { dc_listed: 64.7, da_listed: 96.1, da_first: 93.2, rec: "99.6%", near: 65 },
  3: { dc_listed: 43.2, da_listed: 70.4, da_first: 58.2, rec: "82.3%", near: 63 },
  4: { dc_listed: 26.1, da_listed: 46.4, da_first: 32.6, rec: "near zero (sensitive to conventions)", near: 54 },
};
const RULE = {
  dc: { name: "Distance rule", color: "#7b3294", info: "The status quo: each family is offered its nearest school with a seat; ties by one lottery per family. Families' stated preferences play no role." },
  da: { name: "Deferred acceptance", color: "#21918c", info: "The deployed rule: families' reported lists, with the remaining schools appended in distance order; priorities sibling > reported > appended, one lottery per family–school pair." },
  sic: { name: "Benchmark", color: "#5ec962", info: "Constrained-efficient benchmark: stable improvement cycles applied to the deferred-acceptance outcome — the most a priority-respecting mechanism can add." },
};
const BAND_COLORS = ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"];
const $ = s => document.querySelector(s);

const state = { grade: 2, rule: "da", draws: 10, seed: 7, seats: 1, sxi: 1, seps: 1, sgam: 1, lines: true };
const markets = {}, schoolsJson = { ref: null };
let map, schoolLayer, homeLayer, lineLayer, lastRes = null, busy = false, pending = false;

async function loadData() {
  const [schools, a2, a3, a4] = await Promise.all(
    ["schools.json", "applicants_g2.json", "applicants_g3.json", "applicants_g4.json"].map(f => fetch(`../data/${f}`).then(r => r.json())));
  schoolsJson.ref = schools;
  markets[2] = buildMarket(schools, a2); markets[3] = buildMarket(schools, a3); markets[4] = buildMarket(schools, a4);
}

function currentMarket() {
  let m = markets[state.grade];
  const b = m.base;
  if (state.sxi !== 1 || state.seps !== 1 || state.sgam !== 1)
    m = rescale(m, { sxi: b.sxi * state.sxi, seps: b.seps * state.seps, sgam: b.sgam * state.sgam, lam: b.lam });
  if (state.seats !== 1) m = { ...m, caps: Int32Array.from(m.caps, c => Math.max(0, Math.round(c * state.seats))) };
  return m;
}

function fmt(x, d = 1) { return Number.isFinite(x) ? x.toFixed(d) : "—"; }

function renderMetrics(m, res) {
  const r = res.rules, cur = state.rule;
  const rows = [
    ["Placed in a listed school, %", r.dc.listed, r.da.listed, r.sic.listed, 1],
    ["Placed in first choice, %", r.dc.first, r.da.first, r.sic.first, 1],
    ["Mean distance to school, km", r.dc.km, r.da.km, r.sic.km, 2],
    ["Mean welfare, km-equivalent", r.dc.utility, r.da.utility, r.sic.utility, 2],
  ];
  $("#metrics").innerHTML = rows.map(([lab, a, b, c, d]) =>
    `<tr><td>${lab}</td><td class="${cur === "dc" ? "cur" : ""}">${fmt(a, d)}</td><td class="${cur === "da" ? "cur" : ""}">${fmt(b, d)}</td><td class="${cur === "sic" ? "cur" : ""}">${fmt(c, d)}</td></tr>`).join("");
  const R = r[cur];
  $("#headline").textContent = `${fmt(R.first, 0)}% in their first choice`;
  $("#headline").style.color = RULE[cur].color;
  $("#headsub").textContent = `${fmt(R.listed, 0)}% in a school they listed · mean ${fmt(R.km, 2)} km to school · ${m.n.toLocaleString()} families, ${Array.from(m.caps).reduce((s, c) => s + c, 0).toLocaleString()} seats · mean of ${res.draws} lottery draws`;
  const seatsTot = Array.from(m.caps).reduce((s, c) => s + c, 0);
  $("#recovered").innerHTML = `Deferred acceptance closes <b>${fmt(res.recoveredShare, 1)}%</b> of the welfare gap between the distance rule and the benchmark (gain ${fmt(res.gainKmDaOverDc, 2)} km-equivalent per family). ` +
    `${fmt(100 * res.nearestFirst, 0)}% of families rank their nearest school first; those who don't accept a median ${fmt(res.medianExtraKm, 2)} km more travel.`;
  const P = PAPER[state.grade];
  $("#paper").innerHTML = `<b>Paper, real data (${GRADE_NAME[state.grade]}):</b> distance rule ${P.dc_listed}% listed · DA ${P.da_listed}% listed, ${P.da_first}% first choice · DA closes ${P.rec} of the range · ${P.near}% rank nearest first.`;
  $("#gradeinfo").textContent = `${m.n.toLocaleString()} families · ${m.J} schools · ${seatsTot.toLocaleString()} seats (${(seatsTot / m.n).toFixed(2)} per family)`;
  $("#ruleinfo").textContent = RULE[cur].info;
}

function renderMap(m, res) {
  const assign = res.last[state.rule];
  homeLayer.clearLayers(); lineLayer.clearLayers();
  const col = RULE[state.rule].color;
  const n = m.n, J = m.J;
  for (let i = 0; i < n; i++) {
    const p = assign[i];
    let fill = "#e0e0e0", stroke = "#bbb", r = 2.4, op = 0.85;
    if (p >= 0) {
      if (m.rol[i][0] === p) { fill = col; stroke = col; r = 3; }
      else if (m.rol[i].includes(p)) { fill = col; stroke = col; op = 0.4; r = 2.6; }
    } else { fill = "#e41a1c"; stroke = "#e41a1c"; }
    L.circleMarker([m.aLat[i], m.aLon[i]], { radius: r, color: stroke, weight: 1, fillColor: fill, fillOpacity: op, opacity: op, interactive: false }).addTo(homeLayer);
  }
  if (state.lines) {
    const step = Math.max(1, Math.floor(n / 160));
    for (let i = 0; i < n; i += step) {
      const p = assign[i]; if (p < 0) continue;
      L.polyline([[m.aLat[i], m.aLon[i]], [m.sLat[p], m.sLon[p]]], { color: col, weight: 1, opacity: 0.35, interactive: false }).addTo(lineLayer);
    }
  }
  // schools: size by seats under the current dial, colour by desirability band
  schoolLayer.clearLayers();
  const g = String(state.grade);
  const byId = new Map(schoolsJson.ref.schools.map(s => [s.id, s]));
  for (let j = 0; j < J; j++) {
    const s = byId.get(m.ids[j]); const band = s.grades[g].xi_band;
    const seats = m.caps[j];
    const filled = assign.reduce((c, p) => c + (p === j ? 1 : 0), 0);
    L.circleMarker([m.sLat[j], m.sLon[j]], { radius: 4 + Math.sqrt(seats) * 1.1, color: "#222", weight: 1.5, fillColor: BAND_COLORS[band - 1], fillOpacity: 0.85 })
      .bindTooltip(`<b>${s.id}</b> · ${s.canton}<br>${seats} seats, ${filled} placed<br>desirability band ${band}/5`, { direction: "top" })
      .addTo(schoolLayer);
  }
}

function run(draws) {
  if (busy) { pending = true; return; }
  busy = true;
  setTimeout(() => {
    try {
      const m = currentMarket();
      lastRes = simulate(m, { draws: draws ?? state.draws, seed: state.seed });
      renderMetrics(m, lastRes); renderMap(m, lastRes);
    } finally {
      busy = false;
      if (pending) { pending = false; run(); }
    }
  }, 0);
}

function initMap() {
  map = L.map("map", { preferCanvas: true, zoomControl: true });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
  lineLayer = L.layerGroup().addTo(map); homeLayer = L.layerGroup().addTo(map); schoolLayer = L.layerGroup().addTo(map);
  const m = markets[2];
  const pts = []; for (let j = 0; j < m.J; j++) pts.push([m.sLat[j], m.sLon[j]]);
  map.fitBounds(L.latLngBounds(pts).pad(0.08));
}

function wire() {
  $("#grades").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
    state.grade = +b.dataset.grade; [...$("#grades").children].forEach(x => x.classList.toggle("on", x === b)); run(); });
  $("#rules").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
    state.rule = b.dataset.rule; [...$("#rules").children].forEach(x => x.classList.toggle("on", x === b));
    if (lastRes) { const m = currentMarket(); renderMetrics(m, lastRes); renderMap(m, lastRes); } });
  const show = () => {
    $("#seats_o").textContent = `×${state.seats.toFixed(2)}`;
    $("#sxi_o").textContent = `×${state.sxi.toFixed(2)} = ${(markets[state.grade].base.sxi * state.sxi).toFixed(2)} km`;
    $("#seps_o").textContent = `×${state.seps.toFixed(2)} = ${(markets[state.grade].base.seps * state.seps).toFixed(2)} km`;
    $("#sgam_o").textContent = `×${state.sgam.toFixed(2)} = ${(markets[state.grade].base.sgam * state.sgam).toFixed(2)}`;
  };
  for (const k of ["seats", "sxi", "seps", "sgam"]) {
    const el = $("#" + k);
    el.addEventListener("input", () => { state[k] = +el.value; show(); run(4); });
    el.addEventListener("change", () => { state[k] = +el.value; show(); run(); });
  }
  $("#lines").addEventListener("change", e => { state.lines = e.target.checked; if (lastRes) renderMap(currentMarket(), lastRes); });
  $("#reset").addEventListener("click", () => { for (const k of ["seats", "sxi", "seps", "sgam"]) { state[k] = 1; $("#" + k).value = 1; } show(); run(); });
  $("#grades").addEventListener("click", show);
  show();
}

loadData().then(() => { initMap(); wire(); run(); }).catch(err => {
  $("#headline").textContent = "Could not load data"; $("#headsub").textContent = String(err); console.error(err);
});
