// test_engine.mjs — validate engine.js against the Python pipeline's engines.
//   node engine/test_engine.mjs
// For each grade: rebuild the market from data/, feed the fixture's lottery numbers to DA and the
// distance rule (outcomes are unique → must match every applicant), run SIC and check it is a
// valid stable improvement of DA (Python re-checks the JS result in validate_js_sic.py), then run
// a seeded simulation and compare with the generator's calibration numbers.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMarket, daStructure, deferredAcceptance, stableImprovementCycles, distanceRule, simulate, metricsOf, withAwareness, rescale } from "./engine.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const data = p => JSON.parse(fs.readFileSync(path.join(here, "..", "data", p), "utf8"));
const fix = p => JSON.parse(fs.readFileSync(path.join(here, "fixtures", p), "utf8"));
const schools = data("schools.json");
const calib = data("calibration.json");
let failures = 0;
const check = (ok, msg) => { console.log((ok ? "  [ok ] " : "  [XX ] ") + msg); if (!ok) failures++; };

for (const g of [2, 3, 4]) {
  const app = data(`applicants_g${g}.json`);
  const f = fix(`fixture_g${g}.json`);
  const m = buildMarket(schools, app);
  console.log(`\n${m.name}: n=${m.n} J=${m.J}`);
  const { prefs, prio } = daStructure(m);

  // DA with the fixture's lottery numbers
  const score = new Float64Array(m.n * m.J);
  for (let i = 0; i < m.n; i++) for (let j = 0; j < m.J; j++) score[i * m.J + j] = prio[i * m.J + j] + f.lot_da[i][j];
  const t0 = performance.now();
  const muDa = deferredAcceptance(prefs, score, m.caps, m.J);
  const tDa = performance.now() - t0;
  let same = 0; for (let i = 0; i < m.n; i++) if ((muDa.get(i) ?? -1) === f.assign_da[i]) same++;
  check(same === m.n, `DA reproduces Python: ${same}/${m.n} applicants identical (${tDa.toFixed(0)} ms)`);

  // distance rule
  const muDc = distanceRule(m, Float64Array.from(f.lot_dc));
  same = 0; for (let i = 0; i < m.n; i++) if ((muDc.get(i) ?? -1) === f.assign_dc[i]) same++;
  check(same === m.n, `distance rule reproduces Python: ${same}/${m.n} identical`);

  // SIC: validity, plus agreement count with Python's (not necessarily unique) outcome
  const t1 = performance.now();
  const muSic = stableImprovementCycles(muDa, prefs, prio, m.J);
  const tSic = performance.now() - t1;
  const rank = new Int32Array(m.n * m.J);
  for (let a = 0; a < m.n; a++) for (let k = 0; k < m.J; k++) rank[a * m.J + prefs[a][k]] = k;
  let moved = 0, worse = 0; const load = new Int32Array(m.J);
  for (let i = 0; i < m.n; i++) {
    const a = muDa.get(i), b = muSic.get(i);
    if (b !== undefined) load[b]++;
    if (a !== b) { moved++; if (b === undefined || rank[i * m.J + b] > rank[i * m.J + a]) worse++; }
  }
  const overCap = Array.from(load).some((x, j) => x > m.caps[j]);
  same = 0; for (let i = 0; i < m.n; i++) if ((muSic.get(i) ?? -1) === f.assign_sic[i]) same++;
  const pyMoved = f.assign_sic.filter((x, i) => x !== f.assign_da[i]).length;
  check(worse === 0 && !overCap, `SIC is a Pareto improvement of DA within capacity: moved ${moved} (Python moved ${pyMoved}), ${tSic.toFixed(0)} ms`);
  console.log(`       SIC agrees with Python's outcome for ${same}/${m.n} applicants (outcomes need not be unique; Python re-checks validity)`);
  fs.writeFileSync(path.join(here, "fixtures", `js_sic_g${g}.json`),
    JSON.stringify({ grade: g, assign_sic: Array.from({ length: m.n }, (_, i) => muSic.get(i) ?? -1) }));

  // welfare on the fixture draw: SIC utility ≥ DA utility ≥ (typically) DC
  const wDa = metricsOf(m, muDa).utility, wSic = metricsOf(m, muSic).utility, wDc = metricsOf(m, muDc).utility;
  check(wSic >= wDa - 1e-12, `mean utility: DC ${wDc.toFixed(3)}  DA ${wDa.toFixed(3)}  SIC ${wSic.toFixed(3)} km`);

  // seeded simulation vs the generator's 20-draw calibration
  const t2 = performance.now();
  const sim = simulate(m, { draws: 10, seed: 7 });
  const tSim = performance.now() - t2;
  const c = calib.per_grade[m.name];
  const near = (x, y, tol) => Math.abs(x - y) <= tol;
  check(near(sim.rules.da.first, c.da.first, 2.5) && near(sim.rules.da.listed, c.da.listed, 2.5) && near(sim.rules.dc.listed, c.dc.listed, 2.5),
    `10-draw simulation matches Python calibration within 2.5 pts: DA first ${sim.rules.da.first.toFixed(1)} (py ${c.da.first.toFixed(1)}), ` +
    `DA listed ${sim.rules.da.listed.toFixed(1)} (py ${c.da.listed.toFixed(1)}), DC listed ${sim.rules.dc.listed.toFixed(1)} (py ${c.dc.listed.toFixed(1)}) — ${tSim.toFixed(0)} ms`);
  console.log(`       recovered share ${sim.recoveredShare.toFixed(1)}% (py ${c.recovered_share.toFixed(1)}), gain ${sim.gainKmDaOverDc.toFixed(3)} km (py ${c.gain_km_da_over_dc.toFixed(3)}), nearest-first ${(100 * sim.nearestFirst).toFixed(0)}% (py ${(100 * c.nearest_first).toFixed(0)})`);

  // awareness: identity at the generated default, monotone in the slider, lists re-form identically at default
  const mSame = withAwareness(m, m.baseAware);
  let sameM = 0; for (let i = 0; i < m.n; i++) if (mSame.M[i] === m.M[i]) sameM++;
  check(sameM === m.n, `awareness at the generated default reproduces every family's consideration set (${sameM}/${m.n})`);
  const m0 = withAwareness(m, 0), m3 = withAwareness(m, 3), mAll = withAwareness(m, null);
  let mono = true; for (let i = 0; i < m.n; i++) if (!(m0.M[i] <= m.M[i] && m.M[i] <= m3.M[i] && m3.M[i] <= mAll.M[i])) mono = false;
  check(mono, `consideration sets grow monotonically with awareness (0 ≤ default ≤ 3 ≤ all)`);
  const re = rescale(mSame, { ...m.base });
  let sameRol = 0; for (let i = 0; i < m.n; i++) if (re.rol[i].length === m.rol[i].length && re.rol[i].every((j, k) => j === m.rol[i][k])) sameRol++;
  check(sameRol === m.n, `re-forming lists at default parameters reproduces every list (${sameRol}/${m.n})`);
  const sAll = simulate(rescale(mAll, { ...m.base }), { draws: 3, seed: 7 }), s0 = simulate(rescale(m0, { ...m.base }), { draws: 3, seed: 7 });
  check(s0.nearestFirst > sim.nearestFirst && sim.nearestFirst > sAll.nearestFirst,
    `nearest-first falls as awareness rises: ${(100 * s0.nearestFirst).toFixed(0)}% (nearest only) → ${(100 * sim.nearestFirst).toFixed(0)}% (default) → ${(100 * sAll.nearestFirst).toFixed(0)}% (all)`);
}
// A visitor appended to a market: the "apply to school in Manta" page.
{
  const { withApplicant } = await import("./engine.js");
  const g = 4;                                   // the congested grade, where competition bites
  const m0 = buildMarket(schools, data(`applicants_g${g}.json`));
  const home = { lat: m0.aLat[0], lon: m0.aLon[0] };
  const near = k => m0.distOrder[k];             // applicant 0 shares this home, so its row is the visitor's
  const truth = [near(2), near(0), near(1)];     // a real preference: the school next door is not first
  const v = withApplicant(m0, { ...home, list: truth });
  console.log(`\nVisitor applying in ${m0.name}`);
  check(v.n === m0.n + 1 && v.rol.length === m0.n + 1 && v.K[v.visitor] === 3 && v.visitor === m0.n,
    `market grows by exactly one applicant (n ${m0.n} → ${v.n})`);
  let untouched = 0;
  for (let i = 0; i < m0.n; i++)
    if (v.rol[i] === m0.rol[i] && v.sib[i] === m0.sib[i] && v.K[i] === m0.K[i] &&
        v.d[i * m0.J] === m0.d[i * m0.J] && v.u[i * m0.J] === m0.u[i * m0.J]) untouched++;
  check(untouched === m0.n, `every existing family is left untouched (${untouched}/${m0.n})`);

  const roomy = { ...v, caps: Int32Array.from(v.caps, () => 9999) };
  const rr = simulate(roomy, { draws: 1, seed: 3, rules: ["dc", "da"] });
  check(rr.last.da[v.visitor] === truth[0], "with seats for everyone, DA gives the visitor their first choice");
  check(rr.last.dc[v.visitor] === near(0), "the distance rule gives the visitor the nearest school — it never reads the list");

  // Strategy-proofness, on the deployed design: swapping the visitor's top two can only hurt them.
  const tightCaps = Int32Array.from(v.caps, c => Math.max(0, Math.round(c * 0.5)));
  const lie = [truth[1], truth[0], truth[2]];
  const tTruth = { ...v, caps: tightCaps };
  const tLie = { ...withApplicant(m0, { ...home, list: lie }), caps: tightCaps };
  const rankIn = p => { const k = truth.indexOf(p); return k < 0 ? 9 : k; };
  let harmed = 0, differed = 0, helped = 0;
  for (let s = 1; s <= 20; s++) {
    const a = simulate(tTruth, { draws: 1, seed: s, rules: ["da"] }).last.da[v.visitor];
    const b = simulate(tLie, { draws: 1, seed: s, rules: ["da"] }).last.da[v.visitor];
    if (a !== b) differed++;
    if (rankIn(b) > rankIn(a)) harmed++;
    if (rankIn(b) < rankIn(a)) helped++;
  }
  check(helped === 0, `misreporting never helps the visitor under DA: over 20 lotteries it changed the outcome ${differed} times, ` +
    `left them worse off ${harmed} times, better off ${helped}`);
}

// Boston mechanism (toy only): the textbook case where a truthful report is punished.
{
  const { bostonMechanism } = await import("./engine.js");
  // schools A=0, B=1, C=2, one seat each. You=0 (true A>B>C), Ana=1 (A>B>C), Beto=2 (B>A>C).
  // priorities (lower better): at A Ana 0, Beto 1, You 2; at B You 0, Beto 1, Ana 2; at C all equal.
  const J = 3, caps = Int32Array.from([1, 1, 1]);
  const score = Float64Array.from([2, 0, 0.5, 0, 2, 0.5, 1, 1, 0.5]);   // [a*J+p]
  const truthful = [Int32Array.from([0, 1, 2]), Int32Array.from([0, 1, 2]), Int32Array.from([1, 0, 2])];
  const lie = [Int32Array.from([1, 0, 2]), truthful[1], truthful[2]];
  const bT = bostonMechanism(truthful, score, caps, J), bL = bostonMechanism(lie, score, caps, J);
  const dT = deferredAcceptance(truthful, score, caps, J), dL = deferredAcceptance(lie, score, caps, J);
  console.log("\nBoston toy market");
  check(bT.get(0) === 2 && bL.get(0) === 1, `Boston: truthful You gets C (${bT.get(0)}), lying B-first gets B (${bL.get(0)}) — lying pays`);
  check(dT.get(0) === 1 && dL.get(0) === 1, `DA: truthful You gets B (${dT.get(0)}), lying gets B (${dL.get(0)}) — truth is safe`);
  check([...bT.values()].length === 3 && new Set(bT.values()).size === 3, "Boston: everyone seated, no seat double-booked");
}

console.log(`\nRESULT: ${failures ? failures + " FAILURE(S)" : "ALL CHECKS PASSED"}`);
process.exitCode = failures ? 1 : 0;
