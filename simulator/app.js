// app.js — "Choose the rule": map + rule toggle + metrics + sliders + one-family panel, on ../engine/engine.js
import { buildMarket, rescale, simulate, withAwareness, familyCard } from "../engine/engine.js";

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
const AWARE_ALL = 9;   // slider position meaning "every school"
const $ = s => document.querySelector(s);

const state = { grade: 2, rule: "da", draws: 10, seed: 7, seats: 1, sxi: 1, seps: 1, sgam: 1, aware: 1.5, lines: true, family: null };
const markets = {}, schoolsJson = { ref: null };
let map, schoolLayer, homeLayer, lineLayer, familyLayer, lastRes = null, lastMarket = null, busy = false, pending = false;

async function loadData() {
  const [schools, a2, a3, a4] = await Promise.all(
    ["schools.json", "applicants_g2.json", "applicants_g3.json", "applicants_g4.json"].map(f => fetch(`../data/${f}`).then(r => r.json())));
  schoolsJson.ref = schools;
  markets[2] = buildMarket(schools, a2); markets[3] = buildMarket(schools, a3); markets[4] = buildMarket(schools, a4);
}

function awareValue() { return state.aware >= AWARE_ALL ? null : state.aware; }

function currentMarket() {
  let m = markets[state.grade];
  const b = m.base;
  const awareChanged = awareValue() !== m.baseAware;
  if (awareChanged) m = withAwareness(m, awareValue());
  if (awareChanged || state.sxi !== 1 || state.seps !== 1 || state.sgam !== 1)
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
  const seatsTot = Array.from(m.caps).reduce((s, c) => s + c, 0);
  $("#headline").textContent = `${fmt(R.first, 0)}% in their first choice`;
  $("#headline").style.color = RULE[cur].color;
  $("#headsub").textContent = `${fmt(R.listed, 0)}% in a school they listed · mean ${fmt(R.km, 2)} km to school · ${m.n.toLocaleString()} families, ${seatsTot.toLocaleString()} seats · mean of ${res.draws} lottery draws`;
  let meanM = 0; for (let i = 0; i < m.n; i++) meanM += m.M[i]; meanM /= m.n;
  $("#recovered").innerHTML = `Deferred acceptance closes <b>${fmt(res.recoveredShare, 1)}%</b> of the welfare gap between the distance rule and the benchmark (gain ${fmt(res.gainKmDaOverDc, 2)} km-equivalent per family). ` +
    `${fmt(100 * res.nearestFirst, 0)}% of families rank their nearest school first; those who don't accept a median ${fmt(res.medianExtraKm, 2)} km more travel. Families consider ${fmt(meanM, 1)} schools on average.`;
  const P = PAPER[state.grade];
  $("#paper").innerHTML = `<b>Paper, real data (${GRADE_NAME[state.grade]}):</b> distance rule ${P.dc_listed}% listed · DA ${P.da_listed}% listed, ${P.da_first}% first choice · DA closes ${P.rec} of the range · ${P.near}% rank nearest first.`;
  $("#gradeinfo").textContent = `${m.n.toLocaleString()} families · ${m.J} schools · ${seatsTot.toLocaleString()} seats (${(seatsTot / m.n).toFixed(2)} per family)`;
  $("#ruleinfo").textContent = RULE[cur].info;
}

function homeStyle(m, assign, i) {
  const p = assign[i], col = RULE[state.rule].color;
  if (p < 0) return { fill: "#e41a1c", stroke: "#e41a1c", r: 2.6, op: 0.9 };
  if (m.rol[i][0] === p) return { fill: col, stroke: col, r: 3, op: 0.85 };
  if (m.rol[i].includes(p)) return { fill: col, stroke: col, r: 2.6, op: 0.4 };
  return { fill: "#e0e0e0", stroke: "#bbb", r: 2.4, op: 0.85 };
}

function renderMap(m, res) {
  const assign = res.last[state.rule];
  homeLayer.clearLayers(); lineLayer.clearLayers();
  const col = RULE[state.rule].color;
  const n = m.n, J = m.J;
  for (let i = 0; i < n; i++) {
    const s = homeStyle(m, assign, i);
    L.circleMarker([m.aLat[i], m.aLon[i]], { radius: s.r, color: s.stroke, weight: 1, fillColor: s.fill, fillOpacity: s.op, opacity: s.op, bubblingMouseEvents: false })
      .on("click", () => selectFamily(i)).addTo(homeLayer);
  }
  if (state.lines) {
    const step = Math.max(1, Math.floor(n / 160));
    for (let i = 0; i < n; i += step) {
      const p = assign[i]; if (p < 0) continue;
      L.polyline([[m.aLat[i], m.aLon[i]], [m.sLat[p], m.sLon[p]]], { color: col, weight: 1, opacity: 0.35, interactive: false }).addTo(lineLayer);
    }
  }
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
  renderFamily(m, res);
}

// ------------------------------------------------------------------ walk a mile
function selectFamily(i) {
  state.family = i;
  if (lastRes && lastMarket) renderFamily(lastMarket, lastRes);
  const url = new URL(location.href); url.searchParams.set("family", i + 1); history.replaceState(null, "", url);
}

function renderFamily(m, res) {
  familyLayer.clearLayers();
  const i = state.family;
  const card = $("#family");
  if (i === null || i >= m.n) {
    card.innerHTML = `<div class=tiny>Click any family on the map, or <button class=btn id=randomfam>pick one at random</button>.</div>`;
    $("#randomfam").addEventListener("click", () => selectFamily(Math.floor(Math.random() * m.n)));
    return;
  }
  const f = familyCard(m, i, res.last);
  const J = m.J;
  // highlight + links to first choice (dashed) and to each rule's placement
  L.circleMarker([m.aLat[i], m.aLon[i]], { radius: 7, color: "#111", weight: 2.5, fillColor: "#fff", fillOpacity: 0.9, interactive: false }).addTo(familyLayer);
  const first = m.rol[i][0];
  L.polyline([[m.aLat[i], m.aLon[i]], [m.sLat[first], m.sLon[first]]], { color: "#111", weight: 1.5, dashArray: "4 4", opacity: 0.9, interactive: false }).addTo(familyLayer);
  for (const r of ["dc", "da", "sic"]) {
    const p = res.last[r][i]; if (p < 0) continue;
    L.polyline([[m.aLat[i], m.aLon[i]], [m.sLat[p], m.sLon[p]]], { color: RULE[r].color, weight: 3, opacity: 0.8, interactive: false }).addTo(familyLayer);
  }
  const listRows = f.list.map((s, k) => `<tr><td>${k + 1}. ${s.school}${s.school === f.sib ? " (sibling)" : ""}</td><td>${fmt(s.km, 2)} km</td></tr>`).join("");
  const outRows = ["dc", "da", "sic"].map(r => {
    const o = f.outcomes[r];
    const where = o.school === null ? "unassigned" : (o.rank === 1 ? "first choice" : o.rank ? `choice #${o.rank}` : "unlisted school");
    return `<tr><td style="color:${RULE[r].color};font-weight:600">${RULE[r].name}</td><td>${o.school ?? "—"}</td><td>${where}</td><td>${o.school === null ? "—" : fmt(o.km, 2) + " km"}</td><td>${o.school === null ? "—" : (o.lossKm < 0.005 ? "0" : "−" + fmt(o.lossKm, 2))}</td></tr>`;
  }).join("");
  card.innerHTML = `
    <div class=sub><b>Family ${i + 1}</b> · nearest school ${f.nearest.school} at ${fmt(f.nearest.km, 2)} km · knows ${f.M} schools · listed ${f.K}${f.sib ? ` · sibling at ${f.sib}` : ""}</div>
    <table style="margin-top:6px"><thead><tr><th>Their list</th><th>distance</th></tr></thead><tbody>${listRows}</tbody></table>
    <table style="margin-top:8px"><thead><tr><th>Rule</th><th>placed at</th><th></th><th>distance</th><th>vs 1st, km-eq.</th></tr></thead><tbody>${outRows}</tbody></table>
    <div class=tiny style="margin-top:6px">Last lottery draw. "vs 1st" is how far the placement falls short of the family's first choice in km-equivalent utility. Dashed line: first choice; solid lines: where each rule places them. <button class=btn id=randomfam>another family</button> <button class=btn id=clearfam>clear</button></div>`;
  $("#randomfam").addEventListener("click", () => selectFamily(Math.floor(Math.random() * m.n)));
  $("#clearfam").addEventListener("click", () => { state.family = null; renderFamily(m, res); const url = new URL(location.href); url.searchParams.delete("family"); history.replaceState(null, "", url); });
}

function run(draws) {
  if (busy) { pending = true; return; }
  busy = true;
  setTimeout(() => {
    try {
      const m = currentMarket();
      lastRes = simulate(m, { draws: draws ?? state.draws, seed: state.seed });
      lastMarket = m;
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
  lineLayer = L.layerGroup().addTo(map); homeLayer = L.layerGroup().addTo(map); schoolLayer = L.layerGroup().addTo(map); familyLayer = L.layerGroup().addTo(map);
  const m = markets[2];
  const pts = []; for (let j = 0; j < m.J; j++) pts.push([m.sLat[j], m.sLon[j]]);
  map.fitBounds(L.latLngBounds(pts).pad(0.08));
}

function awareLabel() {
  if (state.aware >= AWARE_ALL) return "every school";
  if (state.aware === 0) return "only the nearest few (as many as they list)";
  if (state.aware === markets[state.grade].baseAware) return `as estimated (≈${(1 + state.aware).toFixed(1)} nearest)`;
  return `≈${(1 + state.aware).toFixed(1)} nearest schools`;
}

function wire() {
  const show = () => {
    $("#seats_o").textContent = `×${state.seats.toFixed(2)}`;
    $("#sxi_o").textContent = `×${state.sxi.toFixed(2)} = ${(markets[state.grade].base.sxi * state.sxi).toFixed(2)} km`;
    $("#seps_o").textContent = `×${state.seps.toFixed(2)} = ${(markets[state.grade].base.seps * state.seps).toFixed(2)} km`;
    $("#sgam_o").textContent = `×${state.sgam.toFixed(2)} = ${(markets[state.grade].base.sgam * state.sgam).toFixed(2)}`;
    $("#aware_o").textContent = awareLabel();
  };
  $("#grades").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
    state.grade = +b.dataset.grade; state.family = null; [...$("#grades").children].forEach(x => x.classList.toggle("on", x === b)); show(); run(); });
  $("#rules").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
    state.rule = b.dataset.rule; [...$("#rules").children].forEach(x => x.classList.toggle("on", x === b));
    if (lastRes) { renderMetrics(lastMarket, lastRes); renderMap(lastMarket, lastRes); } });
  for (const k of ["seats", "sxi", "seps", "sgam", "aware"]) {
    const el = $("#" + k);
    el.addEventListener("input", () => { state[k] = +el.value; show(); run(4); });
    el.addEventListener("change", () => { state[k] = +el.value; show(); run(); });
  }
  $("#lines").addEventListener("change", e => { state.lines = e.target.checked; if (lastRes) renderMap(lastMarket, lastRes); });
  $("#reset").addEventListener("click", () => { for (const k of ["seats", "sxi", "seps", "sgam"]) { state[k] = 1; $("#" + k).value = 1; } state.aware = markets[state.grade].baseAware; $("#aware").value = state.aware; show(); run(); });
  show();
}

// Scenario presets via the URL, e.g. ?grade=2&rule=dc&seats=0.6&sxi=0&aware=0&family=42&lines=0
function applyPresets() {
  const q = new URLSearchParams(location.search);
  const num = (k, lo, hi) => { const v = parseFloat(q.get(k)); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null; };
  const g = num("grade", 2, 4); if (g !== null && [2, 3, 4].includes(g)) state.grade = g;
  if (["dc", "da", "sic"].includes(q.get("rule"))) state.rule = q.get("rule");
  for (const [k, lo, hi] of [["seats", 0.4, 2], ["sxi", 0, 3], ["seps", 0.2, 3], ["sgam", 0, 2]]) { const v = num(k, lo, hi); if (v !== null) { state[k] = v; $("#" + k).value = v; } }
  if (q.get("aware") === "all") { state.aware = AWARE_ALL; } else { const a = num("aware", 0, AWARE_ALL); if (a !== null) state.aware = a; }
  $("#aware").value = state.aware;
  const fam = num("family", 1, 5000); if (fam !== null) state.family = Math.round(fam) - 1;
  if (q.get("lines") === "0") { state.lines = false; $("#lines").checked = false; }
  [...$("#grades").children].forEach(b => b.classList.toggle("on", +b.dataset.grade === state.grade));
  [...$("#rules").children].forEach(b => b.classList.toggle("on", b.dataset.rule === state.rule));
}

loadData().then(() => { applyPresets(); initMap(); wire(); run(); }).catch(err => {
  $("#headline").textContent = "Could not load data"; $("#headsub").textContent = String(err); console.error(err);
});
