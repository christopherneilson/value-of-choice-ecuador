// engine.js — the paper's matching mechanisms, in the browser.
//
// A faithful port of ecuador-cambio-algo/code/2_assignment/matching.py, operating on the
// synthetic Manta published in ../data/ (see the research repo's code/7_site/README.md).
//
//   deferredAcceptance(prefs, score, caps)      applicant-proposing DA; lower score = better
//   stableImprovementCycles(mu, prefs, prio)    Erdil–Ergin refinement over coarse priorities
//   distanceRule(market, lot)                   the status-quo rule: DA over distance order, one lottery per applicant
//   buildMarket(schools, applicants)            data → typed arrays (distances, lists, utilities, ε)
//   rescale(market, params)                     new σξ, σε, σγ, λ → new utilities and re-formed lists
//   simulate(market, options)                   K lottery draws → the paper's headline metrics
//
// Deployed DA: the reported list, then every other in-market school appended in distance order;
// priorities sibling 0 < reported 2 < appended 3; one lottery in [0, 0.5) per (applicant, school).
// Distance rule: all schools in distance order; sibling 0, else 2; one lottery per applicant.
// No dependencies. ES module. Validated by test_engine.mjs against Python-generated fixtures.

export const R_EARTH = 6371.0088;

export function haversineKm(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180;
  const p1 = lat1 * r, p2 = lat2 * r;
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(a));
}

// ------------------------------------------------------------------------------ market
export function buildMarket(schoolsJson, appJson) {
  const grade = String(appJson.grade);
  const ids = appJson.schools;
  const J = ids.length;
  const byId = new Map(schoolsJson.schools.map(s => [s.id, s]));
  const idx = new Map(ids.map((id, j) => [id, j]));
  const sLat = Float64Array.from(ids, id => byId.get(id).lat);
  const sLon = Float64Array.from(ids, id => byId.get(id).lon);
  const caps = Int32Array.from(ids, id => byId.get(id).grades[grade].seats);
  const xi = Float64Array.from(ids, id => byId.get(id).grades[grade].xi_km);
  const apps = appJson.applicants;
  const n = apps.length;
  const aLat = Float64Array.from(apps, a => a.lat);
  const aLon = Float64Array.from(apps, a => a.lon);
  const gamma = Float64Array.from(apps, a => a.gamma);
  const K = Int32Array.from(apps, a => a.K);
  const M = Int32Array.from(apps, a => a.M);
  const sib = Int32Array.from(apps, a => (a.sib ? idx.get(a.sib) : -1));
  const d = new Float64Array(n * J);
  const u = new Float64Array(n * J);
  const distOrder = new Int32Array(n * J);
  const rol = new Array(n);
  const tmp = new Array(J);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < J; j++) {
      d[i * J + j] = haversineKm(aLat[i], aLon[i], sLat[j], sLon[j]);
      u[i * J + j] = apps[i].u[j];
      tmp[j] = j;
    }
    tmp.sort((x, y) => d[i * J + x] - d[i * J + y]);
    for (let j = 0; j < J; j++) distOrder[i * J + j] = tmp[j];
    rol[i] = Int32Array.from(apps[i].rol, id => idx.get(id));
  }
  const P = appJson.params;
  const eps = new Float64Array(n * J);          // ε recovered from the published utilities
  for (let i = 0; i < n; i++)
    for (let j = 0; j < J; j++)
      eps[i * J + j] = u[i * J + j] - xi[j] - (-1 + gamma[i]) * d[i * J + j] - (sib[i] === j ? P.lam : 0);
  return { grade: appJson.grade, name: appJson.name, n, J, ids, sLat, sLon, caps, xi, aLat, aLon,
           gamma, K, M, sib, d, u, eps, distOrder, rol, params: { ...P }, base: { ...P },
           gammaCap: appJson.gamma_cap ?? 1.0 };
}

// New parameters → new utilities, and lists re-formed within each family's consideration set
// (its M nearest schools plus the sibling's), exactly as the generator formed them.
export function rescale(market, p) {
  const { n, J, d, eps, xi, gamma, sib, base, distOrder, K, M, gammaCap } = market;
  const sxi = p.sxi ?? base.sxi, seps = p.seps ?? base.seps, sgam = p.sgam ?? base.sgam, lam = p.lam ?? base.lam;
  const fx = sxi / base.sxi, fe = seps / base.seps, fg = sgam / base.sgam;
  const u = new Float64Array(n * J);
  const rol = new Array(n);
  const cons = [];
  for (let i = 0; i < n; i++) {
    const g = Math.min(gamma[i] * fg, gammaCap);
    for (let j = 0; j < J; j++)
      u[i * J + j] = xi[j] * fx + (-1 + g) * d[i * J + j] + (sib[i] === j ? lam : 0) + eps[i * J + j] * fe;
    cons.length = 0;
    const m = Math.min(M[i], J);
    for (let k = 0; k < m; k++) cons.push(distOrder[i * J + k]);
    if (sib[i] >= 0 && !cons.includes(sib[i])) cons.push(sib[i]);
    cons.sort((x, y) => u[i * J + y] - u[i * J + x]);
    rol[i] = Int32Array.from(cons.slice(0, Math.min(K[i], cons.length)));
  }
  return { ...market, u, rol, params: { sxi, seps, sgam, lam } };
}

// DA structure: prefs[i] = reported list then the rest in distance order; coarse priority per pair.
export function daStructure(market) {
  const { n, J, rol, distOrder, sib } = market;
  const prefs = new Array(n);
  const prio = new Float64Array(n * J);
  const listed = new Uint8Array(J);
  for (let i = 0; i < n; i++) {
    listed.fill(0);
    const p = new Int32Array(J);
    let k = 0;
    for (const j of rol[i]) { p[k++] = j; listed[j] = 1; prio[i * J + j] = 2; }
    for (let q = 0; q < J; q++) { const j = distOrder[i * J + q]; if (!listed[j]) { p[k++] = j; prio[i * J + j] = 3; } }
    if (sib[i] >= 0) prio[i * J + sib[i]] = 0;
    prefs[i] = p;
  }
  return { prefs, prio };
}

// ---------------------------------------------------------------------------- DA
// Applicant-proposing deferred acceptance. `score` is Float64Array(n*J), lower = better; a
// program holds the lowest-score applicants up to capacity, evicting the highest score
// (ties → the smaller applicant id, as in the Python heap). Returns a Map applicant → program
// in the same insertion order the Python dict would have.
export function deferredAcceptance(prefs, score, caps, J) {
  const n = prefs.length;
  const held = Array.from({ length: J }, () => []);
  const assigned = new Map();
  const ptr = new Int32Array(n);
  const queue = new Int32Array(n * (J + 1));   // every applicant proposes at most J times
  let qh = 0, qt = 0;
  for (let i = 0; i < n; i++) queue[qt++] = i;
  while (qh < qt) {
    const a = queue[qh++];
    const pa = prefs[a];
    while (ptr[a] < pa.length) {
      const p = pa[ptr[a]++];
      const c = caps[p];
      if (c <= 0) continue;
      const h = held[p];
      h.push(a);
      assigned.set(a, p);
      if (h.length > c) {
        let w = 0;
        for (let k = 1; k < h.length; k++) {
          const sk = score[h[k] * J + p], sw = score[h[w] * J + p];
          if (sk > sw || (sk === sw && h[k] < h[w])) w = k;
        }
        const worst = h[w];
        h.splice(w, 1);
        if (worst === a) { assigned.delete(a); continue; }
        assigned.delete(worst);
        queue[qt++] = worst;
      }
      break;
    }
  }
  return assigned;
}

// --------------------------------------------------------------------------- SIC
function findCycle(adj) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map(), parent = new Map();
  for (const start of adj.keys()) {
    if ((color.get(start) ?? WHITE) !== WHITE) continue;
    color.set(start, GRAY);
    const stack = [[start, adj.get(start) ?? [], 0]];
    while (stack.length) {
      const top = stack[stack.length - 1];
      const node = top[0], nbs = top[1];
      let advanced = false;
      while (top[2] < nbs.length) {
        const nb = nbs[top[2]++];
        const c = color.get(nb) ?? WHITE;
        if (c === WHITE) {
          color.set(nb, GRAY); parent.set(nb, node);
          stack.push([nb, adj.get(nb) ?? [], 0]);
          advanced = true;
          break;
        }
        if (c === GRAY) {                       // back edge node → nb: a cycle
          const cyc = [node];
          let x = node;
          while (x !== nb) { x = parent.get(x); cyc.push(x); }
          cyc.reverse();
          return cyc;
        }
      }
      if (!advanced) { color.set(node, BLACK); stack.pop(); }
    }
  }
  return null;
}

// Erdil–Ergin (2008): move students along cycles in which each can take the next one's seat
// while being in the top COARSE priority class among that seat's desirers. `prio` must be the
// coarse priority (ties allowed), not the lottery-broken score. Outcomes are not unique when
// several cycles exist; the Python reference and this port may pick different (equally valid)
// ones, which test_engine.mjs checks with Python.
export function stableImprovementCycles(mu0, prefs, prio, J) {
  const mu = new Map(mu0);
  const n = prefs.length;
  const rank = new Int32Array(n * J);
  for (let a = 0; a < n; a++) for (let k = 0; k < prefs[a].length; k++) rank[a * J + prefs[a][k]] = k;
  for (;;) {
    const desirers = new Map();
    for (const [a, p] of mu) {
      const cur = rank[a * J + p];
      const pa = prefs[a];
      for (let k = 0; k < cur; k++) {
        const s = pa[k];
        let arr = desirers.get(s);
        if (!arr) { arr = []; desirers.set(s, arr); }
        arr.push(a);
      }
    }
    const top = new Map();
    for (const [s, ds] of desirers) {
      let best = Infinity;
      for (const a of ds) best = Math.min(best, prio[a * J + s]);
      top.set(s, ds.filter(a => prio[a * J + s] === best));
    }
    const adj = new Map();
    for (const [y, sy] of mu) {
      const t = top.get(sy);
      if (!t) continue;
      for (const i of t) {
        if (i === y) continue;
        let arr = adj.get(i);
        if (!arr) { arr = []; adj.set(i, arr); }
        arr.push(y);
      }
    }
    const cycle = findCycle(adj);
    if (!cycle) return mu;
    const old = cycle.map(x => mu.get(x));
    for (let k = 0; k < cycle.length; k++) mu.set(cycle[k], old[(k + 1) % cycle.length]);
  }
}

// ------------------------------------------------------------------- distance rule
export function distanceRule(market, lot) {
  const { n, J, distOrder, sib, caps } = market;
  const prefs = new Array(n);
  const score = new Float64Array(n * J);
  for (let i = 0; i < n; i++) {
    prefs[i] = distOrder.subarray(i * J, (i + 1) * J);
    for (let j = 0; j < J; j++) score[i * J + j] = (j === sib[i] ? 0 : 2) + lot[i];
  }
  return deferredAcceptance(prefs, score, caps, J);
}

// -------------------------------------------------------------------------- metrics
export function metricsOf(market, mu) {
  const { n, J, d, u, rol } = market;
  let listed = 0, first = 0, km = 0, util = 0, assigned = 0;
  for (let i = 0; i < n; i++) {
    const p = mu.get(i);
    if (p === undefined) continue;
    assigned++;
    km += d[i * J + p]; util += u[i * J + p];
    if (rol[i].includes(p)) listed++;
    if (rol[i][0] === p) first++;
  }
  return { listed: 100 * listed / n, first: 100 * first / n, km: km / assigned, utility: util / assigned, assigned: 100 * assigned / n };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// K lottery draws of the three mechanisms; means over draws, plus the last draw's assignments.
export function simulate(market, { draws = 10, seed = 7, rules = ["dc", "da", "sic"] } = {}) {
  const { n, J, caps, d, rol } = market;
  const rng = mulberry32(seed);
  const { prefs, prio } = daStructure(market);
  const score = new Float64Array(n * J);
  const lotDc = new Float64Array(n);
  const acc = {}; const last = {};
  for (const r of rules) acc[r] = { listed: 0, first: 0, km: 0, utility: 0, assigned: 0 };
  for (let s = 0; s < draws; s++) {
    for (let k = 0; k < n * J; k++) score[k] = prio[k] + rng() * 0.5;
    const out = {};
    if (rules.includes("da") || rules.includes("sic")) out.da = deferredAcceptance(prefs, score, caps, J);
    if (rules.includes("sic")) out.sic = stableImprovementCycles(out.da, prefs, prio, J);
    if (rules.includes("dc")) { for (let i = 0; i < n; i++) lotDc[i] = rng() * 0.5; out.dc = distanceRule(market, lotDc); }
    for (const r of rules) {
      const m = metricsOf(market, out[r]);
      for (const k in m) acc[r][k] += m[k] / draws;
      last[r] = Int32Array.from({ length: n }, (_, i) => out[r].get(i) ?? -1);
    }
  }
  const res = { draws, seed, rules: acc, last };
  if (acc.dc && acc.da && acc.sic) {
    res.recoveredShare = 100 * (acc.da.utility - acc.dc.utility) / (acc.sic.utility - acc.dc.utility);
    res.gainKmDaOverDc = acc.da.utility - acc.dc.utility;
  }
  let nearFirst = 0; const extra = [];
  for (let i = 0; i < n; i++) {
    let jn = 0; for (let j = 1; j < J; j++) if (d[i * J + j] < d[i * J + jn]) jn = j;
    if (rol[i][0] === jn) nearFirst++; else extra.push(d[i * J + rol[i][0]] - d[i * J + jn]);
  }
  res.nearestFirst = nearFirst / n;
  extra.sort((a, b) => a - b);
  res.medianExtraKm = extra.length ? extra[Math.floor(extra.length / 2)] : 0;
  return res;
}
