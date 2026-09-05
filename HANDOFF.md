# Handoff and roadmap — *The Value of Choice* project website

*Written 2026-09-04. Everything below was built and verified on Chris's machine; commit hashes are
local and unpushed unless stated.*

The website turns the paper's mechanism comparison into something policymakers and students can run
themselves. It has three layers, all done: a **synthetic Manta** generated from the estimated model,
a **browser engine** validated against the research pipeline, and a first **interactive exhibit**.
This document says what exists, how to regenerate and verify each piece, which decisions were taken
and why, what is known to be imperfect, and what to build next in what order.

---

## 1. Where things are

Two repositories. The research repo holds everything private and every generator; the site repo
holds only what can be public.

| | `ecuador-cambio-algo` (research, private) | `value-of-choice-ecuador` (site, private until launch) |
|---|---|---|
| purpose | paper, pipeline, private data, generators | static site served by GitHub Pages |
| site code | `code/7_site/` | `simulator/`, `engine/`, `data/` |
| appendix | `build_public_appendix.py` + `build_public_appendix_content.json` | `appendix/school-imagery/index.html` (built artifact) |
| landing page | `code/7_site/make_landing.py` | `index.html`, `cite.bib`, `value-of-choice-ecuador.pdf` |
| synthetic data | `output/site_data/` (tracked) | `data/` (copy) |
| validation | `code/7_site/make_fixture.py`, `validate_js_sic.py` | `engine/test_engine.mjs`, `engine/fixtures/` |
| preview | `.claude/launch.json` → server `website` (python `http.server` on 8012 serving the site dir) | — |

Recent commits, newest first — site: `2fe23f8` simulator · `cfd1272` engine + data · `2478915`
public-ready landing page, appendix rewrite, privacy check · `d62c4ee` June skeleton. Research:
`eb5eaff` landing generator · `64219c0` fixtures + Python judge · `a04ddcf` synthetic generator ·
`4f9f43d` cover-letter fix, appendix prose recovered and versioned.

**Intended public URL:** `https://christopherneilson.github.io/value-of-choice-ecuador/`.
GitHub Pages serves a private repo only on paid plans; on Free the site repo must be public. It
contains nothing sensitive (see §4).

---

## 2. How to regenerate and verify everything

All commands from the research repo root unless noted. The private data root is set by
`ECUADOR_DATA_ROOT` (currently `C:/Users/chris/ecuador-data-merged`).

### 2.1 Synthetic population (≈1 min)
```
python code/7_site/make_synthetic_manta.py                  # grid homes, aware 1.5, 20 draws, seed 7
python code/7_site/check_site_data.py                       # must print RESULT: CLEAN
python code/7_site/make_fixture.py                          # one lottery draw per grade + Python assignments
```
Copy `output/site_data/{schools,applicants_g2,applicants_g3,applicants_g4,calibration,home_density_cells}.json`
to the site's `data/` and `output/site_data/fixture_g*.json` to `engine/fixtures/`.

Useful variants: `--calibrate 1.0 --aware-list 1 1.5 2 all` sweeps the calibration knob without
writing files (seconds); `--homes kernel` builds from public inputs only; `--scale-n 1.5` is the
congestion dial at generation time; `--skip-ttc` if you only need DA/SIC.

### 2.2 Engine validation (≈2 s)
```
cd <site repo>
node engine/test_engine.mjs                                 # DA and distance rule must be identical for every applicant
cd <research repo>
python code/7_site/validate_js_sic.py <site repo>/engine/fixtures   # Python judges the JS benchmark
```
Expected: `ALL CHECKS PASSED` and `JS SIC VALID`. If DA differs from Python for even one applicant,
the port has drifted — do not ship.

### 2.3 Landing page
`python code/7_site/make_landing.py` reads the manuscript's verified `ABSTRACT_for_portal.txt`,
copies `main_ej.pdf`, and writes `index.html` + `cite.bib` in the site repo. Never hand-edit the
abstract on the site; change the paper and regenerate. The "Last updated" date is a constant in
the script — bump it when regenerating.

### 2.4 Imagery appendix
Edit `build_public_appendix_content.json` (lede, Sections 3–4, disclosures), run
`python build_public_appendix.py` (uses the cached embeddings; `--rebuild` recomputes), copy
`school_images/appendix/public/index.html` over `appendix/school-imagery/index.html`. The builder
refuses to run without the content file; `--placeholder` is for a first scaffold only.

### 2.5 Preview and deploy
Preview: start the `website` server from the launch config (or `python -m http.server 8012
--directory <site repo>`), open `http://localhost:8012/`. Deploy: Settings → Pages → *Deploy from a
branch* → `main` / root; make the repo public. Add a `CNAME` only if a custom domain is wanted, and
then update the URL in `cite.bib`, `index.html` (canonical, `citation_pdf_url`) and README.

---

## 3. What was built, and the decisions behind it

### 3.1 Synthetic Manta (`code/7_site/make_synthetic_manta.py`)
- **Real:** school locations, cantons, per-grade regular seats (in-market programmes, `id_program.csv`
  joined to `ProgramsInfo.csv` and `Vacancies.csv`). Two zero-seat programmes per later grade are kept,
  as the deployed DA keeps them.
- **Published parameters:** λ, σ_ξ, σ_ε, σ_γ from Table 9 (the centred run: 3.043/0.534/1.034/1.273
  for Preschool 1, etc.), list-length histograms, sibling rate and the sibling school's distance rank,
  canton mix from Table 1. *Do not read parameters from `sim_results/*/estimated_parameters_*.csv`* —
  those are the legacy MATLAB run.
- **Desirability ξ_j:** backed out from the posterior-mean utilities behind Table 7 (mean over students
  of u + d − λS, school ordering confirmed against the legacy per-school file at r = 0.85–0.99), then
  **published only as a quintile band**; the simulated value is the band's expected value under
  N(0, σ_ξ²). Nobody gets a continuous quality score. Coordinates are exact and the appendix already
  shows school names, so the band is the only thing anonymised — by design.
- **Homes:** a 300 m density grid of the *estimation sample's* homes (2,372 applicants; cells with
  fewer than five households dropped; 187 cells, 72% coverage); synthetic homes are uniform inside a
  cell, never a real point. Building the grid from all applicants over-dispersed homes (out-of-market
  applicants live farther from in-market schools). Per-grade grids lose too much (Primary 1 keeps 13%).
  `--homes kernel` needs no private input but clusters homes around schools too tightly.
- **Model:** u_ij = ξ_j + (−1+γ_i)d_ij + λS_ij + ε_ij, γ truncated above at 1 (nobody strictly
  prefers farther). Lists: K_i from the empirical histogram, top-K by utility.
- **The one calibrated parameter — awareness.** Drawn over all 55 schools, the model puts the
  nearest school first for ~40% of families against 65% observed; the best of 54 i.i.d. taste draws
  beats a 0.25 km proximity edge. Scaling σ_ε or σ_γ does not fix it without wrecking welfare (sweeps
  in `--calibrate`). A consideration set of the `1 + Poisson(1.5)` nearest schools plus the sibling's
  does, and it is what the paper's survey says families know. With it the synthetic reproduces the
  paper by grade (PS1/PS2/P1): DA first choice 92/58/34 vs 93/58/33; DA listed 95/66/45 vs 96/70/46;
  distance rule 73/46/26 vs 65/43/26; nearest-first 58/63/57 vs 65/63/54; pooled access numbers land
  on the paper's. Full table in `output/site_data/SYNTHETIC_REPORT.md`.
- **Mechanisms** are the pipeline's own (`code/2_assignment/matching.py`): DA over the reported list
  with the rest appended in distance order (priorities sibling 0 < reported 2 < appended 3, one lottery
  per pair), distance rule = DA over distance order with one lottery per applicant, benchmark = Erdil–
  Ergin stable improvement cycles over DA (TTC computed for three draws as a cross-check, Prop. 2).

### 3.2 Engine (`engine/engine.js`)
Dependency-free ES module; `engine/package.json` is `{"type":"module"}` so Node runs it. Ports DA
with the Python heap's tie semantics (evict the highest score, ties to the smaller id) and keeps the
Python dict's insertion order via `Map`, so SIC sees the same structure. Recovers ε per family at load;
`rescale()` re-composes utilities under new σ_ξ/σ_ε/σ_γ/λ and re-forms each list inside the family's
consideration set exactly as the generator did. `simulate()` uses mulberry32 seeded draws. Timings on
the largest grade: DA ≈ 2 ms, SIC ≤ 85 ms, ten draws of all three rules < 0.4 s.

**Validation logic worth understanding.** DA and the distance rule have unique outcomes given the
lottery numbers, so the fixture test demands an exact match (achieved: 2,372/2,372). Stable improvement
cycles are *not* unique — which cycle a DFS finds first depends on iteration order Python and JS
cannot share — so the JS benchmark is judged by the Python engine instead: Pareto-improves DA within
capacity, no justified envy under coarse priorities, no cycle left. It happened to coincide with
Python's outcome for every applicant, but do not rely on that after changes.

### 3.3 Exhibit 1 — "Choose the rule" (`simulator/`)
Leaflet 1.9.4 from unpkg with SRI hashes; **OpenStreetMap standard tiles** (CARTO's free basemap now
requires an API key — that switch happened mid-build). Palette follows the paper: purple distance
rule, teal DA, green benchmark, viridis bands for desirability. Families are coloured by outcome under
the selected rule; a sample of ~160 home→school links is drawn. Ten draws per run, four while a slider
is being dragged; the paper's real-data numbers for the grade sit under the synthetic ones on purpose.
Seats dial scales capacities; the three taste dials multiply Table 9's estimates. Strings are gathered
in `app.js` (`RULE`, `PAPER`, labels in `index.html`) for a later Spanish toggle.

### 3.4 Landing page and appendix
Landing page generated from the portal abstract (206 words), with citation meta tags. Appendix
prose was recovered from the June build byte-for-byte, versioned, and rewritten to the paper's
Section 5 as of `c6223ae`; the rewrite script anchors 19 reused claims to literal substrings of
`main_ej.tex`. Face-blur spot check: all 327 ground-level thumbnails reviewed, no identifiable
person; only low-resolution thumbnails are embedded.

---

## 4. Privacy model, in one place

Never published: real home coordinates, applicant identifiers, per-family survey answers, a
continuous desirability value per school, Google imagery tiles. Published: school locations and
seats (public facts), quintile bands, a 300 m density grid with ≥5 households per cell (a reviewed
decision — switch to `--homes kernel` if the authors prefer no aggregate of real homes at all),
synthetic families, face-blurred project photos, Mapillary and Sentinel-2 imagery under their
licences. `check_site_data.py` re-verifies the first three against the private inputs on every
regeneration; keep it in the loop.

---

## 5. Known gaps and limitations

- Preschool 1 nearest-first is 58% vs 65% observed; the km welfare gain is ~70% of the paper's;
  families who choose a non-nearest school go ~0.25 km out of their way, not 0.6. All three are the
  price of small consideration sets and are documented in `code/7_site/README.md`. They do not affect
  the access story, which is the exhibit's headline.
- **Which sliders move anything.** In the synthetic world σ_ε is the lever: ×0.2 collapses the gain
  from choice (0.48 → 0.10 km, 70% pick their nearest school), ×3 triples it. σ_ξ barely matters
  (identical schools: distance-rule first choice 54.9 → 53.7%) because families compare only their
  ~2.5 nearest schools, where band differences are small next to ε; σ_γ does nothing visible. The
  "Try" cards were written to this, not to the intuition that school differences drive the result
  (the first draft said so and was wrong). Check with the engine before promising an effect in text.
- Primary 1's "share of the range recovered" is not comparable to the paper's 3.9% (a convention-
  dependent, near-undefined ratio there; a well-defined one in the synthetic world). The congestion
  story is told by the first-choice share, which matches.
- **No SES layer.** The census-block GeoPackage (`Blocks_Manta_Census2022_wgs84.gpkg`) is not on this
  machine, so there is no NBI/schooling quintile for the "who gains" map and homes cannot be sampled
  from block populations. When it is available: add a `--blocks` path to the generator, sample homes
  by block population, attach the quintile to each synthetic family.
- The awareness parameter is baked into each family's `M` at generation time. A live awareness slider
  can be done client-side — resample `M_i = max(K_i, 1 + Poisson(aware))` with a seeded RNG and let
  `rescale()` re-form the lists — without regenerating data.
- Tiles: OSM's usage policy is fine for a small academic site; if traffic grows, move to a keyed
  provider (MapTiler, Stadia) or self-hosted tiles.
- The simulator's `simulate()` runs on the main thread; Preschool 2 at ten draws is ~0.4 s, so
  dragging feels slightly sticky. A Web Worker would fix it.
- Mobile layout has only CSS breakpoints and has not been tested on a device; the Leaflet map is not
  keyboard-navigable (default Leaflet behaviour).
- The site repo has `core.autocrlf` on this machine, so Git warns about LF→CRLF; harmless.
- The "Last updated" date in `make_landing.py` is a constant.

---

## 6. Roadmap

Phases are ordered by pedagogical value per hour of work; each item has a definition of done.

### Phase 1 — done
Synthetic Manta · validated engine · "Choose the rule" with the seats dial and three taste dials ·
landing page and appendix publication-ready · privacy checks.

### Phase 2 — the story (next; roughly two weeks of focused work)
1. **Scrollytelling spine** (`story/`). One guided page: most families want the nearest school → but
   28% don't and pay ~0.6 km for it → what a distance rule does to them → what acting on preferences
   does → the algorithm barely matters (DA vs benchmark) → congestion is what matters (seats dial) →
   who gains (needs SES, so a static panel from the paper until Phase 3) → a planner could not have
   guessed (imagery, link to the appendix). Each step drives a small widget built from the simulator's
   pieces (factor `app.js` into `map.js`, `panel.js`, `state.js` first). *Done when* a reader with no
   background reaches the last step understanding why "act on preferences" beats "pick a better
   algorithm", and every number shown is either from the paper (labelled) or from the engine (labelled).
2. **Awareness slider** in the simulator, client-side as described in §5; default 1.5 with the survey's
   knowledge shares quoted beside it. *Done when* dragging it from "nearest only" to "all schools"
   moves nearest-first from ~100% down to ~40% and the welfare gain rises, and the test still passes.
3. **"Walk a mile."** Click a family: its list, distances, sibling link, and where each rule places it,
   with the km-equivalent utility of each outcome. *Done when* a clicked family's panel matches the
   map's colouring under all three rules.
4. **Spanish/English toggle.** Move every string in `simulator/` and `story/` into a `strings.js`
   with `en`/`es`; persist the choice in `localStorage`; translate with a native reviewer (the primary
   audience reads Spanish). *Done when* no English string is visible in the Spanish view.
5. **Go public.** Enable Pages, make the repo public, verify the live URL renders the simulator and
   the appendix, add the URL to the paper's title page or acknowledgments only if the authors want it
   there (it is not there now, deliberately — the submitted PDF says nothing about the site).

### Phase 3 — more lenses (after Phase 2)
6. **Who gains.** Requires the census-block layer. Gains by NBI quintile under the current sliders,
   reproducing the paper's progressivity result on the synthetic population; *done when* the ordering
   of quintile gains matches the paper's at default settings.
7. **"What can a planner see?"** Show a school's photos and derived attributes (from the imagery
   pipeline's `06_attributes.csv`, public-derived values), ask the visitor to guess its band, reveal
   it and the paper's finding that most desirability stays unexplained. Bands only, never names beside
   scores.
8. **Strategy-proofness toy.** A hand-made five-school market with a Boston-mechanism implementation
   added to `engine.js` (not in the pipeline; write and unit-test it), letting a visitor submit a list
   under Boston vs DA and see whether misreporting helps.
9. **Welfare ladder, live.** Figure 6 as an interactive with the NY bands' bundling explained on hover;
   numbers from the paper, no engine.
10. **Survey explorer.** Aggregates already in the online appendix (reasons for short lists, knowledge
    shares, beliefs vs outcomes); no microdata.
11. **Downloads and teaching kit.** `data/` as a documented ZIP, the engine as a standalone module, a
    Colab notebook that reproduces the exhibit's numbers with `matching.py`, and a "the toy reproduces
    the paper" calibration page built from `calibration.json`.

### Phase 4 — hardening
12. CI: a GitHub Action running `node engine/test_engine.mjs` and a link check on every push.
13. Web Worker for `simulate()`; lazy-load `data/` per grade; mobile pass on real devices;
    keyboard access for the map's essential actions; analytics only if privacy-preserving.

---

## 7. Open decisions for the authors
- Publish the density grid (current) or switch to kernel-mode homes (no aggregate of real homes)?
- Show school names on the simulator map? They are already public in the appendix; ids are used now.
- Should the site URL appear in the paper at all, and when — at submission, or once accepted?
- Spanish first, or English first, on the landing page?

## 8. Conventions
Oxford spelling (−ize, but kilometres/neighbourhood/programme), matching the manuscript. Palette from
`code/5_figures/palette.py`. Every number on the site is either labelled "paper" (real data) or comes
from the engine on the synthetic population — never mix them in one sentence without saying which.
Commit messages explain why, not what. Anything regenerated from private data goes through
`check_site_data.py` before it is copied to the site repo.
