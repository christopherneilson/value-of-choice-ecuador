// simjobs.js — run a batch of simulations in the simulator's worker (off the main thread), falling back
// to the main thread when a module worker cannot start. Each job is { seats, sxi, seps, sgam, aware, draws, seed }
// with the simulator's meanings (multipliers of the estimates; omitted = as estimated).
import { simulate } from "../engine/engine.js";
import { deriveMarket } from "../simulator/market.js";

const norm = (base, j) => ({ aware: j.aware === undefined ? base.baseAware : j.aware, sxi: j.sxi ?? 1, seps: j.seps ?? 1, sgam: j.sgam ?? 1,
                             seats: j.seats ?? 1, draws: j.draws ?? 10, seed: j.seed ?? 7,
                             rules: j.rules ?? ["dc", "da", "sic"], perFamily: !!j.perFamily });

export function runJobs(schools, apps, base, jobs, { useWorker = true } = {}) {
  const grade = apps.grade;
  const onMain = () => {
    const out = {};
    for (const [k, j] of Object.entries(jobs)) {
      const q = norm(base, j);
      out[k] = simulate(deriveMarket(base, q), { draws: q.draws, seed: q.seed, rules: q.rules, perFamily: q.perFamily });
    }
    return out;
  };
  if (!useWorker || typeof Worker === "undefined" || new URLSearchParams(location.search).get("worker") === "0") return Promise.resolve(onMain());
  return new Promise(resolve => {
    let worker;
    const fail = () => { try { worker && worker.terminate(); } catch (e) { /* ignore */ } resolve(onMain()); };
    try { worker = new Worker(new URL("../simulator/sim.worker.js", import.meta.url), { type: "module" }); } catch (e) { return fail(); }
    const keys = Object.keys(jobs), out = {}; let left = keys.length;
    worker.onerror = fail;
    worker.onmessage = e => {
      const d = e.data;
      if (d.type === "error") return fail();
      if (d.type !== "result") return;
      out[keys[d.id]] = d.res;
      if (--left === 0) { worker.terminate(); resolve(out); }
    };
    worker.postMessage({ type: "load", grade, schools, apps });
    keys.forEach((k, id) => worker.postMessage({ type: "run", id, grade, ...norm(base, jobs[k]) }));
  });
}
