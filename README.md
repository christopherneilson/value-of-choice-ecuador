# The Value of Choice in Centralized School Assignment — project website

Public website / online materials for the paper *"The Value of Choice in Centralized School
Assignment: Welfare Gains from Acting on Family Preferences in Ecuador"* (Elacqua, Jacas, Krussig,
Méndez & Neilson). Served as a static site via **GitHub Pages**.

## Structure
```
index.html                          landing page (title, abstract, authors, links)
appendix/
  school-imagery/index.html         interactive online appendix: image types + CLIP embedding map
.nojekyll                           serve raw HTML (skip Jekyll processing)
```

## The appendix is a built artifact
`appendix/school-imagery/index.html` is **generated**, not hand-edited. It is built by
`build_public_appendix.py` in the research repo (`ecuador-cambio-algo`), which has the private
inputs (survey imagery, geoscape runs). The build:
- uses **publishable imagery only** — project-owned ground photos with **faces auto-blurred**
  (OpenCV), **Mapillary** street imagery (CC-BY-SA-4.0), and **Sentinel-2** chips (Copernicus, open);
- shows **no Google tiles** — only Google-*derived* attribute values are reported;
- embeds explanatory text (how imagery connects to the demand estimation) and full source /
  licensing / privacy disclosures, fact-checked against the paper.

To update it: rebuild in the research repo and copy the new `school_images/appendix/public/index.html`
here over `appendix/school-imagery/index.html`.

## Deploy (GitHub Pages)
This repo is **private** for now. To publish:
1. Settings → Pages → Source: *Deploy from a branch* → `main` / root.
2. (Optional) add a `CNAME` file for a custom domain.
3. Make the repo public.

**Before going public:** fill the `[Authors]`/`[Affiliations]`/abstract placeholders on the landing
page; **spot-check the appendix's classroom-interior gallery** (automated face-blur is best-effort);
add the paper PDF / BibTeX / code links.

## Licensing
Mixed by asset — see the in-page disclosures in each appendix. Mapillary imagery is CC-BY-SA-4.0;
Sentinel-2 is Copernicus open data; ground photographs are the project's own (faces blurred);
derived attributes are the authors'. No proprietary Street View / satellite tiles are redistributed.
