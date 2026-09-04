# The Value of Choice in Centralized School Assignment — project website

Public website / online materials for the paper *"The Value of Choice in Centralized School
Assignment: Welfare Gains from Acting on Family Preferences in Ecuador"* (Elacqua, Jacas, Krussig,
Méndez & Neilson). Served as a static site via **GitHub Pages** at
<https://christopherneilson.github.io/value-of-choice-ecuador/>.

## Structure
```
index.html                          landing page: title, authors, JEL, abstract, links, appendix card
value-of-choice-ecuador.pdf         the paper (the named build submitted to the journal)
cite.bib                            BibTeX for the working paper
appendix/
  school-imagery/index.html         interactive online appendix: image types + CLIP embedding map
.nojekyll                           serve raw HTML (skip Jekyll processing)
```

`index.html` is generated from the manuscript's verified portal abstract by `make_landing.py`
(research repo); do not hand-edit the abstract here — change it in the paper and regenerate.

## The appendix is a built artifact
`appendix/school-imagery/index.html` is **generated**, not hand-edited. It is built by
`build_public_appendix.py` in the research repo (`ecuador-cambio-algo`), which has the private
inputs (survey imagery, geoscape runs). The build:
- uses **publishable imagery only** — project-owned ground photos with **faces auto-blurred**
  (OpenCV), **Mapillary** street imagery (CC-BY-SA-4.0), and **Sentinel-2** chips (Copernicus, open);
- shows **no Google tiles** — only Google-*derived* attribute values are reported;
- embeds explanatory text (how imagery connects to the demand estimation) and full source /
  licensing / privacy disclosures, fact-checked against the paper.

**Where the prose lives:** `ecuador-cambio-algo/build_public_appendix_content.json` (tracked in git,
next to the builder). The builder refuses to run without it — the placeholder fallback that once
silently overwrote a finished build is gone (`--placeholder` re-enables it for a first scaffold
only). Sections 3 and 4 of that file are kept in step with the paper's Section 5 (measurement)
and must be re-read whenever those paragraphs change.

To update the appendix: edit the content JSON, run `python build_public_appendix.py` in the research
repo (uses the cached embeddings; `--rebuild` recomputes them), and copy
`school_images/appendix/public/index.html` here over `appendix/school-imagery/index.html`.

## Pre-publication checks (done 2026-09-04)
- Landing page: abstract, JEL codes, PDF, BibTeX and data-availability wording match the submitted
  manuscript; no placeholders remain.
- Appendix text: reconciled with the paper's Section 5 as of commit `c6223ae` (the measurement work
  made load-bearing) — building footprint and count as the robust attributes, the random-coefficient
  and drive-time results included, and the "exploratory / conclusions do not depend on them"
  framing retired.
- Face-blur spot check: every ground-level thumbnail (classroom interiors, sports courts, facades,
  exteriors, murals — 327 images) reviewed on contact sheets; no identifiable person. The page
  embeds only these low-resolution thumbnails, so the lightbox has nothing sharper to show.

## Deploy (GitHub Pages)
1. Settings → Pages → Source: *Deploy from a branch* → `main` / root.
2. (Optional) add a `CNAME` file for a custom domain and update the URL in `cite.bib`,
   `index.html` (`canonical` and `citation_pdf_url`) and this README.
3. Make the repo public.

## Licensing
Mixed by asset — see the in-page disclosures in each appendix. Mapillary imagery is CC-BY-SA-4.0;
Sentinel-2 is Copernicus open data; ground photographs are the project's own (faces blurred);
derived attributes are the authors'. No proprietary Street View / satellite tiles are redistributed.
