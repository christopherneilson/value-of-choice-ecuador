// apply.js — you apply to school in Manta: drop a home, rank the schools around it, and be assigned
// alongside the synthetic families under both rules. Lotteries run in the simulator's worker.
import { haversineKm, buildMarket } from "../engine/engine.js";
import { runApplication } from "../shared/applyrun.js";
import { t, nf, init as i18nInit, mountToggle, getLang } from "../shared/i18n.js";

const $ = s => document.querySelector(s);
const BANDS = ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"];
const C = { dc: "#7b3294", da: "#21918c" };
const GRADE_EN = { 2: "Preschool 1", 3: "Preschool 2", 4: "Primary 1" };
const gradeName = g => t(`grade.${g}`, GRADE_EN[g]);
const ORD_EN = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];
const ordinal = k => t(`ap.ord.${k}`, ORD_EN[k] ?? `${k + 1}th`);
const DRAWS = 25;

const state = { grade: 2, home: null, truth: [], submitted: null, sib: null, seed: 11, aware: "est", showAll: false, res: null, truthful: null };
let schoolsJson = null, cells = null;
const appsJson = {}, mainMarkets = {};
let map, schoolLayer, homeLayer, lineLayer, worker = null, jobId = 0, running = false;
const pending = new Map();

// ------------------------------------------------------------------------------- worker
function startWorker() {
  window.VOC = { get worker() { return !!worker; }, get result() { return state.res; } };
  if (typeof Worker === "undefined" || new URLSearchParams(location.search).get("worker") === "0") return;
  try {
    worker = new Worker(new URL("../simulator/sim.worker.js", import.meta.url), { type: "module" });
    worker.onmessage = e => {
      const d = e.data;
      if (d.type === "applied") { const j = pending.get(d.id); pending.delete(d.id); if (j) j.resolve(d.out); }
      else if (d.type === "error") { console.error("apply worker:", d.message); dropWorker(); }
    };
    worker.onerror = ev => { console.warn("worker unavailable, running on the main thread:", ev.message); dropWorker(); };
  } catch (e) { worker = null; }
}
// If the worker dies, finish every outstanding application on the main thread rather than hanging.
function dropWorker() {
  if (worker) worker.terminate();
  worker = null;
  const jobs = [...pending.values()]; pending.clear();
  for (const j of jobs) j.resolve(runApplication(mainMarket(j.q.grade), j.q));
}

const mainMarket = g => (mainMarkets[g] ||= buildMarket(schoolsJson, appsJson[g]));

async function loadGrade(g) {
  if (appsJson[g]) return;
  appsJson[g] = await fetch(`../data/applicants_g${g}.json`).then(r => r.json());
  if (worker) worker.postMessage({ type: "load", grade: g, schools: schoolsJson, apps: appsJson[g] });
}

function runApply(list, seed) {
  const q = { grade: state.grade, aware: state.aware === "all" ? null : (appsJson[state.grade].aware ?? 1.5),
              sxi: 1, seps: 1, sgam: 1, seats: 1, draws: DRAWS, seed,
              visitor: { lat: state.home.lat, lon: state.home.lon, list, sib: state.sib } };
  if (!worker) return Promise.resolve(runApplication(mainMarket(state.grade), q));
  return new Promise(resolve => { const id = ++jobId; pending.set(id, { q, resolve }); worker.postMessage({ type: "apply", id, ...q }); });
}

// --------------------------------------------------------------------------------- data
const avail = () => schoolsJson.schools.filter(s => s.grades[String(state.grade)]);
const byId = id => schoolsJson.schools.find(s => s.id === id);
const kmTo = s => haversineKm(state.home.lat, state.home.lon, s.lat, s.lon);
const sorted = () => avail().map(s => ({ s, km: kmTo(s) })).sort((a, b) => a.km - b.km);
const seatsOf = s => s.grades[String(state.grade)].seats;
const bandOf = s => s.grades[String(state.grade)].xi_band;

// A home "somewhere typical": a cell of the published density grid, picked in proportion to the
// households it holds, then a uniform point inside that 300 m cell.
function typicalHome() {
  const list = cells.grids["0"], tot = list.reduce((a, c) => a + c.n, 0);
  let x = Math.random() * tot, c = list[0];
  for (const cell of list) { x -= cell.n; if (x <= 0) { c = cell; break; } }
  const half = (cells.meta.cell_m / 2) / 111320;
  return { lat: c.lat + (Math.random() - 0.5) * 2 * half,
           lon: c.lon + (Math.random() - 0.5) * 2 * half / Math.cos(c.lat * Math.PI / 180) };
}

// ---------------------------------------------------------------------------------- map
function initMap() {
  map = L.map("map", { preferCanvas: true, zoomControl: true });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
  lineLayer = L.layerGroup().addTo(map); schoolLayer = L.layerGroup().addTo(map); homeLayer = L.layerGroup().addTo(map);
  const pts = avail().map(s => [s.lat, s.lon]);
  map.fitBounds(L.latLngBounds(pts).pad(0.08));
  map.on("click", e => setHome({ lat: +e.latlng.lat.toFixed(5), lon: +e.latlng.lng.toFixed(5) }));
  drawSchools();
}

function drawSchools() {
  schoolLayer.clearLayers();
  const seatsWord = t("sim.tip.seats", "seats"), bandWord = t("sim.tip.band", "desirability band");
  const listedWord = t("ap.tip.listed", "on your list"), addWord = t("ap.tip.add", "click to add to your list");
  for (const s of avail()) {
    const on = state.truth.includes(s.id);
    const km = state.home ? ` · ${nf(kmTo(s), 2)} km` : "";
    L.circleMarker([s.lat, s.lon], { radius: 4 + Math.sqrt(seatsOf(s)) * 1.1, color: on ? "#111" : "#333", weight: on ? 3 : 1.2,
                                     fillColor: BANDS[bandOf(s) - 1], fillOpacity: 0.85, bubblingMouseEvents: false })
      .bindTooltip(`<b>${s.id}</b> · ${s.canton}${km}<br>${seatsOf(s)} ${seatsWord} · ${bandWord} ${bandOf(s)}/5<br><i>${on ? listedWord : addWord}</i>`, { direction: "top" })
      .on("click", () => (state.home ? toggle(s.id) : null))
      .addTo(schoolLayer);
  }
}

function drawHome() {
  homeLayer.clearLayers();
  if (!state.home) return;
  L.circleMarker([state.home.lat, state.home.lon], { radius: 7, color: "#111", weight: 3, fillColor: "#fff", fillOpacity: 1, interactive: false }).addTo(homeLayer);
}

function drawLines() {
  lineLayer.clearLayers();
  const r = state.res;
  if (!r) return;
  for (const [rule, dash] of [["dc", "5 4"], ["da", null]]) {
    const j = r.out[rule][0];
    if (j < 0) continue;
    const s = byId(r.out.ids[j]);
    L.polyline([[state.home.lat, state.home.lon], [s.lat, s.lon]],
      { color: C[rule], weight: 3.5, opacity: 0.85, dashArray: dash, interactive: false }).addTo(lineLayer);
  }
}

// ---------------------------------------------------------------------------- the list
function setHome(h) {
  state.home = h;
  clearResult();
  $("#clearhome").hidden = false;
  $("#c_home").classList.add("done");
  for (const id of ["c_grade", "c_list"]) $("#" + id).classList.remove("off");
  drawHome(); drawSchools(); renderHome(); renderList();
  if (map) map.panTo([h.lat, h.lon]);
}

function toggle(id) {
  const k = state.truth.indexOf(id);
  if (k >= 0) state.truth.splice(k, 1); else state.truth.push(id);
  if (state.sib && !state.truth.includes(state.sib)) state.sib = null;
  clearResult(); drawSchools(); renderList();
}
function move(id, dir) {
  const k = state.truth.indexOf(id), j = k + dir;
  if (k < 0 || j < 0 || j >= state.truth.length) return;
  [state.truth[k], state.truth[j]] = [state.truth[j], state.truth[k]];
  clearResult(); renderList();
}

function renderHome() {
  if (!state.home) { $("#homeinfo").textContent = t("ap.s1.none", "No home yet. Click anywhere on the map, or take a typical one."); return; }
  const n = sorted()[0];
  $("#homeinfo").innerHTML = t("ap.s1.set", "Your home is set. The nearest school offering {grade} is <b>{s}</b>, {km} km away.",
    { grade: gradeName(state.grade), s: n.s.id, km: nf(n.km, 2) });
}

function renderList() {
  renderHome();
  if (!state.home) {                      // nothing is measurable from a home that does not exist yet
    $("#mine").innerHTML = `<div class=empty>${t("ap.s3.nohome", "Put your home on the map first.")}</div>`;
    $("#nearby").innerHTML = ""; $("#sibwrap").innerHTML = "";
    $("#submit").disabled = true; $("#submitnote").textContent = "";
    return;
  }
  const ol = $("#mine");
  ol.innerHTML = state.truth.length ? "" : `<div class=empty>${t("ap.s3.empty", "Nothing listed yet. Add a school below, or click one on the map.")}</div>`;
  state.truth.forEach((id, k) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class=n>${k + 1}.</span><span>${id}${state.sib === id ? " " + t("ap.sibtag", "(sibling)") : ""}</span>` +
      `<span class=km>${nf(kmTo(byId(id)), 2)} km</span><span class=act></span>`;
    const act = li.querySelector(".act");
    for (const [lab, aria, fn, off] of [["↑", t("ap.up", "move up"), () => move(id, -1), k === 0],
                                        ["↓", t("ap.down", "move down"), () => move(id, 1), k === state.truth.length - 1],
                                        ["×", t("ap.remove", "remove"), () => toggle(id), false]]) {
      const b = document.createElement("button");
      b.className = "btn"; b.textContent = lab; b.title = aria; b.setAttribute("aria-label", `${aria}: ${id}`); b.disabled = off;
      b.style.padding = "2px 6px"; b.addEventListener("click", fn); act.appendChild(b);
    }
    ol.appendChild(li);
  });

  const rows = sorted().filter(x => !state.truth.includes(x.s.id));
  const shown = state.showAll ? rows : rows.slice(0, 8);
  $("#nearby").innerHTML = `<table><thead><tr><th data-i18n="ap.th.school">School</th><th data-i18n="ap.th.km">km</th><th data-i18n="ap.th.seats">seats</th><th></th></tr></thead><tbody>` +
    shown.map(x => `<tr><td><span class=band style="background:${BANDS[bandOf(x.s) - 1]}"></span>${x.s.id}</td><td>${nf(x.km, 2)}</td><td>${seatsOf(x.s)}</td>` +
      `<td class=act><button class=btn data-add="${x.s.id}" aria-label="${t("ap.add", "add")}: ${x.s.id}">${t("ap.add", "add")}</button></td></tr>`).join("") +
    `</tbody></table>`;
  $("#showall").textContent = state.showAll ? t("ap.s3.fewer", "show fewer") : t("ap.s3.all", "show all");

  $("#sibwrap").innerHTML = state.truth.length
    ? `<label for=sibsel>${t("ap.sib", "A sibling already attends")}</label> <select id=sibsel style="font:inherit;font-size:12px">` +
      `<option value="">${t("ap.sib.none", "no sibling")}</option>` +
      state.truth.map(id => `<option value="${id}"${state.sib === id ? " selected" : ""}>${id}</option>`).join("") +
      `</select> <span>${t("ap.sib.note", "Siblings outrank everyone else at that school.")}</span>` : "";

  $("#submit").disabled = !state.home || !state.truth.length || running;
  $("#submitnote").textContent = state.truth.length
    ? t("ap.s3.note", "You will be assigned with {n} other families competing for the same seats.", { n: nf(appsJson[state.grade] ? appsJson[state.grade].applicants.length : 0) })
    : "";
  $("#c_list").classList.toggle("done", state.truth.length > 0);
}

// -------------------------------------------------------------------------------- run
const setAwareLabel = () => { $("#awareness").textContent = state.aware === "all"
  ? t("ap.next.aware.off", "Back to what families really know") : t("ap.next.aware", "Let every family know every school"); };

function clearResult() {
  state.res = null; state.truthful = null; state.submitted = null; state.aware = "est";
  $("#c_result").hidden = true; $("#c_next").hidden = true; $("#nextnote").innerHTML = "";
  setAwareLabel();
  if (lineLayer) lineLayer.clearLayers();
}

async function submit(list, { keepTruthful = false } = {}) {
  if (!state.home || !state.truth.length) return;
  running = true; $("#submit").disabled = true;
  $("#c_result").hidden = false;
  $("#result").innerHTML = `<div class=sub>${t("ap.running", "Running {n} lotteries against the whole market…", { n: DRAWS })}</div>`;
  const submitted = list ?? state.truth;
  const out = await runApply(submitted, state.seed);
  state.submitted = submitted;
  state.res = { out, truth: state.truth.slice(), submitted };
  if (!keepTruthful) state.truthful = state.res;
  running = false;
  renderResult(); drawLines();
  $("#c_next").hidden = false;
  $("#submit").disabled = false;
  writeUrl();
}

// Which of the visitor's true choices is column j? −1 = a school they did not list, −2 = unassigned.
const rankOf = (r, j) => (j < 0 ? -2 : (k => (k < 0 ? -1 : k))(r.truth.indexOf(r.out.ids[j])));
function choiceLabel(rk) {
  if (rk === -2) return t("ap.unassigned", "no school");
  if (rk === -1) return t("ap.unlisted", "a school you did not list");
  return t("ap.choice", "your {o} choice", { o: ordinal(rk) });
}
function tally(r, rule) {
  const cnt = new Map();
  for (const j of r.out[rule]) { const k = rankOf(r, j); cnt.set(k, (cnt.get(k) ?? 0) + 1); }
  return [...cnt.entries()].sort((a, b) => (a[0] < 0 ? 99 + a[0] : a[0]) - (b[0] < 0 ? 99 + b[0] : b[0]));
}
const firstShare = (r, rule) => r.out[rule].filter(j => rankOf(r, j) === 0).length / r.out[rule].length;
const listedShare = (r, rule) => r.out[rule].filter(j => rankOf(r, j) >= 0).length / r.out[rule].length;

function renderResult() {
  const r = state.res;
  const nearestId = sorted()[0].s.id;
  const cards = ["dc", "da"].map(rule => {
    const j = r.out[rule][0], rk = rankOf(r, j);
    const id = j < 0 ? "—" : r.out.ids[j];
    const km = j < 0 ? "" : `${nf(r.out.km[j], 2)} km`;
    return `<div style="border-color:${C[rule]}"><div class=rl style="color:${C[rule]}">${t(`rule.${rule}`, rule === "dc" ? "Distance rule" : "Deferred acceptance")}</div>` +
      `<div class=sc>${id}</div><div class=ch>${choiceLabel(rk)}</div><div class=km>${km}</div></div>`;
  }).join("");

  const rd = rankOf(r, r.out.dc[0]), ra = rankOf(r, r.out.da[0]);
  const better = (a, b) => (a < 0 ? 99 - a : a) - (b < 0 ? 99 - b : b);   // lower is better
  let verdict;
  if (r.truth[0] === nearestId)
    verdict = t("ap.v.nearest", "Your first choice is the school next door, so the two rules have little to disagree about. <b>Put a school you would actually prefer at the top</b> and hand it in again.");
  else if (better(ra, rd) < 0)
    verdict = t("ap.v.dawins", "<b class=good>The distance rule never read your list.</b> It knows only where you live, so it offered you {dc}. Deferred acceptance read the same list and offered you {da}. That difference, across a whole market, is what the paper measures.",
      { dc: choiceLabel(rd), da: choiceLabel(ra) });
  else if (ra === rd)
    verdict = t("ap.v.same", "Both rules landed on the same place this time. That happens when the school you want most is also the one nearest you with a seat left. Move a school up your list, or try a more crowded grade.");
  else
    verdict = t("ap.v.dcwins", "This draw went against you: deferred acceptance placed you below the distance rule. One lottery is one lottery. Look at the {n} draws below, and run it again.", { n: DRAWS });

  const odds = ["dc", "da"].map(rule => {
    const rows = tally(r, rule).map(([k, c]) =>
      `<div class=row><span>${choiceLabel(k)}</span><span class=bar><i style="width:${100 * c / DRAWS}%;background:${C[rule]}"></i></span><span class=val>${nf(100 * c / DRAWS, 0)}%</span></div>`).join("");
    return `<div style="margin-top:8px"><div class=sub style="color:${C[rule]}">${t(`rule.${rule}`, rule === "dc" ? "Distance rule" : "Deferred acceptance")}</div><div class=odds>${rows}</div></div>`;
  }).join("");

  $("#result").innerHTML = `<div class=res>${cards}</div><p class=verdict>${verdict}</p>` +
    `<div class=sub style="margin-top:10px">${t("ap.odds.h", "Across {n} independent lotteries", { n: DRAWS })}</div>${odds}` +
    `<p class=tiny style="margin-top:8px">${t("ap.odds.note", "Same list, same market, different lottery numbers. Your risk comes from the seats, not from the algorithm.")} ` +
    `<span class=src>${t("src.syn", "synthetic population")}</span></p>` +
    (state.submitted !== state.res.truth && state.submitted.join() !== state.res.truth.join()
      ? `<p class=note>${t("ap.lying.now", "You handed in <b>{sub}</b>. Your outcome is still scored against what you actually want, <b>{tru}</b>.", { sub: state.submitted.join(" › "), tru: state.res.truth.join(" › ") })}</p>` : "");
}

// ------------------------------------------------------------------------ what next
function noteHtml(msg) { $("#nextnote").innerHTML = `<p class=note>${msg}</p>`; }

function wireNext() {
  $("#again").addEventListener("click", () => { state.seed = 11 + Math.floor(Math.random() * 9000); submit(state.submitted, { keepTruthful: true }); noteHtml(t("ap.n.again", "New lottery numbers, same list and the same market.")); });
  $("#swap").addEventListener("click", async () => {
    if (state.truth.length < 2) return noteHtml(t("ap.n.swap.need", "List at least two schools first."));
    const lie = state.truth.slice(); [lie[0], lie[1]] = [lie[1], lie[0]];
    const truthful = state.truthful ?? state.res;
    await submit(lie, { keepTruthful: true });
    const a = firstShare(truthful, "da"), b = firstShare(state.res, "da");
    const la = listedShare(truthful, "da"), lb = listedShare(state.res, "da");
    noteHtml(t("ap.n.swap", "You got your real first choice in {b}% of lotteries, against {a}% when you told the truth. And hedging bought you nothing: you landed in some school you had listed {lb}% of the time, against {la}%. Under deferred acceptance a school you rank lower is still yours if you can get it, so in this configuration there is no reason to put a safe school first. The {toy} shows why in three families.",
      { a: nf(100 * a, 0), b: nf(100 * b, 0), la: nf(100 * la, 0), lb: nf(100 * lb, 0), toy: `<a href="../toy/">${t("ap.n.toy", "toy market")}</a>` }));
  });
  $("#awareness").addEventListener("click", async () => {
    const truthful = state.truthful ?? state.res;
    state.aware = state.aware === "all" ? "est" : "all";
    await submit(state.res.submitted, { keepTruthful: state.aware === "all" });
    setAwareLabel();
    const a = firstShare(truthful, "da"), b = firstShare(state.res, "da");
    noteHtml(state.aware === "all"
      ? t("ap.n.aware", "Every family now compares all the schools in the market instead of the few nearest, so the desirable ones draw more applications. Your chance of your first choice moved from {a}% to {b}%. Awareness is a different policy lever from acting on the preferences families already hold, and the {sim} lets you move it continuously.",
          { a: nf(100 * a, 0), b: nf(100 * b, 0), sim: `<a href="../simulator/">${t("ap.n.sim", "simulator")}</a>` })
      : t("ap.n.aware.off", "Back to the estimated consideration sets: families compare only their nearest few schools."));
  });
}

// --------------------------------------------------------------------------- URL state
function writeUrl() {
  const u = new URL(location.href);
  u.searchParams.set("lat", state.home.lat); u.searchParams.set("lon", state.home.lon);
  u.searchParams.set("grade", state.grade); u.searchParams.set("list", state.truth.join(","));
  u.searchParams.set("seed", state.seed);
  if (state.sib) u.searchParams.set("sib", state.sib); else u.searchParams.delete("sib");
  history.replaceState(null, "", u);
}
function readUrl() {
  const q = new URLSearchParams(location.search);
  const g = +q.get("grade"); if ([2, 3, 4].includes(g)) state.grade = g;
  const lat = parseFloat(q.get("lat")), lon = parseFloat(q.get("lon"));
  const seed = parseInt(q.get("seed"), 10); if (Number.isFinite(seed)) state.seed = seed;
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    state.home = { lat, lon };
    const ok = new Set(avail().map(s => s.id));
    state.truth = (q.get("list") ?? "").split(",").filter(x => ok.has(x));
    if (ok.has(q.get("sib")) && state.truth.includes(q.get("sib"))) state.sib = q.get("sib");
    return true;
  }
  return false;
}

// ------------------------------------------------------------------------------- wire
async function setGrade(g) {
  state.grade = g;
  [...$("#grades").children].forEach(b => { const on = +b.dataset.grade === g; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  state.truth = state.truth.filter(id => byId(id).grades[String(g)]);
  if (state.sib && !state.truth.includes(state.sib)) state.sib = null;
  clearResult();
  await loadGrade(g);
  drawSchools(); renderList(); renderGradeInfo();
}

function renderGradeInfo() {
  const a = appsJson[state.grade];
  if (!a) return;
  const seats = avail().reduce((s, x) => s + seatsOf(x), 0);
  $("#gradeinfo").textContent = t("ap.gradeinfo", "{n} families · {J} schools · {seats} seats, {ratio} per family. The tighter the market, the more the rule matters.",
    { n: nf(a.applicants.length), J: avail().length, seats: nf(seats), ratio: nf(seats / a.applicants.length, 2) });
}

async function main() {
  [schoolsJson, cells] = await Promise.all(["schools.json", "home_density_cells.json"].map(f => fetch(`../data/${f}`).then(r => r.json())));
  startWorker();
  const restored = readUrl();
  await loadGrade(state.grade);
  initMap();
  [...$("#grades").children].forEach(b => { const on = +b.dataset.grade === state.grade; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  renderGradeInfo();
  $("#grades").addEventListener("click", e => { const b = e.target.closest("button"); if (b) setGrade(+b.dataset.grade); });
  $("#pickrandom").addEventListener("click", () => { state.truth = []; state.sib = null; setHome(typicalHome()); });
  $("#clearhome").addEventListener("click", () => { state.home = null; state.truth = []; state.sib = null; clearResult();
    $("#clearhome").hidden = true; $("#c_home").classList.remove("done"); $("#c_grade").classList.add("off"); $("#c_list").classList.add("off");
    drawHome(); drawSchools(); renderList(); });
  $("#showall").addEventListener("click", () => { state.showAll = !state.showAll; renderList(); });
  $("#nearby").addEventListener("click", e => { const b = e.target.closest("[data-add]"); if (b) toggle(b.dataset.add); });
  $("#sibwrap").addEventListener("change", e => { if (e.target.id === "sibsel") { state.sib = e.target.value || null; clearResult(); renderList(); } });
  $("#submit").addEventListener("click", () => submit(null));
  wireNext();
  window.addEventListener("langchange", () => { drawSchools(); renderList(); renderGradeInfo(); setAwareLabel(); if (state.res) renderResult(); });
  if (restored) { setHome(state.home); if (state.truth.length) submit(null); } else { renderList(); }
  window.VOC.ready = true;
}

i18nInit(); mountToggle("#langtoggle");
const TITLES = { en: "Apply to school in Manta — The Value of Choice", es: "Postula a una escuela en Manta — El valor de elegir" };
if (getLang() === "es") document.title = TITLES.es;
window.addEventListener("langchange", e => { document.title = TITLES[e.detail.lang] || TITLES.en; });
main().catch(err => { $("#homeinfo").textContent = t("load.fail", "Could not load data"); console.error(err); });
