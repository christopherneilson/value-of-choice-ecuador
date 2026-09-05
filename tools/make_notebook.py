"""make_notebook.py - build (and optionally execute) the teaching notebook.

The notebook re-implements the paper's assignment rules in 40 lines of plain Python, checks them
against the site's engine fixture family by family, reproduces the simulator's headline numbers,
and ends with exercises. It reads the public site data (local copy when run inside this repo,
the live site otherwise), so it runs unchanged in Colab.

Run:  python tools/make_notebook.py            -> downloads/value_of_choice_teaching.ipynb
      python tools/make_notebook.py --execute  -> also executes it in place (needs jupyter + ipykernel)
"""
import os, subprocess, sys
import nbformat as nbf

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "downloads", "value_of_choice_teaching.ipynb")
REPO = "christopherneilson/value-of-choice-ecuador"
BASE = "https://www.christopher-neilson.com/value-of-choice-ecuador/"

cells = []
md = lambda s: cells.append(nbf.v4.new_markdown_cell(s.strip("\n")))
code = lambda s: cells.append(nbf.v4.new_code_cell(s.strip("\n")))

md(f"""
# The value of choice, by hand

[![Open in Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/{REPO}/blob/main/downloads/value_of_choice_teaching.ipynb)

A teaching companion to *The Value of Choice in Centralized School Assignment* (Elacqua, Jacas, Krussig, Méndez & Neilson) and its
[project website]({BASE}). In this notebook you

1. load the website's synthetic Manta — real schools and seats, families drawn from the paper's estimated demand model;
2. write applicant-proposing **deferred acceptance** in a few lines of plain Python;
3. check it family by family against the site's engine, which is itself validated against the paper's pipeline;
4. run the two rules the paper compares — the old **distance rule** and the new **preference-based** assignment — and reproduce the simulator's numbers;
5. change the market and see what happens to the value of choice.

No packages beyond the standard library. The families are synthetic: no real home location or application is used.
School desirability enters only as a quintile band. See the site's handoff document for the privacy model.
""")

code(f"""
import json, math, random, urllib.request, pathlib

BASE = "{BASE}"

def load(name):
    \"\"\"Read a site file: the local copy when this notebook runs inside the repository, the live site otherwise.\"\"\"
    p = pathlib.Path("..") / name
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    with urllib.request.urlopen(BASE + name) as r:
        return json.loads(r.read().decode("utf-8"))

schools = load("data/schools.json")["schools"]
G = load("data/applicants_g2.json")            # Preschool 1, the entry grade
print(G["name"], "-", len(G["applicants"]), "synthetic families,", len(G["schools"]), "in-market schools")
print("estimated parameters (paper, Table 9):", G["params"])
""")

md("""
## 1. The market

Each family $i$ values school $j$ at

$$u_{ij} = \\xi_j + (-1 + \\gamma_i)\\, d_{ij} + \\lambda\\, S_{ij} + \\varepsilon_{ij}$$

in **kilometre-equivalents**: $\\xi_j$ is the school's desirability (published as a quintile band, so the value here is the band's
expected value), $d_{ij}$ the distance, $\\gamma_i$ a family-specific taste for distance, $S_{ij}$ a sibling already enrolled, and
$\\varepsilon_{ij}$ an idiosyncratic taste. The site publishes, for every family, its home (synthetic), its list `rol` (the schools it
applied to, in order), and its utility for every school `u`. The engine needs distances and each family's distance ordering.
""")

code("""
R_EARTH = 6371.0088
def km(lat1, lon1, lat2, lon2):
    r = math.pi / 180; p1, p2 = lat1 * r, lat2 * r
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin((lon2 - lon1) * r / 2) ** 2
    return 2 * R_EARTH * math.asin(math.sqrt(a))

ids = G["schools"]; J = len(ids); idx = {s: j for j, s in enumerate(ids)}
byid = {s["id"]: s for s in schools}
grade = str(G["grade"])
caps = [byid[s]["grades"][grade]["seats"] for s in ids]          # regular seats in this grade
apps = G["applicants"]; n = len(apps)
d = [[km(a["lat"], a["lon"], byid[s]["lat"], byid[s]["lon"]) for s in ids] for a in apps]
dist_order = [sorted(range(J), key=lambda j: d[i][j]) for i in range(n)]
rol = [[idx[s] for s in a["rol"]] for a in apps]                  # the reported list, as school indices
sib = [idx[a["sib"]] if a["sib"] else -1 for a in apps]
u = [a["u"] for a in apps]

nearest = sorted(d[i][dist_order[i][0]] for i in range(n))
print(f"{sum(caps)} seats for {n} families; nearest school at {nearest[n // 2]:.2f} km for the median family")
print(f"{100 * sum(rol[i][0] == dist_order[i][0] for i in range(n)) / n:.0f}% rank their nearest school first; "
      f"{100 * sum(len(r) == 1 for r in rol) / n:.0f}% list a single school")
""")

md("""
## 2. Deferred acceptance in 15 lines

Every family proposes to the schools on its list in order. A school holds the applicants it likes best up to its capacity and
rejects the rest, who propose to their next school. It stops when no one is rejected. `score[i][j]` ranks family $i$ at school $j$
(lower is better); with strict scores the result is the unique applicant-optimal stable assignment, so the order in which
proposals are processed does not matter. (Rejected applicants are pushed back on the queue; a family whose seat is taken while it
is being held simply proposes again.)
""")

code("""
def deferred_acceptance(prefs, score, caps):
    \"\"\"Applicant-proposing DA. prefs[i]: school indices in order; score[i][j]: lower = higher priority.\"\"\"
    held = [[] for _ in caps]; nxt = [0] * len(prefs); assigned = {}
    queue = list(range(len(prefs)))
    while queue:
        a = queue.pop()
        while nxt[a] < len(prefs[a]):
            p = prefs[a][nxt[a]]; nxt[a] += 1
            if caps[p] <= 0:
                continue
            held[p].append(a); assigned[a] = p
            if len(held[p]) > caps[p]:                        # over capacity: drop the worst-scored applicant
                worst = max(held[p], key=lambda x: (score[x][p], -x))
                held[p].remove(worst); del assigned[worst]
                if worst == a:
                    continue                                  # keep proposing down the list
                queue.append(worst)
            break
    return assigned
""")

md("""
## 3. The two rules Manta used

**Preference-based assignment (2021).** The reported list, then every other in-market school appended in distance order so that
nobody is left unassigned. Priority classes: a sibling already at the school (0) beats a reported school (2) beats an appended
one (3); ties within a class are broken by one lottery number per family and school, uniform on $[0, 0.5)$.

**The distance rule (the status quo).** The same algorithm, but on a list the family never wrote: every school in distance order,
with one lottery number per family. Preferences enter nowhere.

The site ships one lottery draw per grade together with the assignment the paper's pipeline produced for it, as a fixture. If the
function above is right, it reproduces that assignment for every family.
""")

code("""
def deployed(i):
    listed = set(rol[i])
    prefs = rol[i] + [j for j in dist_order[i] if j not in listed]
    prio = [3] * J
    for j in rol[i]: prio[j] = 2
    if sib[i] >= 0: prio[sib[i]] = 0
    return prefs, prio

PREFS, PRIO = map(list, zip(*(deployed(i) for i in range(n))))
F = load("engine/fixtures/fixture_g2.json")
expected = lambda key, i: -1 if F[key][i] is None else F[key][i]

score = [[PRIO[i][j] + F["lot_da"][i][j] for j in range(J)] for i in range(n)]
mu_da = deferred_acceptance(PREFS, score, caps)
print("preference-based assignment: identical to the paper's engine for",
      sum(mu_da.get(i, -1) == expected("assign_da", i) for i in range(n)), "of", n, "families")

dc_score = [[(0 if j == sib[i] else 2) + F["lot_dc"][i] for j in range(J)] for i in range(n)]
mu_dc = deferred_acceptance(dist_order, dc_score, caps)
print("distance rule:               identical to the paper's engine for",
      sum(mu_dc.get(i, -1) == expected("assign_dc", i) for i in range(n)), "of", n, "families")
""")

md("""
## 4. What each rule delivers

Four numbers summarise an assignment: the share of families placed in a school they listed, the share placed in their first
choice, the mean distance travelled, and mean utility in kilometre-equivalents — the welfare metric. Utility is *higher* under the
preference-based rule even though families travel *further*: they are trading distance for schools they want.
""")

code("""
def metrics(mu):
    A = [i for i in range(n) if i in mu]
    return {"listed %": 100 * sum(mu[i] in rol[i] for i in A) / n,
            "first choice %": 100 * sum(mu[i] == rol[i][0] for i in A) / n,
            "mean km": sum(d[i][mu[i]] for i in A) / len(A),
            "utility (km-eq)": sum(u[i][mu[i]] for i in A) / len(A)}

for name, mu in (("distance rule", mu_dc), ("preference-based", mu_da)):
    print(f"{name:>18}: " + "   ".join(f"{k} {v:6.2f}" for k, v in metrics(mu).items()))
""")

md("""
## 5. Averaging over lotteries: the simulator's numbers

One draw is one draw. The site's simulator averages 20 lottery draws; do the same and compare with the numbers it publishes in
`data/calibration.json`. They differ only by lottery noise (different random numbers): the rules and the market are the same.
""")

code("""
rng = random.Random(7)

def average(draws=20, caps=caps, prefs=PREFS, prio=PRIO):
    acc = {"dc": {}, "da": {}}
    for _ in range(draws):
        lot = [[rng.random() * 0.5 for _ in range(J)] for _ in range(n)]
        out = {"da": deferred_acceptance(prefs, [[prio[i][j] + lot[i][j] for j in range(J)] for i in range(n)], caps)}
        l1 = [rng.random() * 0.5 for _ in range(n)]
        out["dc"] = deferred_acceptance(dist_order, [[(0 if j == sib[i] else 2) + l1[i] for j in range(J)] for i in range(n)], caps)
        for r in acc:
            for k, v in metrics(out[r]).items():
                acc[r][k] = acc[r].get(k, 0) + v / draws
    return acc

res = average()
C = load("data/calibration.json")["per_grade"][G["name"]]
print(f"{'':>38}{'notebook':>10}{'site':>8}")
for r, lab in (("dc", "distance rule"), ("da", "preference-based")):
    for k, ck in (("listed %", "listed"), ("first choice %", "first"), ("mean km", "km"), ("utility (km-eq)", "utility")):
        print(f"{lab + ' - ' + k:>38}{res[r][k]:>10.2f}{C[r][ck]:>8.2f}")
gain = res["da"]["utility (km-eq)"] - res["dc"]["utility (km-eq)"]
print(f"\\nvalue of choice: +{gain:.3f} km-equivalents per family (site {C['gain_km_da_over_dc']:.3f}; paper, Preschool 1: +0.69)")
""")

md("""
## 6. Change the market

**Congestion.** Take 30% of the seats away. Fewer families get their first choice under either rule, and the gain from acting on
preferences shrinks: with nothing to choose among, choice is worth little. This is the paper's explanation for why the crowded
Primary 1 market gains so much less than the entry grade.
""")

code("""
tight = [round(0.7 * c) for c in caps]
r70 = average(draws=5, caps=tight)
print(f"seats {sum(caps)} -> {sum(tight)}")
for r, lab in (("dc", "distance rule"), ("da", "preference-based")):
    print(f"{lab:>18}: first choice {res[r]['first choice %']:.0f}% -> {r70[r]['first choice %']:.0f}%")
print(f"value of choice: +{gain:.3f} -> +{r70['da']['utility (km-eq)'] - r70['dc']['utility (km-eq)']:.3f} km-equivalents")
""")

md("""
**If families only cared about distance.** Replace every list by the same number of *nearest* schools and rerun. Measured in the
families' true utilities, the preference-based rule now delivers almost nothing over the distance rule. The estimated value of
choice is therefore a measure of how far what families want departs from what proximity would have given them — which is why the
paper anchors it on the descriptive fact that more than a quarter of families rank a school other than their nearest first.
""")

code("""
rol_true = rol
rol = [dist_order[i][:len(rol_true[i])] for i in range(n)]          # proximity-only lists
PREFS_p, PRIO_p = map(list, zip(*(deployed(i) for i in range(n))))
rol = rol_true                                                      # metrics are judged on the TRUE lists and utilities
rp = average(draws=5, prefs=PREFS_p, prio=PRIO_p)
print(f"value of choice with proximity-only lists: +{rp['da']['utility (km-eq)'] - rp['dc']['utility (km-eq)']:.3f} km-equivalents "
      f"(with the reported lists: +{gain:.3f})")
""")

md("""
## 7. Exercises

1. **Stable improvement cycles.** Deferred acceptance with coarse priorities can leave welfare on the table: two families may both
   prefer each other's seat while holding the same priority there. Implement the Erdil–Ergin cycle search and check that it changes
   very few assignments here (the site's engine finds it moves the entry grade's utility by about 0.006 km-equivalents).
2. **Awareness.** Each family's `M` is the number of nearest schools it considered when forming its list. Restrict every list to the
   family's three nearest schools and rerun: how much of the value of choice survives? The simulator's awareness slider does this
   continuously.
3. **Another grade.** Load `data/applicants_g4.json` (Primary 1, the congested market) and repeat sections 3-5. Which of the two
   rules changes more when the market is tight?
4. **Your own city.** Everything above needs only school coordinates and seats, and either family lists or a model to generate
   them. What would you have to assume to run this where you live?
""")

nb = nbf.v4.new_notebook(cells=cells, metadata={"kernelspec": {"name": "python3", "display_name": "Python 3", "language": "python"},
                                                   "language_info": {"name": "python"}})
os.makedirs(os.path.dirname(OUT), exist_ok=True)
nbf.write(nb, OUT)
print("wrote", os.path.normpath(OUT), f"({len(cells)} cells)")
if "--execute" in sys.argv:
    subprocess.run([sys.executable, "-m", "jupyter", "nbconvert", "--to", "notebook", "--execute", "--inplace",
                    "--ExecutePreprocessor.timeout=600", OUT], check=True, cwd=os.path.dirname(OUT))
    nb = nbf.read(OUT, as_version=4)
    for c in nb.cells:
        for o in c.get("outputs", []):
            if o.get("output_type") == "stream":
                print(o["text"], end="")
            elif o.get("output_type") == "error":
                print("ERROR:", o.get("ename"), o.get("evalue")); sys.exit(1)
    print("executed OK")
