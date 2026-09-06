// sim.worker.js — runs the lotteries off the main thread so sliders and the map never freeze.
// Module worker: same engine, same market derivation as the page (market.js). Protocol:
//   page → worker  { type: "load", grade, schools, apps }                       build a grade's market
//   page → worker  { type: "run", id, grade, aware, sxi, seps, sgam, seats, draws, seed, rules? }
//   page → worker  { type: "apply", id, grade, ...knobs, visitor, draws, seed }  one visitor applies
//   worker → page  { type: "loaded", grade } | { type: "result", id, res }
//                | { type: "applied", id, out } | { type: "error", id, message }
import { buildMarket, simulate } from "../engine/engine.js";
import { deriveMarket } from "./market.js";
import { runApplication } from "../shared/applyrun.js";

const markets = {};

self.onmessage = e => {
  const q = e.data;
  if (q.type === "load") {
    markets[q.grade] = buildMarket(q.schools, q.apps);
    self.postMessage({ type: "loaded", grade: q.grade });
    return;
  }
  if (q.type === "run") {
    try {
      const base = markets[q.grade];
      if (!base) throw new Error(`grade ${q.grade} not loaded in the worker`);
      const m = deriveMarket(base, q);
      const res = simulate(m, { draws: q.draws, seed: q.seed, rules: q.rules ?? ["dc", "da", "sic"] });
      self.postMessage({ type: "result", id: q.id, res }, Object.values(res.last).map(a => a.buffer));
    } catch (err) {
      self.postMessage({ type: "error", id: q.id, message: String(err && err.message || err) });
    }
    return;
  }
  if (q.type === "apply") {
    try {
      const base = markets[q.grade];
      if (!base) throw new Error(`grade ${q.grade} not loaded in the worker`);
      self.postMessage({ type: "applied", id: q.id, out: runApplication(base, q) });
    } catch (err) {
      self.postMessage({ type: "error", id: q.id, message: String(err && err.message || err) });
    }
  }
};
