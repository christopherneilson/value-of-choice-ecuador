// app.js — "Choose the rule": map + rule toggle + metrics + sliders + one-family panel, on ../engine/engine.js
import { buildMarket, rescale, simulate, withAwareness, familyCard } from "../engine/engine.js";
import { t, nf, init as i18nInit, mountToggle, getLang } from "../shared/i18n.js";

const GRADE_EN = { 2: "Preschool 1", 3: "Preschool 2", 4: "Primary 1" };
const gradeName = g => t(`grade.${g}`, GRADE_EN[g]);
// the paper's real-data numbers by grade, for context (assignment shares from the grade tables)
const PAPER = {
  2: { dc_listed: 64.7, da_listed: 96.1, da_first: 93.2, rec: "99.6%", near: 65 },
  3: { dc_listed: 43.2, da_listed: 70.4, da_first: 58.2, rec: "82.3%", near: 63 },
  4: { dc_listed: 26.1, da_listed: 46.4, da_first: 32.6, rec: "near zero (sensitive to conventions)", near: 54 },
};
const RULE_EN = {
  dc: { name: "Distance rule", color: "#7b3294", info: "The status quo: each family is offered its nearest school with a seat; ties by one lottery per family. Families' stated preferences play no role." },
  da: { name: "Deferred acceptance", color: "#21918c", info: "The deployed rule: families' reported lists, with the remaining schools appended in distance order; priorities sibling > reported > appended, one lottery per family–school pair." },
  sic: { name: "Benchmark", color: "#5ec962", info: "Constrained-efficient benchmark: stable improvement cycles applied to the deferred-acceptance outcome — the most a priority-respecting mechanism can add." },
};
const ruleName = r => t(`rule.${r}`, RULE_EN[r].name);
const ruleInfo = r => t(`rule.${r}.info`, RULE_EN[r].info);
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

const fmt = (x, d = 1) => nf(x, d);

function renderMetrics(m, res) {
  const r = res.rules, cur = state.rule;
  const rows = [
    [t("sim.row.listed", "Placed in a listed school, %"), r.dc.listed, r.da.listed, r.sic.listed, 1],
    [t("sim.row.first", "Placed in first choice, %"), r.dc.first, r.da.first, r.sic.first, 1],
    [t("sim.row.km", "Mean distance to school, km"), r.dc.km, r.da.km, r.sic.km, 2],
    [t("sim.row.welfare", "Mean welfare, km-equivalent"), r.dc.utility, r.da.utility, r.sic.utility, 2],
  ];
  $("#metrics").innerHTML = rows.map(([lab, a, b, c, d]) =>
    `<tr><td>${lab}</td><td class="${cur === "dc" ? "cur" : ""}">${fmt(a, d)}</td><td class="${cur === "da" ? "cur" : ""}">${fmt(b, d)}</td><td class="${cur === "sic" ? "cur" : ""}">${fmt(c, d)}</td></tr>`).join("");
  const R = r[cur];
  const seatsTot = Array.from(m.caps).reduce((s, c) => s + c, 0);
  $("#headline").textContent = t("sim.headline", "{n}% in their first choice", { n: fmt(R.first, 0) });
  $("#headline").style.color = RULE_EN[cur].color;
  $("#headsub").textContent = t("sim.headsub", "{listed}% in a school they listed · mean {km} km to school · {n} families, {seats} seats · mean of {draws} lottery draws",
    { listed: fmt(R.listed, 0), km: fmt(R.km, 2), n: nf(m.n), seats: nf(seatsTot), draws: res.draws });
  let meanM = 0; for (let i = 0; i < m.n; i++) meanM += m.M[i]; meanM /= m.n;
  $("#recovered").innerHTML = t("sim.recovered",
    "Deferred acceptance closes <b>{rec}%</b> of the welfare gap between the distance rule and the benchmark (gain {gain} km-equivalent per family). {near}% of families rank their nearest school first; those who don't accept a median {extra} km more travel. Families consider {m} schools on average.",
    { rec: fmt(res.recoveredShare, 1), gain: fmt(res.gainKmDaOverDc, 2), near: fmt(100 * res.nearestFirst, 0), extra: fmt(res.medianExtraKm, 2), m: fmt(meanM, 1) });
  const P = PAPER[state.grade];
  const rec = state.grade === 4 ? t("sim.paper.rec.4", P.rec) : P.rec;
  $("#paper").innerHTML = t("sim.paper", "<b>Paper, real data ({grade}):</b> distance rule {dcl}% listed · DA {dal}% listed, {daf}% first choice · DA closes {rec} of the range · {near}% rank nearest first.",
    { grade: gradeName(state.grade), dcl: nf(P.dc_listed, 1), dal: nf(P.da_listed, 1), daf: nf(P.da_first, 1), rec, near: P.near });
  $("#gradeinfo").textContent = t("sim.gradeinfo", "{n} families · {J} schools · {seats} seats ({ratio} per family)",
    { n: nf(m.n), J: m.J, seats: nf(seatsTot), ratio: nf(seatsTot / m.n, 2) });
  $("#ruleinfo").textContent = ruleInfo(cur);
}

function homeStyle(m, assign, i) {
  const p = assign[i], col = RULE_EN[state.rule].color;
  if (p < 0) return { fill: "#e41a1c", stroke: "#e41a1c", r: 2.6, op: 0.9 };
  if (m.rol[i][0] === p) return { fill: col, stroke: col, r: 3, op: 0.85 };
  if (m.rol[i].includes(p)) return { fill: col, stroke: col, r: 2.6, op: 0.4 };
  return { fill: "#e0e0e0", stroke: "#bbb", r: 2.4, op: 0.85 };
}

function renderMap(m, res) {
  const assign = res.last[state.rule];
  homeLayer.clearLayers(); lineLayer.clearLayers();
  const col = RULE_EN[state.rule].color;
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
  const seatsWord = t("sim.tip.seats", "seats"), placedWord = t("sim.tip.placed", "placed"), bandWord = t("sim.tip.band", "desirability band");
  for (let j = 0; j < J; j++) {
    const s = byId.get(m.ids[j]); const band = s.grades[g].xi_band;
    const seats = m.caps[j];
    const filled = assign.reduce((c, p) => c + (p === j ? 1 : 0), 0);
    L.circleMarker([m.sLat[j], m.sLon[j]], { radius: 4 + Math.sqrt(seats) * 1.1, color: "#222", weight: 1.5, fillColor: BAND_COLORS[band - 1], fillOpacity: 0.85 })
      .bindTooltip(`<b>${s.id}</b> · ${s.canton}<br>${seats} ${seatsWord}, ${filled} ${placedWord}<br>${bandWord} ${band}/5`, { direction: "top" })
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
    card.innerHTML = `<div class=tiny>${t("fam.pick", "Click any family on the map, or")} <button class=btn id=randomfam>${t("fam.random", "pick one at random")}</button>.</div>`;
    $("#randomfam").addEventListener("click", () => selectFamily(Math.floor(Math.random() * m.n)));
    return;
  }
  const f = familyCard(m, i, res.last);
  L.circleMarker([m.aLat[i], m.aLon[i]], { radius: 7, color: "#111", weight: 2.5, fillColor: "#fff", fillOpacity: 0.9, interactive: false }).addTo(familyLayer);
  const first = m.rol[i][0];
  L.polyline([[m.aLat[i], m.aLon[i]], [m.sLat[first], m.sLon[first]]], { color: "#111", weight: 1.5, dashArray: "4 4", opacity: 0.9, interactive: false }).addTo(familyLayer);
  for (const r of ["dc", "da", "sic"]) {
    const p = res.last[r][i]; if (p < 0) continue;
    L.polyline([[m.aLat[i], m.aLon[i]], [m.sLat[p], m.sLon[p]]], { color: RULE_EN[r].color, weight: 3, opacity: 0.8, interactive: false }).addTo(familyLayer);
  }
  const listRows = f.list.map((s, k) => `<tr><td>${k + 1}. ${s.school}${s.school === f.sib ? t("fam.sibtag", " (sibling)") : ""}</td><td>${fmt(s.km, 2)} km</td></tr>`).join("");
  const outRows = ["dc", "da", "sic"].map(r => {
    const o = f.outcomes[r];
    const where = o.school === null ? t("fam.unassigned", "unassigned") : (o.rank === 1 ? t("fam.first", "first choice") : o.rank ? t("fam.choice", "choice #{r}", { r: o.rank }) : t("fam.unlisted", "unlisted school"));
    return `<tr><td style="color:${RULE_EN[r].color};font-weight:600">${ruleName(r)}</td><td>${o.school ?? "—"}</td><td>${where}</td><td>${o.school === null ? "—" : fmt(o.km, 2) + " km"}</td><td>${o.school === null ? "—" : (o.lossKm < 0.005 ? "0" : "−" + fmt(o.lossKm, 2))}</td></tr>`;
  }).join("");
  card.innerHTML = `
    <div class=sub>${t("fam.head", "<b>Family {i}</b> · nearest school {s} at {km} km · knows {M} schools · listed {K}", { i: i + 1, s: f.nearest.school, km: fmt(f.nearest.km, 2), M: f.M, K: f.K })}${f.sib ? t("fam.sib", " · sibling at {s}", { s: f.sib }) : ""}</div>
    <table style="margin-top:6px"><thead><tr><th>${t("fam.th.list", "Their list")}</th><th>${t("fam.th.dist", "distance")}</th></tr></thead><tbody>${listRows}</tbody></table>
    <table style="margin-top:8px"><thead><tr><th>${t("fam.th.rule", "Rule")}</th><th>${t("fam.th.placed", "placed at")}</th><th></th><th>${t("fam.th.dist", "distance")}</th><th>${t("fam.th.vs", "vs 1st, km-eq.")}</th></tr></thead><tbody>${outRows}</tbody></table>
    <div class=tiny style="margin-top:6px">${t("fam.note", "Last lottery draw. \"vs 1st\" is how far the placement falls short of the family's first choice in km-equivalent utility. Dashed line: first choice; solid lines: where each rule places them.")} <button class=btn id=randomfam>${t("fam.another", "another family")}</button> <button class=btn id=clearfam>${t("fam.clear", "clear")}</button></div>`;
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
  if (state.aware >= AWARE_ALL) return t("sim.aware.all", "every school");
  if (state.aware === 0) return t("sim.aware.zero", "only the nearest few (as many as they list)");
  const k = nf(1 + state.aware, 1);
  if (state.aware === markets[state.grade].baseAware) return t("sim.aware.est", "as estimated (≈{k} nearest)", { k });
  return t("sim.aware.k", "≈{k} nearest schools", { k });
}

function showSliders() {
  const b = markets[state.grade].base;
  $("#seats_o").textContent = `×${nf(state.seats, 2)}`;
  $("#sxi_o").textContent = `×${nf(state.sxi, 2)} = ${nf(b.sxi * state.sxi, 2)} km`;
  $("#seps_o").textContent = `×${nf(state.seps, 2)} = ${nf(b.seps * state.seps, 2)} km`;
  $("#sgam_o").textContent = `×${nf(state.sgam, 2)} = ${nf(b.sgam * state.sgam, 2)}`;
  $("#aware_o").textContent = awareLabel();
}

function wire() {
  $("#grades").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
    state.grade = +b.dataset.grade; state.family = null; [...$("#grades").children].forEach(x => x.classList.toggle("on", x === b)); showSliders(); run(); });
  $("#rules").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
    state.rule = b.dataset.rule; [...$("#rules").children].forEach(x => x.classList.toggle("on", x === b));
    if (lastRes) { renderMetrics(lastMarket, lastRes); renderMap(lastMarket, lastRes); } });
  for (const k of ["seats", "sxi", "seps", "sgam", "aware"]) {
    const el = $("#" + k);
    el.addEventListener("input", () => { state[k] = +el.value; showSliders(); run(4); });
    el.addEventListener("change", () => { state[k] = +el.value; showSliders(); run(); });
  }
  $("#lines").addEventListener("change", e => { state.lines = e.target.checked; if (lastRes) renderMap(lastMarket, lastRes); });
  $("#reset").addEventListener("click", () => { for (const k of ["seats", "sxi", "seps", "sgam"]) { state[k] = 1; $("#" + k).value = 1; } state.aware = markets[state.grade].baseAware; $("#aware").value = state.aware; showSliders(); run(); });
  window.addEventListener("langchange", () => { showSliders(); if (lastRes) { renderMetrics(lastMarket, lastRes); renderMap(lastMarket, lastRes); } });
  showSliders();
}

// Scenario presets via the URL, e.g. ?grade=2&rule=dc&seats=0.6&sxi=0&aware=0&family=42&lines=0&lang=es
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

i18nInit(); mountToggle("#langtoggle");
document.title = getLang() === "es" ? "Elige la regla — El valor de elegir" : document.title;
loadData().then(() => { applyPresets(); initMap(); wire(); run(); }).catch(err => {
  $("#headline").textContent = t("load.fail", "Could not load data"); $("#headsub").textContent = String(err); console.error(err);
});
