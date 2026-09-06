# `data/` — the public data behind the site

Everything here is synthetic, derived or aggregated. No real home location, applicant identifier,
individual survey answer, school name or continuous desirability value appears in any file. The
files are generated in the research repository (`ecuador-cambio-algo/code/7_site/`) and pass
`check_site_data.py` — which compares them against the private inputs — before they are copied here.
Cite the paper when you use them.

Distances are great-circle kilometres; utilities are in **kilometre-equivalents** (the paper's
welfare unit: one unit is what one kilometre of extra travel costs a family with the average taste
for distance).

## `schools.json`
```
{ "note": ..., "schools": [ { "id": "S01", "lat": -0.96424, "lon": -80.69697, "canton": "Manta",
    "grades": { "2": { "seats": 25, "xi_band": 3, "xi_km": 0.0 }, ... } } ] }
```
One entry per school; `grades` has a key for every entry grade the school offers (`2` Preschool 1,
`3` Preschool 2, `4` Primary 1). `seats` are the regular seats offered in the pilot (real).
`xi_band` is the quintile of the school's estimated desirability among in-market schools in that
grade (1 = least desirable fifth, 5 = most); `xi_km` is the value the simulator uses for it, the
band's expected value under N(0, σ_ξ²) with the paper's σ_ξ for that grade. Coordinates are real
(school locations are public facts); ids are anonymised and stable across files.

## `applicants_g2.json`, `applicants_g3.json`, `applicants_g4.json`
```
{ "grade": 2, "name": "Preschool 1",
  "params": { "lam": 3.043, "sxi": 0.529, "seps": 1.016, "sgam": 1.225, "N": 1098, "sib": 0.056 },
  "gamma_cap": 1.0, "eps_scale": 1.0, "gamma_scale": 1.0, "aware": 1.5,
  "schools": ["S01", "S03", ...],                       # the in-market schools of this grade, in column order
  "applicants": [ { "id": "g2-0001", "lat": ..., "lon": ..., "gamma": -1.9122, "K": 2, "M": 2,
                    "sib": null, "rol": ["S56", "S63"], "u": [ ...one value per school in `schools` order... ] } ] }
```
The synthetic families of one grade. `params` are the paper's published estimates from Table 9, the
main specification (not from either robustness table):
sibling premium λ, and the standard deviations of school desirability σ_ξ, idiosyncratic taste
σ_ε and the taste-for-distance heterogeneity σ_γ; `sib` is the sibling rate. Per family: a synthetic
home (drawn uniformly inside a cell of the density grid, never a real point); `gamma`, its draw of
the taste for distance (utility falls by `1 − gamma` per km; capped so that nobody prefers farther);
`K`, the length of its list; `M`, the number of nearest schools it compared when forming the list
(`max(K, 1 + Poisson(aware))`, plus the sibling's school); `sib`, the school where a sibling is
enrolled, or `null`; `rol`, the list it submitted, best first; `ses`, the mean adult schooling of the census blocks in
its 300 m cell where that is published (see below); and `u`, its utility for every
in-market school, from which the browser engine recovers the idiosyncratic ε and re-scales the
parameters without a random-number generator:

    u_ij = xi_j + (−1 + gamma_i) · d_ij + lam · S_ij + eps_ij

## `home_density_cells.json`
```
{ "meta": { "cell_m": 300.0, "min_count": 5, "ses": "...", ... },
  "grids": { "0": [ { "lat": ..., "lon": ..., "n": 7, "ses": 11.4 }, ... ] } }
```
The 300 m grid of applicant homes from which synthetic homes are drawn: cell centres and counts,
cells with fewer than `min_count` households removed. `grids["0"]` is the single pooled grid.
`ses` is the mean years of schooling among adults 25+ in the census blocks of that cell's real
households, the paper's socio-economic proxy; it appears only on cells where at least `min_count`
households carry it, so it is an aggregate of an aggregate. Each synthetic family's `ses` in the
applicant files is the value of the cell it was drawn from.

## `calibration.json`
Synthetic-market moments beside their paper targets: `pooled` (all grades) and `per_grade`
(`dc` distance rule, `da` deferred acceptance, `sic` benchmark, `ttc`: `listed`, `first`, `km`,
`utility`, `assigned`; plus `recovered_share`, `gain_km_da_over_dc`, `nearest_first`, nearest-school
distance percentiles), `targets` (the paper's numbers), and the generator settings (`draws`, `seed`,
`grid`). Rendered on `calibration/`.

## `school_attributes.json`
```
{ "grade": 2, "attributes": [ ...ten names... ], "encoding": {...}, "booleans": [...], "note": ...,
  "model": { "kind": ..., "n": 55, "r2": 0.304, "r2_loo": -0.189, "within1": 0.691, "coef": {...} },
  "schools": [ { "id": "S01", "canton": "Manta", "seats": 25, "band": 3, "raw": {...}, "z": {...},
                 "planner": { "loo": 3.86, "band": 4 } } ] }
```
The ten imagery-derived attributes the paper measures for each in-market Preschool 1 school (raw
values and within-market z-scores; categorical attributes on the documented ordinal scales in
`encoding`), the school's desirability band, and the "planner model": an OLS of the band on the ten
standardised attributes, with its leave-one-out prediction per school. Derived values only; the
imagery itself is not redistributed.

## `survey_aggregates.json`
```
{ "meta": { "respondents": 1873, "completed": 1517, "applicants": 3984, "min_cell": 5, "min_base": 20, ... },
  "groups": { "all|all": {...}, "one|g2": {...}, ... }, "calibration": [...], "outcomes": [...], "representativeness": [...] }
```
Tabulations of the pre-results parent survey for twelve groups, keyed `lens|grade` with lens in
`all` / `one` (listed one school) / `multi` (two or more) and grade in `all` / `g2` / `g3` / `g4`.
Each group carries `n`, `finished`, and — when the group has at least `min_base` respondents —
`list_length`, `reasons`, `know_unlisted`, `know_listed`, `beliefs`, `satisfaction`, `extended`.
Every published cell is `{ "n": count, "pct": share }`; a cell whose count would fall between 1 and
`min_cell − 1` is published as `{ "n": null, "pct": null }`. `calibration` and `outcomes` link
stated beliefs to the realised assignment (all matched respondents); `representativeness` is the
online appendix's surveyed-vs-not table.

## Regenerating
In the research repository: `make_synthetic_manta.py` (schools, applicants, grid, calibration),
`make_school_attributes.py`, `make_survey_aggregates.py`; then `check_site_data.py` must print
`RESULT: CLEAN`; then copy to this directory and run `node engine/test_engine.mjs`. Details in
`HANDOFF.md` §2.
