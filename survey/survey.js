// survey.js — the parent survey as aggregates, sliced by application-list length and entry grade. No microdata.
import { t, nf, init as i18nInit, mountToggle, getLang } from "../shared/i18n.js";
const $ = s => document.querySelector(s);
let D, lens = "all", grade = "all";

const REASONS = ["scarcity", "confident", "hard_to_find", "prefer_unassigned", "private", "other"];
const REASON_EN = {
  scarcity: "No public school close enough", confident: "Confident of a seat in a listed school",
  hard_to_find: "Hard to find more schools", prefer_unassigned: "Knows the others, prefers to stay unassigned",
  private: "Would enrol private if unassigned", other: "Other",
};
const KNOW_EN = { well: "know well", name: "by name only", no: "don't know" };
const OUT_EN = {
  "All matched respondents": ["out.all", "All matched respondents"],
  "Listed exactly one school": ["out.one", "Listed exactly one school"],
  "Confident (P>=90% of a seat)": ["out.conf", "Confident (90% or more)"],
  "Confident AND listed one school": ["out.confone", "Confident and listed one school"],
};
const REP_EN = {
  manta_origin: "Manta-origin (%)", block_nbi: "Block deprivation, NBI (%)", list_length: "List length (mean)",
  admission_risk: "True admission risk (%)", placed_listed: "Placed in a listed school (%)",
};

const sup = () => `<span class=sup>${t("sv.sup", "n<5")}</span>`;
const P = (c, d = 1) => c && c.n !== null ? nf(c.pct, d) + "%" : sup();
const W = c => c && c.n !== null ? c.pct : 0;
const src = key => `<span class=src>${key === "oa" ? t("src.oa", "paper, online appendix") : t("src.survey", "survey, real data (aggregates)")}</span>`;
const row = (label, c, cls = "") => `<div class="row ${cls}"><span>${label}</span><span class=bar><i style="width:${W(c)}%"></i></span><span class=val>${P(c)}</span></div>`;
const gloss = (es, en) => `<p class=q>${t("sv.q.verbatim", "The question, verbatim:")} «${es}»${getLang() === "en" ? ` — ${en}` : ""}</p>`;
function stack(o) {
  const ks = ["well", "name", "no"];
  return `<div class=stack>${ks.map(k => `<i class=${k} style="width:${W(o[k])}%"></i>`).join("")}</div>` +
    `<div class=legend>${ks.map(k => `<span><b class=${k}></b>${P(o[k])} ${t("sv.know." + k, KNOW_EN[k])}</span>`).join("")}</div>`;
}

function render() {
  const g = D.groups[`${lens}|${grade}`], all = D.groups["all|all"];
  document.querySelectorAll("#lens button").forEach(b => { const on = b.dataset.v === lens; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  document.querySelectorAll("#grade button").forEach(b => { const on = b.dataset.v === grade; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  $("#nline").textContent = t("sv.n", "{n} respondents · {f} completed the full instrument", { n: nf(g.n), f: nf(g.finished) });
  const few = `<p class=tiny>${t("sv.toofew", "Too few respondents in this group to tabulate.")}</p>`;

  // Why not more schools
  if (!g.reasons) $("#reasons").innerHTML = few; else {
    const r = g.reasons;
    $("#reasons").innerHTML = REASONS.filter(k => k !== "other" || r.other.n !== 0)
      .map(k => row(t("sv.reason." + k, REASON_EN[k]), r[k], k === "hard_to_find" ? "info" : "")).join("") +
      `<p class=tiny>${t("sv.reasons.note", "Shares of the {b} families who answered; {blank}% left the item blank. Only one answer names an information friction: hard to find more schools.", { b: nf(r.base), blank: nf(r.blank_pct, 1) })} ${src()}</p>` +
      gloss("¿Por qué no agregó más instituciones educativas a su postulación? (Marque la razón principal)", "Why did you not add more schools to your application? Mark the main reason.");
  }

  // Knowledge
  if (!g.know_unlisted) $("#know").innerHTML = few; else {
    $("#know").innerHTML = `<div class=sub>${t("sv.know.unlisted", "Nearby public schools they did not list")}</div>${stack(g.know_unlisted)}` +
      `<div class=sub style="margin-top:10px">${t("sv.know.listed", "Schools they listed")}</div>${stack(g.know_listed)}` +
      `<p class=tiny>${t("sv.know.note", "{p} school–family pairs rated for unlisted schools ({r} respondents) and {p2} for listed schools. Each family was shown up to five nearby public schools it had not applied to.", { p: nf(g.know_unlisted.pairs), r: nf(g.know_unlisted.respondents), p2: nf(g.know_listed.pairs) })} ${src()}</p>` +
      gloss("A continuación le mostramos [N] instituciones educativas fiscales a las que no postuló. ¿Qué tan bien cree que conoce a estas instituciones educativas?", "Here are N public schools you did not apply to. How well do you know them?");
  }

  // Beliefs
  if (!g.beliefs) $("#belief").innerHTML = few; else {
    const b = g.beliefs, labs = ["0–25", "26–50", "51–75", "76–90", "91–100"];
    $("#belief").innerHTML = b.bins.map((c, i) => row(labs[i] + "%", c)).join("") +
      `<p class=tiny>${t("sv.belief.note", "Median {m}%; {g} say 80% or more. {b} answered.", { m: nf(b.median, 0), g: P(b.ge80), b: nf(b.base) })} ${src()}</p>` +
      gloss("Usted eligió a [su primera preferencia] en primera preferencia: en una escala del 0 a 100, ¿con qué probabilidad cree que va a obtener un cupo en esa opción?", "On a scale from 0 to 100, how likely is it that you obtain a seat at your first choice?");
  }

  // Were they right (fixed: all matched respondents)
  $("#right").innerHTML = `<table><thead><tr><th>${t("sv.th.stated", "Stated chance")}</th><th class=n>N</th><th class=n>${t("sv.th.mean", "Mean stated")}</th><th class=n>${t("sv.th.placed", "Placed in a listed school")}</th></tr></thead><tbody>` +
    D.calibration.map(c => `<tr><td>${c.bucket.replace("<=", "≤ ")}%</td><td class=n>${nf(c.n)}</td><td class=n>${nf(c.stated)}%</td><td class=n>${nf(c.placed_listed, 1)}%</td></tr>`).join("") + `</tbody></table>` +
    `<table style="margin-top:10px"><thead><tr><th></th><th class=n>N</th><th class=n>${t("sv.th.placed", "Placed in a listed school")}</th><th class=n>${t("sv.th.first", "Got first choice")}</th></tr></thead><tbody>` +
    D.outcomes.map(o => `<tr><td>${t("sv." + OUT_EN[o.group][0], OUT_EN[o.group][1])}</td><td class=n>${nf(o.n)}</td><td class=n>${nf(o.placed_listed, 1)}%</td><td class=n>${nf(o.placed_first, 1)}%</td></tr>`).join("") + `</tbody></table>` +
    `<p class=tiny>${t("sv.right.note", "Linking the survey to the assignment families actually received (99.8% matched): placement in a listed school exceeded 78% at every level of stated confidence, and 72% of single-listers got their one school. Fixed across lenses: all matched respondents.")} ${src("oa")}</p>`;

  // List length
  if (lens !== "all") $("#len").innerHTML = `<p class=tiny>${t("sv.len.byconstruction", "This lens fixes the list length; switch back to all families to see the distribution.")}</p>`;
  else if (!g.list_length) $("#len").innerHTML = few;
  else {
    const l = g.list_length, labs = ["1", "2", "3", "4", "5", "6+"];
    $("#len").innerHTML = l.bins.map((c, i) => row(labs[i], c)).join("") +
      `<p class=tiny>${t("sv.len.note", "Mean list length {m}. {s} listed a single school.", { m: nf(l.mean, 2), s: P(l.bins[0]) })} ${src()}</p>`;
  }

  // Satisfaction
  if (!g.satisfaction) $("#sat").innerHTML = few; else {
    const s = g.satisfaction, labs = ["1–10", "11–15", "16–20"];
    $("#sat").innerHTML = s.bands.map((c, i) => row(labs[i], c)).join("") +
      `<p class=tiny>${t("sv.sat.note", "Rating of the assignment process on Ecuador's 0–20 school scale, asked before results were out. {t} gave 16–20.", { t: P(s.bands[2]) })} ${src()}</p>`;
  }

  // Extended lists (falls back to all families when the group's cells are suppressed)
  const ok = g.extended && g.extended.added.n !== null && g.extended.needed_info_yes.n !== null && g.extended.needed_info_base >= D.meta.min_base;
  const e = ok ? g.extended : all.extended;
  $("#ext").innerHTML = `<div class=big>${nf(e.added.n)}</div>` +
    `<p class=tiny style="font-size:13px;color:#333">${t("sv.ext.body", "families added at least one school to the list they had started. Asked whether they had to look for more information to be persuaded, {y} of the {b} who answered said yes. Search is costly at the margin where lists lengthen, which is one reason discovering options is a different policy lever from acting on preferences.", { y: P(e.needed_info_yes), b: nf(e.needed_info_base) })}${ok ? "" : ` <i>(${t("sv.ext.allfam", "all families")})</i>`} ${src()}</p>`;

  // Who answered (fixed)
  const m = D.meta;
  $("#who").innerHTML = `<p class=tiny style="font-size:13px;color:#333">${t("sv.who.body", "{n} respondents, {pct}% of the pilot's {A} applicants, surveyed after applying and before results. Respondents are mildly positively selected but balanced where it matters:", { n: nf(m.respondents), pct: nf(100 * m.respondents / m.applicants, 0), A: nf(m.applicants) })}</p>` +
    `<table><thead><tr><th></th><th class=n>${t("sv.th.surveyed", "Surveyed")}</th><th class=n>${t("sv.th.notsurveyed", "Not surveyed")}</th></tr></thead><tbody>` +
    D.representativeness.map(r => `<tr><td>${t("sv.rep." + r.key, REP_EN[r.key])}</td><td class=n>${nf(r.surveyed, r.key === "list_length" ? 2 : 1)}</td><td class=n>${nf(r.not_surveyed, r.key === "list_length" ? 2 : 1)}</td></tr>`).join("") +
    `</tbody></table><p class=tiny>${t("sv.who.note", "All standardised differences at most 0.17; balanced on grade. Block deprivation from the 2022 census.")} ${src("oa")}</p>`;
}

function setState(l, gr) {
  lens = l; grade = gr;
  const u = new URL(location.href); u.searchParams.set("lens", lens); u.searchParams.set("grade", grade); history.replaceState(null, "", u);
  render();
}

async function main() {
  D = await fetch("../data/survey_aggregates.json").then(r => r.json());
  const q = new URLSearchParams(location.search);
  if (D.meta.lenses.includes(q.get("lens"))) lens = q.get("lens");
  if (D.meta.grade_keys.includes(q.get("grade"))) grade = q.get("grade");
  $("#lens").addEventListener("click", e => { const b = e.target.closest("button"); if (b) setState(b.dataset.v, grade); });
  $("#grade").addEventListener("click", e => { const b = e.target.closest("button"); if (b) setState(lens, b.dataset.v); });
  window.addEventListener("langchange", render);
  render();
}

i18nInit(); mountToggle("#langtoggle");
const TITLES = { en: "What families said — The Value of Choice", es: "Lo que dijeron las familias — El valor de elegir" };
if (getLang() === "es") document.title = TITLES.es;
window.addEventListener("langchange", e => { document.title = TITLES[e.detail.lang] || TITLES.en; });
main().catch(err => { $("#nline").textContent = t("load.fail", "Could not load data"); console.error(err); });
