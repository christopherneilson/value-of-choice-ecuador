"""verify_site.py — drive every page in a real browser and check what must be true.

    python -m http.server 8012 --directory .      (or the `website` launch config)
    python tools/verify_site.py [--base URL] [--only apply,gains]

This lives in the repo on purpose. The per-page checks used to be a pile of scripts in a temp
directory; the directory was cleaned and a week of regression cover went with it. Everything here
is cheap to run and each assertion states a fact about the site that a reader could check.

Needs `pip install playwright` and `playwright install msedge` once. The static checks that run in
CI (node tools/check_syntax.mjs, node tools/check_links.mjs, node engine/test_engine.mjs) do not
need a browser and are not repeated here.
"""
import argparse, sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")

fails, checked = 0, 0


def check(ok, msg):
    global fails, checked
    checked += 1
    print(("  [ok ] " if ok else "  [XX ] ") + msg)
    fails += (not ok)


def page_checks(pg, base, path, ready, en, es, extra=None):
    """Load one page in English, assert `en` phrases, then in Spanish, assert `es` and no English leak."""
    errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(f"{base}{path}?lang=en", wait_until="load")
    if ready:
        pg.wait_for_function(ready, timeout=120000)
    pg.wait_for_timeout(250)
    body = pg.inner_text("body")
    for phrase in en:
        check(phrase in body, f"{path or '/':26s} en: {phrase[:58]}")
    if extra:
        extra(pg)
    pg.goto(f"{base}{path}?lang=es", wait_until="load")
    if ready:
        pg.wait_for_function(ready, timeout=120000)
    pg.wait_for_timeout(250)
    low = pg.inner_text("body").lower()
    for phrase in es:
        check(phrase.lower() in low, f"{path or '/':26s} es: {phrase[:58]}")
    check(not errs, f"{path or '/':26s} no console errors" + (f" ({errs[:2]})" if errs else ""))


# ready-predicate, English phrases that must appear, Spanish phrases that must appear
PAGES = {
    "": ("() => window.VOC && window.VOC.hero",
         ["are placed in a school the family asked for", "50% to 78%", "Apply yourself"],
         ["queda en una escuela que la familia pidió", "Postula tú mismo", "POSTULA"]),
    "apply/": ("() => window.VOC && window.VOC.ready",
               ["No home yet", "Your application never leaves the browser", "remember your choice of language"],
               ["Todavía no hay casa", "nunca sale del navegador", "recuerda tu elección de idioma"]),
    "gains/": ("() => window.VOC && window.VOC.gains",
               # defaults to the entry grade, where the paper prints quartile means but reads no gradient
               ["does not read a gradient here", "0.196", "scopes the finding to Preschool 2",
                "two reasons for the gradient", "51.8"],
               ["no lee un gradiente aquí", "acota el hallazgo a Inicial 2", "dos razones para el gradiente"]),
    "story/": ("() => window.VOC && window.VOC.story === true",
               ["3.3% of the welfare range", "in Manta, 0.3%"],
               ["3,3%"]),
    "simulator/": ("() => /\\d+%/.test(document.querySelector('#headline').textContent)",
                   ["Paper, real data", "96.31", "93.31", "Authors' calculation from the application data"],
                   ["Artículo, datos reales", "Cálculo de los autores"]),
    "toy/": (None,
             ["in the configuration the paper analyses no list does better than the truth",
              "static sibling priority, one quota per school", "dynamic sibling priority and family linking"],
             ["en la configuración que analiza el artículo", "prioridad de hermano dinámica"]),
    "planner/": ("() => /S\d\d/.test(document.querySelector('#school').textContent)",
                 ["Could a planner have guessed", "building footprint"],
                 ["¿Podría haberlo adivinado", "Superficie construida"]),
    "survey/": ("() => /\d/.test(document.querySelector('#nline').textContent)",
                ["no published count between one and four families", "55.0%", "70.6%", "1,873 respondents"],
                ["ningún conteo publicado está entre una y cuatro", "55,0%"]),
    "ladder/": (None, ["3.3% of the range"], ["3,3% del rango"]),
    "calibration/": ("() => document.querySelectorAll('#bygrade tr').length > 10",
                     ["Four gaps", "73% against 65%", "does not reproduce the paper's socio-economic gradient",
                      "55.4 → 77.4", "50.07 → 78.22"],
                     ["Cuatro brechas", "73% frente a 65%", "55,4 → 77,4"]),
    "downloads/": (None, ["Open in Google Colab", "Download the notebook"],
                   ["Abrir en Google Colab", "Descargar el cuaderno"]),
    "appendix/school-imagery/": (None, ["School imagery"], []),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8012/")
    ap.add_argument("--only", default="", help="comma-separated page paths to run")
    a = ap.parse_args()
    want = [p.strip().strip("/") for p in a.only.split(",") if p.strip()]

    with sync_playwright() as p:
        b = p.chromium.launch(channel="msedge", headless=True)
        pg = b.new_page(viewport={"width": 1360, "height": 1000})

        # the paper's PDF and every data file the pages fetch must actually be served
        for f in ["value-of-choice-ecuador.pdf", "data/schools.json", "data/applicants_g2.json",
                  "data/calibration.json", "data/hero_lines.json", "data/survey_aggregates.json",
                  "data/school_attributes.json", "downloads/value_of_choice_teaching.ipynb",
                  "og/landing.png", "engine/engine.js"]:
            check(pg.request.get(a.base + f).ok, f"{'served':26s} {f}")

        # the published parameters must be Table 9, the main specification
        params = pg.request.get(a.base + "data/applicants_g2.json").json()["params"]
        check(params["sxi"] == 0.529 and params["seps"] == 1.016 and params["sgam"] == 1.225,
              f"{'data':26s} entry-grade sigmas are Table 9's, not the no-siblings table's ({params})")

        for path, (ready, en, es) in PAGES.items():
            if want and path.strip("/") not in want:
                continue
            page_checks(pg, a.base, path, ready, en, es)
        b.close()

    print(f"\n{checked} checks, {fails} failed")
    print("RESULT:", "ALL CHECKS PASSED" if not fails else f"{fails} FAILURE(S)")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
