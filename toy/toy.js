// toy.js — a three-school market: Boston (immediate acceptance) vs deferred acceptance, with your list as the lever.
import { bostonMechanism, deferredAcceptance } from "../engine/engine.js";
import { t, init as i18nInit, mountToggle, getLang } from "../shared/i18n.js";

const $ = s => document.querySelector(s);
const SCHOOLS = ["A", "B", "C"], J = 3, YOU = 0;
const caps = Int32Array.from([1, 1, 1]);
const names = () => [t("toy.you", "You"), "Ana", "Beto"];
// true preferences (school indices) and priority scores [a*J+p], lower = better
const TRUE = [[0, 1, 2], [0, 1, 2], [1, 0, 2]];
const score = Float64Array.from([2, 0, 0.5, 0, 2, 0.5, 1, 1, 0.5]);
const PRIO_WORDS = () => ({ 0: t("toy.prio.1", "1st"), 1: t("toy.prio.2", "2nd"), 2: t("toy.prio.3", "3rd") });
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
let submitted = [0, 1, 2];

const rankOf = (a, p) => TRUE[a].indexOf(p) + 1;   // 1 = true first choice
const ordinal = r => t(`toy.ord.${r}`, ["", "your 1st choice", "your 2nd choice", "your 3rd choice"][r]);

function run(prefsYou) {
  const prefs = [Int32Array.from(prefsYou), Int32Array.from(TRUE[1]), Int32Array.from(TRUE[2])];
  const log = [];
  const bos = bostonMechanism(prefs, score, caps, J, log);
  const da = deferredAcceptance(prefs, score, caps, J);
  return { bos, da, log };
}

function renderMarket() {
  const N = names(), PW = PRIO_WORDS();
  $("#market").innerHTML = [0, 1, 2].map(a => {
    const prio = SCHOOLS.map((s, p) => {
      // rank of a at school p among the three
      const order = [0, 1, 2].sort((x, y) => (score[x * J + p] - score[y * J + p]) || (x - y));
      return `${s}: ${PW[order.indexOf(a)]}`;
    }).join(" · ");
    return `<tr${a === YOU ? ' class=you' : ""}><td>${N[a]}</td><td>${TRUE[a].map(p => SCHOOLS[p]).join(" › ")}</td><td>${prio}</td></tr>`;
  }).join("");
}

function renderPerms() {
  $("#perms").innerHTML = PERMS.map((p, k) =>
    `<button data-k="${k}" class="${p.join() === submitted.join() ? "on" : ""}">${p.map(x => SCHOOLS[x]).join(" › ")}${p.join() === "0,1,2" ? ` <span class=truth>(${t("toy.truth", "the truth")})</span>` : ""}</button>`).join("");
  $("#perms").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { submitted = PERMS[+b.dataset.k]; renderAll(); }));
}

function renderResults() {
  const N = names();
  const { bos, da, log } = run(submitted);
  const truth = run(TRUE[YOU]);
  const you = (mu) => { const p = mu.get(YOU); return p === undefined ? t("toy.unassigned", "unassigned") : `${SCHOOLS[p]} — ${ordinal(rankOf(YOU, p))}`; };
  const others = (mu) => [1, 2].map(a => `${N[a]}: ${mu.has(a) ? SCHOOLS[mu.get(a)] : "—"}`).join(" · ");
  $("#bos_you").textContent = you(bos); $("#bos_others").textContent = others(bos);
  $("#da_you").textContent = you(da); $("#da_others").textContent = others(da);
  $("#bos_log").innerHTML = log.map(e => {
    const acc = e.accepted.map(a => N[a]).join(", "), rej = e.rejected.map(a => N[a]).join(", ");
    return `<li>${t("toy.log.round", "Round {r}, school {s}: {applied} apply", { r: e.round, s: SCHOOLS[e.school], applied: e.applied.map(a => N[a]).join(", ") })}${acc ? " — " + t("toy.log.accepted", "{who} admitted for good", { who: acc }) : ""}${rej ? "; " + t("toy.log.rejected", "{who} rejected and move to the next school on their list", { who: rej }) : ""}.</li>`;
  }).join("");
  $("#da_log").innerHTML = `<li>${t("toy.da.explain", "Every family proposes to the first school on its list; each school tentatively holds its best applicant and rejects the rest, who propose further down. Nothing is final until no one is rejected — so a school you rank first cannot cost you the schools you rank later.")}</li>`;
  // verdict
  const pB = bos.get(YOU), pBt = truth.bos.get(YOU), pD = da.get(YOU), pDt = truth.da.get(YOU);
  const isTruth = submitted.join() === TRUE[YOU].join();
  let v;
  if (isTruth) {
    v = t("toy.v.truth", "You told the truth. Under Boston you end at <b>{b}</b>; under deferred acceptance at <b>{d}</b>. Now try ranking B first.", { b: SCHOOLS[pBt], d: SCHOOLS[pDt] });
  } else {
    const bBetter = rankOf(YOU, pB) < rankOf(YOU, pBt), bWorse = rankOf(YOU, pB) > rankOf(YOU, pBt);
    const dBetter = rankOf(YOU, pD) < rankOf(YOU, pDt);
    const bPart = bBetter ? t("toy.v.bos.better", "Under Boston this lie <b class=good>paid</b>: <b>{x}</b> instead of the <b>{y}</b> the truth would have given you.", { x: SCHOOLS[pB], y: SCHOOLS[pBt] })
      : bWorse ? t("toy.v.bos.worse", "Under Boston this lie <b class=bad>backfired</b>: <b>{x}</b> instead of the <b>{y}</b> the truth would have given you.", { x: SCHOOLS[pB], y: SCHOOLS[pBt] })
      : t("toy.v.bos.same", "Under Boston this lie changed nothing: <b>{x}</b> either way.", { x: SCHOOLS[pB] });
    const dPart = dBetter ? t("toy.v.da.better", "Under deferred acceptance it did better than the truth — which cannot happen; please report this.", {})
      : (rankOf(YOU, pD) === rankOf(YOU, pDt) ? t("toy.v.da.same", "Under deferred acceptance the truth already gave you <b>{y}</b>, and so does this list — lying gained nothing.", { y: SCHOOLS[pDt] })
      : t("toy.v.da.worse", "Under deferred acceptance the truth would have given you <b>{y}</b>; this list gives you <b>{x}</b> — lying <b class=bad>cost</b> you.", { x: SCHOOLS[pD], y: SCHOOLS[pDt] }));
    v = bPart + " " + dPart;
  }
  $("#verdict").innerHTML = v;
  // all lists
  const bestB = Math.min(...PERMS.map(p => rankOf(YOU, run(p).bos.get(YOU)))), bestD = Math.min(...PERMS.map(p => rankOf(YOU, run(p).da.get(YOU))));
  $("#all").innerHTML = PERMS.map(p => {
    const r = run(p); const rb = rankOf(YOU, r.bos.get(YOU)), rd = rankOf(YOU, r.da.get(YOU));
    const isT = p.join() === "0,1,2";
    return `<tr${isT ? ' class=you' : ""}><td>${p.map(x => SCHOOLS[x]).join(" › ")}${isT ? ` <span class=tiny>(${t("toy.truth", "the truth")})</span>` : ""}</td><td class="${rb === bestB ? "best" : ""}">${SCHOOLS[r.bos.get(YOU)]} (${ordinal(rb)})</td><td class="${rd === bestD ? "best" : ""}">${SCHOOLS[r.da.get(YOU)]} (${ordinal(rd)})</td></tr>`;
  }).join("");
}

function renderAll() { renderMarket(); renderPerms(); renderResults(); }

i18nInit(); mountToggle("#langtoggle");
if (getLang() === "es") document.title = "¿Conviene mentir? — El valor de elegir";
window.addEventListener("langchange", e => { document.title = e.detail.lang === "es" ? "¿Conviene mentir? — El valor de elegir" : "Does lying pay? — The Value of Choice"; renderAll(); });
renderAll();
