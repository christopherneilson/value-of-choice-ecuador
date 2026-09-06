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

**Live since 2026-09-04 at `https://www.christopher-neilson.com/value-of-choice-ecuador/`.** The
site repo is public and Pages deploys from `main` / root; because the user site
(`christopherneilson.github.io`) carries the custom domain `www.christopher-neilson.com` with HTTPS
enforced, project pages are served under it, and `christopherneilson.github.io/value-of-choice-ecuador/`
redirects there. Every push to `main` redeploys in about 30 s. The repo contains nothing sensitive
(see §4).

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

Two further data files have their own generators, run the same way (generate → `check_site_data.py`
→ copy to `data/`): `python code/7_site/make_school_attributes.py` (planner game) and
`python code/7_site/make_survey_aggregates.py` (survey explorer).

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
--directory <site repo>`), open `http://localhost:8012/`. Deploy: already configured — Pages builds
`main` / root on every push (about 30 s; `gh api repos/christopherneilson/value-of-choice-ecuador/pages/builds/latest`
shows the status). The public URL is a constant, `BASE`, in `code/7_site/make_landing.py` (research
repo); if the domain ever changes, change it there, regenerate, and update README and this file.

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
licences, per-school imagery-derived attributes (never the imagery), and survey *tabulations* (no
group below 20 respondents, no count between 1 and 4). `check_site_data.py` re-verifies all of this
against the private inputs on every regeneration; keep it in the loop.

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
- **The socio-economic layer is a cell average, and the gradient it produces is flat.** Synthetic
  families inherit the mean block schooling of their 300 m cell, so there is no within-cell variation,
  and because tastes are drawn independently of location the model reproduces the paper's *incidence*
  but not its *progressivity* (roadmap item 6 has the numbers and the reason). The census-block
  GeoPackage (`Blocks_Manta_Census2022_wgs84.gpkg`) is still absent, so homes cannot be sampled from
  block populations and no household-level measure exists.
- The awareness parameter is baked into each family's `M` at generation time. A live awareness slider
  can be done client-side — resample `M_i = max(K_i, 1 + Poisson(aware))` with a seeded RNG and let
  `rescale()` re-form the lists — without regenerating data.
- Tiles: OSM's usage policy is fine for a small academic site; if traffic grows, move to a keyed
  provider (MapTiler, Stadia) or self-hosted tiles.
- Mobile layout has CSS breakpoints and passes a headless 375 px sweep (no overflow, no console
  errors on any page) but has not been tested on a real device. The Leaflet map's markers are canvas
  circles and cannot take focus; keyboard users reach a family through the family-number field.
- The site repo has `core.autocrlf` on this machine, so Git warns about LF→CRLF; harmless.
- The "Last updated" date in `make_landing.py` is a constant.

---

## 6. Roadmap

Phases are ordered by pedagogical value per hour of work; each item has a definition of done.

### Phase 1 — done
Synthetic Manta · validated engine · "Choose the rule" with the seats dial and three taste dials ·
landing page and appendix publication-ready · privacy checks.

### Phase 2 — the story (next; roughly two weeks of focused work)
1. **Scrollytelling spine** (`story/`). *Done 2026-09-04.* Nine steps (setting → most want the nearest
   school but a quarter don't → the distance rule → acting on preferences → the algorithm barely
   matters → seats are what matter, with a live sweep chart → who gains, quoting the paper's quartile
   gains → could a planner have guessed → try it), a sticky map + readout driven by the engine
   (Preschool 1; scenarios precomputed on load, ~2 s), every number labelled *engine, synthetic* or
   *paper, real data*. `story/story.js` duplicates the simulator's map rendering rather than sharing a
   module — factor `simulator/app.js` and `story/story.js` into a shared `render.js` when the next
   exhibit needs it. Gotcha recorded in the code: SVG built via `innerHTML` needs quoted attributes
   and explicit closing tags. Still owed: the "who gains" step shows no synthetic map colouring until
   the SES layer exists (Phase 3, item 6).
2. **Awareness slider.** *Done 2026-09-04.* `withAwareness()` in the engine gives each family a uniform
   inside the CDF bin of its generated Poisson draw, so consideration sets are monotone in the slider
   and reproduce the generated sets exactly at the default (tested). Nearest-first runs 79% → 58% → 39%
   in Preschool 1 from "the nearest few" to "every school". Semantics worth knowing: at the default
   awareness the published list is ground truth (returned untouched at Table 9 tastes; listed schools
   stay in the known set when only tastes move); away from it the known set is exactly the M nearest
   schools plus the sibling's. Utilities ship at 3 decimals, so `rescale()` breaks ties toward the
   published list, then distance.
3. **"Walk a mile."** *Done 2026-09-04.* Click any family (or `?family=N`, 1-based): its list with
   distances, nearest school, sibling link, schools known, and where each rule places it on the last
   draw with the shortfall from its first choice in km-equivalent; dashed line to the first choice,
   solid lines per rule. Family 16 is the showcase (170 m from a school, wants one 590 m away, fourth
   choice under the distance rule, first under DA). `familyCard()` in the engine supplies the numbers.
4. **Spanish/English toggle.** *Built 2026-09-04; Spanish needs a native review before it becomes the
   default.* `shared/i18n.js`: English stays in markup and code, Spanish is a keyed override table;
   `data-i18n` attributes translate static text (`applyStatic()` caches the English innerHTML and swaps),
   `t(key, english, vars)` translates dynamic strings, `nf()` formats numbers per locale (es: comma
   decimals, dot thousands). Language comes from `?lang=`, then `localStorage` (`voc.lang`), then the
   browser; `mountToggle()` adds EN/ES to every header and `init()` propagates `?lang=es` to same-site
   links. Covers the landing page (including an unofficial translation of the abstract, flagged as such),
   the simulator and the story; `<title>`s switch; the toggle re-renders live. Verified: no English UI
   string left in the Spanish view of any page, toggle round-trips, numbers reformat. Grade names use
   the Ecuadorian forms (Inicial 1 (3 años), Inicial 2 (4 años), Primero de básica) and "cupos" for
   seats. Not translated: the paper's title, author names, the imagery appendix (built artifact), the
   PDF. To add a string: put English in the markup/code and one `"key": "español"` line in `ES`.
5. **Go public.** *Done 2026-09-04*: repo public, Pages on `main`/root, HTTPS enforced, landing page,
   simulator and appendix verified live. Still open: whether to add the URL to the paper's title page
   or acknowledgments (it is not there now, deliberately — the submitted PDF says nothing about the
   site).

### Phase 3 — more lenses (after Phase 2)
6. **Who gains.** *Done 2026-09-05* (`gains/`), and the *done when* it was written with — "the ordering
   of quintile gains matches the paper's" — turned out to be the wrong test. See below.
   The census-block GeoPackage is still missing, but it was never needed: `output/tables/family_ses.csv`
   (the cached output of `code/1_data_prep/family_ses.py`, 3,771 of 3,984 applicants) already carries
   each applicant's block-level mean adult schooling. `build_density_grid` now averages it within each
   300 m cell and publishes it as `ses` on cells that hold at least `min_count` households, and every
   synthetic family inherits the value of the cell it was drawn from. Adding it did **not** disturb the
   population: the draw order is preserved, and `applicants_g*.json` is byte-identical apart from the
   new field.
   The page runs the engine live with `simulate(..., {perFamily: true})` (new) over 30 draws and shows
   each family's `u(DA) − u(DC)`: a map of winners, losers and the untouched, a second colouring by
   neighbourhood schooling, a scatter with decile and quartile means, and the incidence table beside
   the paper's.
   **The result to know about.** The incidence reproduces well: 53.8% gain against the paper's 51.8%,
   33.0% unaffected against 31.1%, 13.2% lose against 17.1%. The *gradient does not*: lowest-minus-
   highest quartile is +0.04 km here (±0.14) against +0.196 km in the paper, and it is flat in every
   grade (g3 +0.01 ± 0.13, g4 +0.25 ± 0.32; correlations of SES with gain −0.03, −0.00, −0.05). That
   is expected and the page says so plainly: the generator draws every family's tastes and list length
   independently of where it lives, so the only channel from status to gain is geography, and geography
   alone produces nothing measurable. The paper's gradient is estimated on real families and says they
   gain more than geography alone predicts — the part a status-blind model cannot invent. **Do not
   "fix" this by tuning the generator**; a gradient manufactured that way would be an artefact.
   If the GeoPackage does reappear, the useful upgrade is sampling homes from block populations and
   attaching a household-level measure, not forcing the gradient.
7. **"Could a planner have guessed?"** *Done 2026-09-05* (`planner/`). Ten rounds: a real in-market
   school's ten imagery-derived attributes (bars relative to the market, raw values beside), guess its
   band, reveal, then a summary against a "planner model" (OLS of band on the ten attributes,
   leave-one-out) and against always guessing the middle. Data from
   `code/7_site/make_school_attributes.py` → `data/school_attributes.json` (anonymised ids, bands,
   raw + standardized attributes, model predictions; the privacy checker covers it). Two honest
   caveats recorded in the file's `note`: the estimation's own encoded design matrix
   (`X_Manta_imagery.csv`) is not on this machine, so the six categorical attributes use the site's
   documented ordinal scales; and the planner model's fit is R² 0.30 in-sample, **negative
   leave-one-out**, 69% within one band vs 60% for the middle band — which is the paper's point, and
   the page says so. Coefficient signs agree with Table 14 (footprint +0.61, count −0.43).
8. **Strategy-proofness toy.** *Done 2026-09-05* (`toy/`). Three schools, one seat each; you (true
   A › B › C) against Ana (sibling at A) and Beto; `bostonMechanism()` added to the engine (toy only,
   not in the pipeline) with a round log and a unit test of the textbook case: truthful Boston sends
   you to C, ranking B first gets B; under DA the truth already gets B and no list beats it. The page
   shows both mechanisms' outcomes, the Boston rounds, a verdict, and every one of the six lists.
9. **Welfare ladder, live.** *Done 2026-09-05* (`ladder/`). Figure 6 as two stacked bars on a
   common scale from the figure code's own numbers (NY 6.69/8.54/0.62/3.11 of 18.96 miles; Manta
   levels −0.1036/0.5832/0.5857/0.6807 km-eq.), click a band for what it can and cannot attribute.
   No engine; every number labelled paper or AAP (2017).
10. **Survey explorer.** *Done 2026-09-05* (`survey/`). The pre-results parent survey as aggregates
    sliced by two lenses — application-list length (all / one school / two or more) × entry grade —
    with eight cards: reasons for not listing more (the one information-friction answer highlighted),
    knowledge of unlisted vs listed schools (stacked bars), beliefs, beliefs vs realised assignment
    (fixed: the join tables), list length, satisfaction, the 69 families who extended their lists, and
    representativeness. Verbatim Spanish question under each card (English gloss in the English view).
    `?lens=&grade=` presets. Data: `data/survey_aggregates.json` from the research repo's
    `code/7_site/make_survey_aggregates.py` (needs `output/tables/survey_clean_dataSurvey.csv`, the
    MATLAB export, and `survey_validation/join_*.csv`); disclosure rule: no group tabulated below 20
    respondents and no published count between 1 and 4 (cells show "n<5"), enforced by
    `check_site_data.py`. Only tabulations that appear in the paper or its online appendix are shown,
    plus one companion (knowledge of *listed* schools, 55% "know well"); two survey items that are
    *not* in the paper were deliberately left out — see §7.
11. **Downloads and teaching kit.** *Done 2026-09-05.* `downloads/` lists every reusable file with
    what it contains (the ZIP is GitHub's archive of the repo, always current, so nothing to rebuild);
    `data/README.md` documents every file field by field; `engine/README.md` documents the module
    (import from the site URL or Node). The notebook `downloads/value_of_choice_teaching.ipynb` is
    built and executed by `python tools/make_notebook.py --execute` (nbformat + jupyter; standard
    library only inside the notebook): it re-implements DA in fifteen lines, reproduces the fixture
    assignment for all 1,098 entry-grade families under both rules, recovers the simulator's 20-draw
    numbers to lottery noise, then runs the congestion (−30% seats) and proximity-only exercises (the
    value of choice falls from +0.48 to +0.01 km-eq when lists are nearest-first by construction) and
    ends with four open exercises. It reads local files when run inside the repo, the live site
    otherwise (Colab link on the page). `calibration/` renders `data/calibration.json` beside the
    paper's targets, green/red by tolerance; the per-grade paper access numbers (65/43/26, 96/70/46,
    93/58/33, gains 0.686/0.354/0.012) now live in the generator's `TARGETS` so the page has no
    hand-typed numbers. Committed with outputs so GitHub renders the run.

### Phase 4 — hardening
12. CI: *Done 2026-09-05.* `.github/workflows/test.yml` runs `node engine/test_engine.mjs` and
    `node tools/check_links.mjs` (every local href/src in the HTML must resolve; scripts and styles
    are stripped first because the appendix's template literals look like links) on every push and PR.
13. *Done 2026-09-05, except the two items that need a person or a decision.* The lotteries run in a
    module worker (`simulator/sim.worker.js`; `simulator/market.js` is the one derivation of "the
    market under the current sliders", shared by page and worker so both agree exactly; results are
    identical to the main-thread path, which `?worker=0` forces and which is the automatic fallback
    if the worker cannot start). The story's twelve scene simulations go through the same worker via
    `shared/simjobs.js`, so the page renders before they finish. Grades load on demand (the entry
    grade at start; ~0.7 MB less on first paint). Keyboard: a family-number field in "Follow one
    family" (the canvas markers are not focusable), `aria-pressed` on every toggle group here and in
    the survey explorer, `aria-live` on the headline and the family card; sliders are native. Mobile:
    every page checked headlessly at 375 px for horizontal overflow and console errors (the
    calibration tables now scroll inside their card); **not yet on a real device**. Analytics: none,
    by default — an author decision (§7).

### Phase 5 — first person
14. **"Apply to school in Manta."** *Done 2026-09-05* (`apply/`). The visitor puts a home on the map
    (click, or a draw from the published density grid), picks a grade, ranks the schools around it and
    hands the list in. `withApplicant()` (engine) appends them to the market as applicant *n*, and
    `shared/applyrun.js` runs 25 independent lotteries of both rules on the result, in the simulator's
    worker. The page reports which of *their* choices each rule gave them, the distribution over the 25
    draws, and three follow-ups: run the lottery again (risk is seats, not the algorithm), swap the top
    two (it costs first choices and buys no extra safety — strategy-proofness, measured), and let every
    family know every school (awareness as competition). `?lat=&lon=&grade=&list=&seed=&sib=` makes any
    application a shareable link, and reloading one re-runs it.
    *The one modelling choice worth knowing:* a visitor states an **order, not a scale**, so their
    utility vector is an ordinal placeholder and the page never prints a welfare number for them, only
    which choice they got. Never read `metricsOf().utility` off a market that contains a visitor, and
    always add the visitor **last** — `rescale()` and `withAwareness()` would recompute their utilities
    from ξ, γ and ε and throw the stated order away. The engine test covers all of this: the market
    grows by exactly one, every existing family is untouched, with slack seats DA gives the visitor
    their first choice while the distance rule gives them their nearest, and over twenty lotteries a
    swapped top two never helps.
15. **Social preview images.** *Done 2026-09-05.* `python tools/make_og.py` renders eleven 1200×630
    cards into `og/` (Playwright on the installed Edge, the same tool the verification scripts use) and
    rewrites the `<!-- og:start … og:end -->` block in every hand-written page's head; `index.html` and
    the imagery appendix carry their own copy of that block, written by their generators, and the
    script checks both are present and point at a card that exists. The cards share one motif, the real
    school locations of Manta as a tinted dot field, so a shared link is recognisably from this site.
    The PNGs are committed — nobody needs Playwright to serve the site. Rerun the script after adding
    or renaming a page; its `PAGES` table is where a page's share title and one-line description live.
16. **A landing hero.** *Done 2026-09-05* (`hero.js`, markup and CSS in `make_landing.py`). Above the
    abstract, the same market under both rules, cross-fading every 3.6 s: each dot is a family, filled
    in the rule's colour when it is placed in a school it asked for and grey when it is not, with a
    faint line to the school it got; schools are hollow rings so the colour belongs to the families.
    The caption follows the picture — 53% under the distance rule, 76% under deferred acceptance — and
    the note gives the paper's own 50% and 78% beside them. Clicking a rule takes control and stops the
    loop; `prefers-reduced-motion` shows deferred acceptance and never animates. It ships
    `data/hero_lines.json` (19 KB, one lottery draw of all three grades, 560 families sampled, from
    `node tools/make_hero.mjs`) rather than the market and the engine, so the front door stays light.
    Regenerate it whenever `data/` changes.

---

## 7. Open decisions for the authors
- Publish the density grid (current) or switch to kernel-mode homes (no aggregate of real homes)?
- Show school names on the simulator map? They are already public in the appendix; ids are used now.
- Should the site URL appear in the paper at all, and when — at submission, or once accepted?
- Spanish first, or English first, on the landing page?
- Analytics? None are installed. If wanted, a cookie-less, self-hosted counter (Plausible, GoatCounter)
  keeps the "nothing identifies a visitor" promise; anything Google-hosted would need a banner.
- A licence for the downloads. `downloads/` says "cite the paper" and nothing more; CC BY 4.0 for the
  synthetic data, derived attributes and survey tabulations, and MIT for `engine/`, would be the
  conventional choice. Until one is stated, reuse rests on the page's wording.
- Two survey items are tabulated nowhere in the paper and were kept off the site until the authors
  decide: (a) "if you added more schools, what do you think would happen?" — 69% of those answering
  ticked "lowers my chance at my first preferences" (1,057 of 1,532), which is false under deferred
  acceptance and would read as a strategy-proofness misperception; (b) "which information would you
  have liked to have?" (admission chances, achievement, applicants, seats, shift). Both are one line
  in `make_survey_aggregates.py` away, but (a) in particular touches the paper's short-list argument
  and should be framed in the paper before it is framed on the site.

## 8. Conventions
Oxford spelling (−ize, but kilometres/neighbourhood/programme), matching the manuscript. Palette from
`code/5_figures/palette.py`. Every number on the site is either labelled "paper" (real data) or comes
from the engine on the synthetic population — never mix them in one sentence without saying which.
Commit messages explain why, not what. Anything regenerated from private data goes through
`check_site_data.py` before it is copied to the site repo.
