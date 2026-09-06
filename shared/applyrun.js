// applyrun.js — one visitor's application, run against the synthetic market under many lotteries.
// Shared by the apply page (main-thread fallback) and the simulator's worker, so both give the same answer.
import { simulate, withApplicant } from "../engine/engine.js";
import { deriveMarket } from "../simulator/market.js";

// q: the simulator's market knobs (aware, sxi, seps, sgam, seats) plus
//    visitor { lat, lon, list, sib }, draws, seed.
// Returns, for each independent lottery, the column index of the school the visitor was given under
// each rule (−1 if unassigned), plus the visitor's distance to every school and the seats on offer.
export function runApplication(base, q) {
  const m = withApplicant(deriveMarket(base, q), q.visitor);
  const me = m.visitor, J = m.J;
  const dc = [], da = [];
  for (let s = 0; s < q.draws; s++) {
    const r = simulate(m, { draws: 1, seed: q.seed + s * 101, rules: ["dc", "da"] });
    dc.push(r.last.dc[me]); da.push(r.last.da[me]);
  }
  return { dc, da, ids: m.ids, J, n: m.n,
           km: Array.from({ length: J }, (_, j) => m.d[me * J + j]),
           caps: Array.from(m.caps),
           listed: Array.from(m.rol[me]) };
}
