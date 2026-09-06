# engine.js — the paper's assignment rules, as a standalone ES module

No dependencies, no build step. It is the code behind the site's simulator and story, and it is
validated against the research pipeline's own Python engines (`node engine/test_engine.mjs`:
deferred acceptance and the distance rule identical family by family on one lottery draw per grade;
the stable-improvement-cycles benchmark judged valid by Python).

## Use it from a page

```html
<script type="module">
import { buildMarket, simulate, rescale, withAwareness, familyCard }
  from "https://www.christopher-neilson.com/value-of-choice-ecuador/engine/engine.js";

const base = "https://www.christopher-neilson.com/value-of-choice-ecuador/data/";
const schools = await (await fetch(base + "schools.json")).json();
const apps    = await (await fetch(base + "applicants_g2.json")).json();   // Preschool 1

let market = buildMarket(schools, apps);
let res = simulate(market, { draws: 20, seed: 7 });            // rules: dc (distance rule), da, sic (benchmark)
console.log(res.rules.da.first, res.rules.dc.first, res.gainKmDaOverDc, res.recoveredShare);

market = rescale(market, { seps: 2 * market.base.seps });      // twice the idiosyncratic taste dispersion
market = rescale(withAwareness(market, 3), {});                 // families consider ~3 nearest schools
console.log(familyCard(market, 15, simulate(market).last));    // one family's list and outcomes
</script>
```

Or from Node (`engine/package.json` sets `"type": "module"`):

```bash
node -e "import('./engine/engine.js').then(async e => { const fs = await import('fs'); const s = JSON.parse(fs.readFileSync('data/schools.json')); const a = JSON.parse(fs.readFileSync('data/applicants_g2.json')); console.log(e.simulate(e.buildMarket(s, a)).rules); })"
```

## What it exports

| function | what it does |
|---|---|
| `buildMarket(schools, applicants)` | data → typed arrays: distances, distance orderings, lists, utilities, recovered ε |
| `simulate(market, {draws, seed, rules})` | K lottery draws of the chosen rules; means of the paper's metrics (`listed`, `first`, `km`, `utility`, `assigned`), the recovered share of the DC→benchmark range, and the last draw's assignments |
| `rescale(market, {sxi, seps, sgam, lam})` | new taste parameters → new utilities, lists re-formed inside each family's consideration set |
| `withAwareness(market, aware)` | how many nearest schools each family considers (Poisson mean; `null` = all); call `rescale` after it |
| `withApplicant(market, {lat, lon, list, sib})` | append one more applicant — a visitor with a ranking of their own — competing for the same seats; returns the market with `visitor` set to their index. Add them **last**: their utilities are an ordinal placeholder for the stated order, so `rescale`/`withAwareness` would overwrite it, and `metricsOf().utility` is not meaningful on a market that contains one |
| `familyCard(market, i, last)` | one family's nearest school, list, and outcome under each rule |
| `deferredAcceptance(prefs, score, caps, J)` | applicant-proposing DA; `score` lower = better, ties to the smaller id |
| `distanceRule(market, lot)` | the status quo: DA over distance order, sibling priority, one lottery per family |
| `stableImprovementCycles(mu, prefs, prio, J)` | Erdil–Ergin refinement over the coarse priorities (the constrained-efficient benchmark) |
| `bostonMechanism(prefs, score, caps, J, log)` | immediate acceptance, for the strategy-proofness toy only |
| `metricsOf(market, mu)` | the metrics of one assignment |
| `daStructure(market)` | the deployed preference lists (reported, then appended by distance) and priority classes |
| `haversineKm(...)` | great-circle distance |

Conventions, as deployed in Manta: reported list first, then every other in-market school in distance
order; priority classes sibling 0 < reported 2 < appended 3; one lottery number per (family, school)
uniform on [0, 0.5). Distance rule: all schools in distance order, sibling 0 else 2, one lottery per
family. The benchmark is Erdil–Ergin's stable improvement cycles over the DA outcome, which here
coincides with top trading cycles (paper, Proposition 2).

The same rules, in plain Python and checked against the fixtures, are in the teaching notebook:
`downloads/value_of_choice_teaching.ipynb`.
