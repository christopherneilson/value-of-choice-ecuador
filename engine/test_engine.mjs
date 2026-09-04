// test_engine.mjs — validate engine.js against the Python pipeline's engines.
//   node engine/test_engine.mjs
// For each grade: rebuild the market from data/, feed the fixture's lottery numbers to DA and the
// distance rule (outcomes are unique → must match every applicant), run SIC and check it is a
// valid stable improvement of DA (Python re-checks the JS result in validate_js_sic.py), then run
// a seeded simulation and compare with the generator's calibration numbers.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMarket, daStructure, deferredAcceptance, stableImprovementCycles, distanceRule, simulate, metricsOf } from "./engine.js";

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
}
console.log(`\nRESULT: ${failures ? failures + " FAILURE(S)" : "ALL CHECKS PASSED"}`);
process.exitCode = failures ? 1 : 0;
