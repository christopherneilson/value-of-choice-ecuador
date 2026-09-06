"""make_og.py - social preview cards, and the meta tags that point at them.

Renders one 1200x630 PNG per page into og/ (Playwright driving the installed Edge, the same tool the
verification scripts use) and rewrites the marker-delimited meta block in each hand-written page's head.
index.html and the imagery appendix are generated elsewhere and carry their own block; this script
checks that theirs is present and points at a card that exists.

The cards share a motif: the real school locations of Manta as a dot field, tinted per page. Nobody
needs to rerun this - the PNGs are committed. Rerun after adding a page or renaming one:
    pip install playwright && playwright install msedge      (once)
    python tools/make_og.py
"""
import io, json, math, os, re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, ".."))
OG = os.path.join(SITE, "og")
BASE = "https://www.christopher-neilson.com/value-of-choice-ecuador/"
W, H = 1200, 630

# slug, path, title, description, accent.  Descriptions are one line: they are what a link preview shows.
PAGES = [
    ("landing", "", "The Value of Choice in Centralized School Assignment",
     "Welfare gains from acting on family preferences in Ecuador. Working paper and interactive materials.", "#22506b"),
    ("apply", "apply/", "Apply to school in Manta",
     "Put your home on the map, rank the schools around it, and see what each assignment rule gives you.", "#21918c"),
    ("gains", "gains/", "Who gains?",
     "The gain from acting on family preferences, family by family: a map of winners and losers, and the gradient by neighbourhood.", "#21918c"),
    ("story", "story/", "Why choice matters, step by step",
     "A guided walk through the argument with a live model of Manta beside it.", "#21918c"),
    ("simulator", "simulator/", "Choose the rule",
     "Manta's real schools and a synthetic population: run the distance rule, deferred acceptance and the efficient benchmark.", "#7b3294"),
    ("toy", "toy/", "Does lying pay?",
     "Three families, three schools, one seat each. When misreporting helps, and why it never can under the rule Manta adopted.", "#b42318"),
    ("planner", "planner/", "Could a planner have guessed?",
     "Guess how desirable families found each school from ten attributes measured in satellite and street imagery.", "#3b528b"),
    ("survey", "survey/", "What families said",
     "The pre-results parent survey as aggregates you can slice: why lists were short, and whether families were right.", "#1a7f37"),
    ("ladder", "ladder/", "Two welfare ladders",
     "New York's move to coordinated assignment beside Manta's move from a distance rule to preferences, on one scale.", "#3f8f3f"),
    ("calibration", "calibration/", "Does the synthetic market reproduce the paper?",
     "Every number the synthetic population produces beside the paper's: what matches, what does not, and why.", "#5a5a5a"),
    ("downloads", "downloads/", "Downloads and teaching kit",
     "The synthetic Manta as JSON, the assignment engine as a module, and a notebook that rebuilds the rules from scratch.", "#22506b"),
    ("appendix", "appendix/school-imagery/", "School imagery and embeddings",
     "How imagery measures parent-observable school characteristics in the demand model, and what it does not explain.", "#440154"),
]
# these two are written by their own generators (make_landing.py, build_public_appendix.py)
GENERATED = {"landing": "index.html", "appendix": os.path.join("appendix", "school-imagery", "index.html")}


def dots(accent):
    """The real school locations as an SVG dot field, trimmed to the core of the market."""
    schools = json.load(io.open(os.path.join(SITE, "data", "schools.json"), encoding="utf-8"))["schools"]
    pts = [(s["lat"], s["lon"], max(g["seats"] for g in s["grades"].values()),
            max(g["xi_band"] for g in s["grades"].values())) for s in schools]
    la = sorted(p[0] for p in pts); lo = sorted(p[1] for p in pts)
    q = lambda v, p: v[round(p * (len(v) - 1))]
    la0, la1, lo0, lo1 = q(la, .02), q(la, .98), q(lo, .02), q(lo, .98)
    k = math.cos(math.radians((la0 + la1) / 2))
    box, x0, y0 = 430, 745, 120
    s = min(box / max(1e-9, (lo1 - lo0) * k), box / max(1e-9, la1 - la0))
    out = []
    for lat, lon, seats, band in pts:
        x = x0 + (lon - lo0) * k * s
        y = y0 + (la1 - lat) * s
        if not (x0 - 40 <= x <= x0 + box + 40 and y0 - 40 <= y <= y0 + box + 40):
            continue
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{3 + math.sqrt(seats) * 0.9:.1f}" fill="{accent}" '
                   f'opacity="{0.16 + 0.13 * band:.2f}"/>')
    return "".join(out)


def card(title, desc, accent):
    return f"""<!doctype html><meta charset=utf-8><style>
*{{box-sizing:border-box;margin:0}}
html,body{{width:{W}px;height:{H}px}}
body{{font:16px -apple-system,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;background:#fff;position:relative;overflow:hidden}}
.dots{{position:absolute;inset:0}}
.wrap{{position:absolute;inset:0;padding:72px 80px;display:flex;flex-direction:column;justify-content:center}}
.bar{{width:64px;height:6px;background:{accent};border-radius:3px;margin-bottom:26px}}
.eyebrow{{font-size:19px;letter-spacing:.14em;text-transform:uppercase;color:#7a7a7a;margin-bottom:18px}}
h1{{font-size:{56 if len(title) < 44 else 46}px;line-height:1.12;letter-spacing:-.015em;max-width:760px}}
p{{font-size:25px;line-height:1.4;color:#454545;max-width:700px;margin-top:22px}}
.url{{position:absolute;left:80px;bottom:52px;font-size:19px;color:#8a8a8a;letter-spacing:.01em}}
.fade{{position:absolute;right:0;top:0;bottom:0;width:520px;background:linear-gradient(90deg,#fff 0%,#ffffff00 34%)}}
</style><svg class=dots viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">{dots(accent)}</svg>
<div class=fade></div>
<div class=wrap><div class=eyebrow>The Value of Choice</div><div class=bar></div><h1>{title}</h1><p>{desc}</p></div>
<div class=url>christopher-neilson.com/value-of-choice-ecuador</div>"""


def meta_block(slug, path, title, desc):
    url = BASE + path
    return ("<!-- og:start (tools/make_og.py) -->\n"
            f'<meta property="og:type" content="website">\n'
            f'<meta property="og:site_name" content="The Value of Choice">\n'
            f'<meta property="og:url" content="{url}">\n'
            f'<meta property="og:title" content="{title}">\n'
            f'<meta property="og:description" content="{desc}">\n'
            f'<meta property="og:image" content="{BASE}og/{slug}.png">\n'
            f'<meta property="og:image:width" content="{W}"><meta property="og:image:height" content="{H}">\n'
            f'<meta property="og:image:alt" content="{title}">\n'
            f'<meta name="twitter:card" content="summary_large_image">\n'
            "<!-- og:end -->")


def inject(page_path, block):
    p = os.path.join(SITE, page_path)
    src = io.open(p, encoding="utf-8").read()
    if "<!-- og:start" in src:
        new = re.sub(r"<!-- og:start.*?<!-- og:end -->", lambda _: block, src, flags=re.S)
    else:
        anchor = '<link rel="icon" href="data:,">'
        if anchor not in src:
            raise SystemExit(f"{page_path}: no favicon link to anchor the meta block to")
        new = src.replace(anchor, anchor + "\n" + block, 1)
    if new != src:
        io.open(p, "w", encoding="utf-8", newline="\n").write(new)
    return new != src


def main():
    os.makedirs(OG, exist_ok=True)
    from playwright.sync_api import sync_playwright
    changed = []
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel="msedge", headless=True)
        pg = b.new_page(viewport={"width": W, "height": H})
        for slug, path, title, desc, accent in PAGES:
            pg.set_content(card(title, desc, accent), wait_until="load")
            out = os.path.join(OG, f"{slug}.png")
            pg.screenshot(path=out, clip={"x": 0, "y": 0, "width": W, "height": H})
            print(f"  og/{slug}.png  {os.path.getsize(out) // 1024:>3} KB   {title}")
        b.close()

    for slug, path, title, desc, _ in PAGES:
        block = meta_block(slug, path, title, desc)
        page = GENERATED.get(slug) or os.path.join(path.rstrip("/"), "index.html")
        src = io.open(os.path.join(SITE, page), encoding="utf-8").read()
        if slug in GENERATED:
            ok = f"og/{slug}.png" in src and 'twitter:card' in src
            print(f"  {'[ok ]' if ok else '[XX ]'} {page} carries its own block (generated elsewhere)")
            if not ok:
                changed.append(f"MISSING in {page}")
            continue
        if inject(page, block):
            changed.append(page)
    print("\nmeta blocks written:", ", ".join(changed) if changed else "none (all up to date)")
    missing = [s for s, *_ in PAGES if not os.path.exists(os.path.join(OG, f"{s}.png"))]
    print("RESULT:", "PROBLEMS: " + str(missing) if missing else "all cards rendered")


if __name__ == "__main__":
    main()
