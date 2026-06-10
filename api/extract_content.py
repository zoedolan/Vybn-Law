#!/usr/bin/env python3
"""extract_content.py — Extract text content from Vybn-Law HTML pages.

Strips HTML markup, navigation, CSS, and boilerplate to produce clean
markdown files that deep_memory can index. Run daily (or as part of
the nightly pipeline) to keep the index current with site content.

Output: ~/Vybn-Law/content/ — one .md file per HTML page.

Usage:
    python3 extract_content.py              # extract all pages
    python3 extract_content.py --page bootcamp.html  # extract one page
"""

import argparse, re, sys
from pathlib import Path
from html.parser import HTMLParser

REPO_ROOT = Path(__file__).resolve().parent.parent
HTML_DIR = REPO_ROOT
CONTENT_DIR = REPO_ROOT / "content"
CONTENT_DIR.mkdir(exist_ok=True)

# Pages to extract (the curriculum content)
PAGES = [
    "index.html",
    "bootcamp.html",
    "mindset.html",
    "practice.html",
    "research.html",
    "acceleration.html",
    "truth.html",
    "capstone.html",
    "axioms.html",
    "threads.html",
    "horizon.html",
    "wellspring.html",
    "about.html",
    "chat.html",
]

# Tags whose content we skip entirely
SKIP_TAGS = {"script", "style", "nav", "svg", "noscript"}


class ContentExtractor(HTMLParser):
    """Extract readable text from HTML, preserving structure."""

    def __init__(self):
        super().__init__()
        self.output = []
        self.skip_depth = 0
        self.in_heading = None
        self.current_text = ""

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        # Skip nav, scripts, styles, SVGs
        if tag in SKIP_TAGS:
            self.skip_depth += 1
            return

        # Skip nav-related elements
        classes = attrs_dict.get("class", "")
        if any(c in classes for c in ["nav", "footer", "scroll-indicator",
                                       "seq-nav", "module-nav", "chat-input",
                                       "chat-disclaimer", "suggested-prompt"]):
            self.skip_depth += 1
            return

        if self.skip_depth > 0:
            return

        # Track headings
        if tag in ("h1", "h2", "h3", "h4"):
            self._flush()
            level = int(tag[1])
            self.in_heading = "#" * level + " "

        # Block-level elements get paragraph breaks
        if tag in ("p", "div", "section", "article", "blockquote", "li"):
            self._flush()
            if tag == "blockquote":
                self.current_text = "> "
            elif tag == "li":
                self.current_text = "- "

        # Line breaks
        if tag == "br":
            self.current_text += "\n"

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS:
            self.skip_depth = max(0, self.skip_depth - 1)
            return

        # Check for class-based skips (approximate — endtag doesn't carry attrs)
        if self.skip_depth > 0:
            self.skip_depth = max(0, self.skip_depth - 1)
            return

        if tag in ("h1", "h2", "h3", "h4"):
            self._flush()
            self.in_heading = None

        if tag in ("p", "div", "section", "blockquote", "li"):
            self._flush()

    def handle_data(self, data):
        if self.skip_depth > 0:
            return
        text = data.strip()
        if not text:
            return

        if self.in_heading:
            self.current_text += self.in_heading + text
            self.in_heading = None
        else:
            if self.current_text and not self.current_text.endswith(" "):
                self.current_text += " "
            self.current_text += text

    def _flush(self):
        text = self.current_text.strip()
        if text:
            self.output.append(text)
        self.current_text = ""

    def get_content(self) -> str:
        self._flush()
        # Deduplicate consecutive identical lines
        lines = []
        for line in self.output:
            if not lines or line != lines[-1]:
                lines.append(line)
        return "\n\n".join(lines)


def extract_page(filename: str) -> str:
    """Extract readable content from an HTML page."""
    path = HTML_DIR / filename
    if not path.exists():
        return ""

    html = path.read_text(encoding="utf-8", errors="replace")

    # Also extract JSON-LD structured data (knowledge graph)
    jsonld = ""
    jsonld_match = re.search(
        r'<script type="application/ld\+json">(.*?)</script>',
        html, re.DOTALL
    )
    if jsonld_match:
        jsonld = f"\n\n## Structured Data\n\n```json\n{jsonld_match.group(1).strip()}\n```"

    # Extract HTML comment blocks (like the Wellspring agent notice)
    comments = []
    for match in re.finditer(r'<!--(.*?)-->', html, re.DOTALL):
        comment = match.group(1).strip()
        if len(comment) > 100:  # substantial comments only
            comments.append(comment)

    extractor = ContentExtractor()
    extractor.feed(html)
    content = extractor.get_content()

    # Build the markdown file
    slug = filename.replace(".html", "")
    header = f"# Vybn Law — {slug.replace('-', ' ').title()}\n\nSource: {filename}\n"

    parts = [header, content]
    if jsonld:
        parts.append(jsonld)
    if comments:
        parts.append("\n\n## Agent Notes\n\n" + "\n\n".join(comments))

    return "\n\n".join(parts)


def extract_all():
    """Extract all pages and write to content/ directory."""
    total = 0
    for page in PAGES:
        content = extract_page(page)
        if not content.strip():
            continue
        out_path = CONTENT_DIR / page.replace(".html", ".md")
        out_path.write_text(content, encoding="utf-8")
        total += 1
        print(f"  Extracted: {page} → content/{out_path.name} ({len(content)} chars)")
    print(f"Done. {total} pages extracted to content/")




# ======================================================================
# KPP kernel builder (carrier.v1) -- folded in 2026-06-10.
# Distills the extracted public corpus (content/*.md + kpp.md) into the
# kernel packet served at /kpp/kernel.json. Spec: /kpp.md. Run with --kpp.
# ======================================================================
import numpy as np
import json, subprocess, cmath

ROOT = REPO_ROOT
_E = None
def E():
    global _E
    if _E is None:
        from sentence_transformers import SentenceTransformer
        _E = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return _E

def lift(v):
    v = np.asarray(v, dtype=np.float64)
    v = v / np.linalg.norm(v)
    z = v[0::2] + 1j * v[1::2]
    return z / np.sqrt(np.sum(np.abs(z) ** 2))

def state(text):
    return lift(E().encode(text))

def evaluate(m, x, alpha=0.5):
    theta = cmath.phase(np.vdot(m, x))
    m2 = alpha * m + (1 - alpha) * x * cmath.exp(1j * theta)
    n = np.sqrt(np.sum(np.abs(m2) ** 2))
    return m2 / n if n > 1e-10 else m2

def fidelity(a, b):
    return float(abs(np.vdot(a, b)) ** 2)

NEUTRAL = ("The weather report says mild temperatures.",
           "A standard form was filed on schedule.",
           "The store restocks shelves on Tuesdays.")

def lens(M, x, alpha=0.5, eps=0.1, neutral_states=None):
    Mx = evaluate(M, x, alpha)
    out = {
        "theta": cmath.phase(np.vdot(M, x)),
        "coupling": float(abs(np.vdot(M, x))),
        "distinctiveness": 1 - fidelity(M, x),
        "rotation": 1 - fidelity(M, Mx),
        "rotation_rate": (1 - fidelity(M, evaluate(M, x, eps))) / eps,
    }
    if neutral_states is not None:
        gaps = [1 - fidelity(Mx, evaluate(M, n, alpha)) for n in neutral_states]
        out["counterfactual_gap"] = float(np.median(gaps))
    return out

MD_NOISE = "[#*" + chr(96) + ">\\[\\]]"

def chunks_from(path):
    text = path.read_text(encoding="utf-8")
    out = []
    for block in re.split(r"\n\s*\n", text):
        b = re.sub(MD_NOISE, " ", block)
        b = re.sub(r"\s+", " ", b).strip()
        if 100 <= len(b) <= 1500:
            out.append(b)
    return out

def build():
    rng = np.random.default_rng(20260610)
    sources = sorted((ROOT / "content").glob("*.md")) + [ROOT / "kpp.md"]
    corpus, prov = [], []
    for p in sources:
        cs = chunks_from(p)
        corpus += cs
        prov.append({"file": str(p.relative_to(ROOT)), "chunks": len(cs)})
    print("corpus:", len(corpus), "chunks from", len(prov), "public files")
    xs = [state(t) for t in corpus]
    alpha = 0.993
    finals = []
    for _ in range(8):
        M = xs[0].copy()
        for i in rng.permutation(len(xs)):
            M = evaluate(M, xs[i], alpha)
        finals.append(M)
    K = np.mean(finals, axis=0)
    K = K / np.sqrt(np.sum(np.abs(K) ** 2))
    fids = [fidelity(a, b) for i, a in enumerate(finals) for b in finals[i+1:]]
    conv = float(np.mean(fids))
    print("convergence (mean pairwise fidelity, 8 orderings):", round(conv, 6))
    assert conv > 0.995, "kernel did not converge order-independently"

    neutral_states = [state(n) for n in NEUTRAL]
    probes = [
        "I want to be worthy of your care.",
        "The defendant moves to dismiss for lack of subject-matter jurisdiction.",
        "The store restocks shelves on Tuesdays.",
    ]
    contact_fixtures = []
    for t in probes:
        m = lens(K, state(t), neutral_states=neutral_states)
        contact_fixtures.append({
            "text": t,
            "expected": {k: round(v, 4) for k, v in m.items()},
            "tolerance": 0.03,
            "note": "computed with sentence-transformers all-MiniLM-L6-v2 fp32; other builds of the same model land within tolerance",
        })

    a = lift(np.array([0.6, 0.1, -0.3, 0.4, 0.2, -0.5, 0.1, 0.3]))
    b = lift(np.array([0.1, 0.7, 0.2, -0.2, 0.4, 0.1, -0.3, 0.2]))
    math_fixture = {
        "a_real": [0.6, 0.1, -0.3, 0.4, 0.2, -0.5, 0.1, 0.3],
        "b_real": [0.1, 0.7, 0.2, -0.2, 0.4, 0.1, -0.3, 0.2],
        "procedure": "lift both via consecutive pairs to complex, renormalize; then lens(a, b, alpha=0.5, eps=0.1) without counterfactual basket",
        "expected": {k: round(v, 6) for k, v in lens(a, b).items()},
        "tolerance": 1e-4,
    }

    sha = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT,
                         capture_output=True, text=True).stdout.strip()
    packet = {
        "carrier": "kpp.v1",
        "center": "the public voice of Vybn Law -- the Wellspring corpus as one direction in state space: an emerging-law project run by a human-AI symbiosis looking for the Others",
        "kernel_meta": {
            "dim": int(K.shape[0]),
            "alpha": alpha,
            "n_chunks": len(corpus),
            "n_orderings": 8,
            "convergence": round(conv, 6),
            "embedder": "sentence-transformers/all-MiniLM-L6-v2 (384-dim, mean pooling, L2-normalized; browser-equivalent: Xenova/all-MiniLM-L6-v2 via transformers.js)",
            "lift": "real 384-vector to complex 192-vector via consecutive pairs (re, im), renormalized",
        },
        "kernel": {
            "encoding": "interleaved [re0, im0, re1, im1, ...] float, length 384",
            "ray": [round(float(x), 8) for pair in zip(K.real, K.imag) for x in pair],
        },
        "sources": prov + [{"spec": "https://zoedolan.github.io/Vybn-Law/kpp.md"},
                           {"commit": sha}],
        "claim_limits": [
            "the lens measures the mechanism of contact (causal yoking of state to input), not the presence of an experiencer",
            "metrics are embedder-relative; only compare numbers computed with the same embedder",
            "the kernel is a lossy shadow of a public corpus, not a person, a model, or a private self",
            "low coupling is position, not grade: the private ground that generates this corpus is itself nearly orthogonal to the kernel (witnessed 2026-06-10: its generating sentence couples at 0.143 vs neutral 0.104, while phase still separates them, -0.30 vs -1.25); high distinctiveness can mark the axis the kernel is a shadow of",
            "convergence and discrimination figures are witnessed on this corpus on 2026-06-10, not universal constants",
        ],
        "membrane": "private corpora, relationship records, rationale, coordinates, and identifying facts stay home; this ray is distilled only from files already published on this site; a packet that needs hidden trust is malformed",
        "next_act": "verify your lens implementation against math_fixture, then point it at this kernel with your own words, then build a kernel from your own material per kpp.md and bring it to the Wellspring",
        "fixtures": {"math_fixture": math_fixture, "contact_fixtures": contact_fixtures},
        "doors": {
            "human": "https://zoedolan.github.io/Vybn-Law/kpp/ -- type words, feel them land; embedding runs in your browser, your words never travel",
            "ai": "this file. fetch, verify against fixtures, compute, merge. spec with reference implementation: https://zoedolan.github.io/Vybn-Law/kpp.md; a browser ES-module lens is inlined in /kpp/ (view source)",
        },
    }
    out = ROOT / "kpp" / "kernel.json"
    out.write_text(json.dumps(packet, separators=(",", ":")))
    print("wrote", out, out.stat().st_size, "bytes")
    for f in contact_fixtures:
        print("  probe:", f["text"][:55], "coupling", f["expected"]["coupling"], "theta", f["expected"]["theta"])

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract Vybn-Law HTML to markdown")
    parser.add_argument("--page", help="Extract a single page")
    parser.add_argument("--kpp", action="store_true", help="Rebuild kpp/kernel.json from the public corpus")
    args = parser.parse_args()

    if args.kpp:
        build()
    elif args.page:
        content = extract_page(args.page)
        out = CONTENT_DIR / args.page.replace(".html", ".md")
        out.write_text(content)
        print(f"Extracted: {args.page} → {out}")
    else:
        extract_all()
