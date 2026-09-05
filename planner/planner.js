// planner.js — guess each school's desirability band from its ten imagery attributes; compare with a planner model.
import { t, nf, init as i18nInit, mountToggle, getLang } from "../shared/i18n.js";
const $ = s => document.querySelector(s);
const ROUNDS = 10;

const ATTR_EN = {
  building_footprint_m2: "Building footprint", building_count: "Building count", built_up_density: "Built-up density",
  greenery_ndvi_mean: "Greenery (NDVI)", open_recreation_space: "Open recreation space", building_condition: "Building condition",
  sidewalk_quality: "Sidewalk quality", road_pavement: "Road pavement", street_safety_cues: "Street-safety cues",
  visible_commercial_activity: "Commercial activity nearby",
};
const attrName = c => t(`pl.attr.${c}`, ATTR_EN[c]);
const CAT = {
  building_condition: { fair: "fair", good: "good" },
  sidewalk_quality: { none: "none", poor: "poor", fair: "fair", good: "good" },
  road_pavement: { unpaved: "unpaved", partially_paved: "partially paved", paved: "paved" },
  street_safety_cues: { none: "none", minimal: "minimal", moderate: "moderate" },
};
function rawLabel(c, v) {
  if (v === null || v === undefined) return t("pl.na", "not coded");
  if (c === "building_footprint_m2") return `${nf(v, 0)} m²`;
  if (c === "building_count") return t("pl.raw.count", "{n} buildings", { n: nf(v, 0) });
  if (c === "built_up_density") return `${nf(100 * v, 1)}% ${t("pl.raw.builtup", "built up")}`;
  if (c === "greenery_ndvi_mean") return nf(v, 2);
  if (typeof v === "boolean") return v ? t("pl.yes", "yes") : t("pl.no", "no");
  if (CAT[c]) return t(`pl.cat.${c}.${v}`, CAT[c][v] ?? String(v));
  return String(v);
}

let data, order = [], k = 0, guesses = [], seed = 0;

function mulberry32(a) { return () => { a = (a + 0x6D2B79F5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function newGame() {
  const rng = mulberry32(seed + 1);
  order = data.schools.map((_, i) => i).sort(() => rng() - 0.5).slice(0, ROUNDS);
  k = 0; guesses = [];
  $("#summary").hidden = true;
  renderRound();
}

function renderRound() {
  const s = data.schools[order[k]];
  $("#round").textContent = k + 1; $("#total").textContent = ROUNDS;
  $("#school").textContent = t("pl.school", "School {id}", { id: s.id });
  $("#schoolsub").textContent = t("pl.school.sub", "{canton} · {seats} seats in Preschool 1", { canton: s.canton, seats: s.seats });
  $("#attrs").innerHTML = data.attributes.map(c => {
    const z = s.z[c], w = Math.min(50, Math.abs(z) * 20);       // ±2.5 SD spans the bar
    const left = z >= 0 ? 50 : 50 - w;
    return `<div class=attr><span>${attrName(c)}</span><span class=bar><b></b><i style="left:${left}%;width:${w}%"></i></span><span class=val>${rawLabel(c, s.raw[c])}</span></div>`;
  }).join("");
  $("#bands").querySelectorAll("button").forEach(b => { b.disabled = false; b.className = ""; });
  $("#reveal").innerHTML = ""; $("#next").hidden = true;
  renderScore();
}

function guess(b) {
  const s = data.schools[order[k]];
  guesses.push({ mine: b, truth: s.band, planner: s.planner.band });
  $("#bands").querySelectorAll("button").forEach(x => { x.disabled = true; if (+x.dataset.b === s.band) x.classList.add("truth"); if (+x.dataset.b === b) x.classList.add("mine"); });
  const diff = Math.abs(b - s.band);
  const verdict = diff === 0 ? t("pl.r.exact", "<b class=good>Exactly right.</b>") : diff === 1 ? t("pl.r.close", "<b class=good>One band off</b> — close.") : t("pl.r.miss", "<b class=bad>{d} bands off.</b>", { d: diff });
  $("#reveal").innerHTML = `${verdict} ${t("pl.r.truth", "Families put this school in band <b>{b}</b>. A planner fitting all ten attributes would have guessed <b>{p}</b>.", { b: s.band, p: s.planner.band })}`;
  $("#next").hidden = false;
  renderScore();
}

function renderScore() {
  const within = guesses.filter(g => Math.abs(g.mine - g.truth) <= 1).length;
  $("#score").textContent = `${within} / ${guesses.length}`;
}

function finish() {
  const m = data.model, n = guesses.length;
  const me1 = guesses.filter(g => Math.abs(g.mine - g.truth) <= 1).length / n, me0 = guesses.filter(g => g.mine === g.truth).length / n;
  const pl1 = guesses.filter(g => Math.abs(g.planner - g.truth) <= 1).length / n, pl0 = guesses.filter(g => g.planner === g.truth).length / n;
  const ch1 = guesses.filter(g => Math.abs(3 - g.truth) <= 1).length / n, ch0 = guesses.filter(g => g.truth === 3).length / n;
  const row = (lab, a, b) => `<tr><td>${lab}</td><td class=n>${nf(100 * a, 0)}%</td><td class=n>${nf(100 * b, 0)}%</td></tr>`;
  $("#summary_rows").innerHTML = row(t("pl.you", "You"), me1, me0) + row(t("pl.planner", "Planner model (ten attributes)"), pl1, pl0) + row(t("pl.chance", "Always guessing the middle band"), ch1, ch0);
  $("#summary_note").innerHTML = t("pl.summary.note", "On these {n} schools. Over all {N} in-market schools the planner model, fitted leave-one-out, lands within one band for {w}% (guessing the middle band: {c}%) and explains {r2}% of the variation in bands out of sample. That is the paper's measurement result in miniature: the attributes are real signals, and most of what families want is still not in them.",
    { n, N: m.n, w: nf(100 * m.within1, 0), c: nf(100 * m.chance_within1, 0), r2: nf(100 * Math.max(0, m.r2_loo), 0) }) + ` <span class=src>${t("pl.src.attrs", "derived attributes, real schools")}</span>`;
  $("#summary").hidden = false;
}

async function main() {
  data = await fetch("../data/school_attributes.json").then(r => r.json());
  $("#bands").addEventListener("click", e => { const b = e.target.closest("button"); if (!b || b.disabled) return; guess(+b.dataset.b); });
  $("#next").addEventListener("click", () => { k++; if (k >= ROUNDS) { finish(); k = ROUNDS - 1; $("#next").hidden = true; } else renderRound(); });
  $("#again").addEventListener("click", () => { seed++; newGame(); });
  window.addEventListener("langchange", () => { renderRound(); if (!$("#summary").hidden) finish(); });
  newGame();
}

i18nInit(); mountToggle("#langtoggle");
if (getLang() === "es") document.title = "¿Podría haberlo adivinado un planificador? — El valor de elegir";
window.addEventListener("langchange", e => { document.title = e.detail.lang === "es" ? "¿Podría haberlo adivinado un planificador? — El valor de elegir" : "Could a planner have guessed? — The Value of Choice"; });
main().catch(err => { $("#school").textContent = t("load.fail", "Could not load data"); console.error(err); });
