// market.js — one place for "the market under the current sliders", shared by the page (which needs it
// to draw the map and the family card) and the worker (which needs it to run the lotteries). Both derive
// it from the same base market and the same parameters, so they agree exactly.
import { rescale, withAwareness } from "../engine/engine.js";

// q: { aware (Poisson mean or null = every school), sxi, seps, sgam (multipliers of the estimates), seats (multiplier) }
export function deriveMarket(base, q) {
  let m = base;
  const b = m.base;
  const awareChanged = q.aware !== m.baseAware;
  if (awareChanged) m = withAwareness(m, q.aware);
  if (awareChanged || q.sxi !== 1 || q.seps !== 1 || q.sgam !== 1)
    m = rescale(m, { sxi: b.sxi * q.sxi, seps: b.seps * q.seps, sgam: b.sgam * q.sgam, lam: b.lam });
  if (q.seats !== 1) m = { ...m, caps: Int32Array.from(m.caps, c => Math.max(0, Math.round(c * q.seats))) };
  return m;
}
