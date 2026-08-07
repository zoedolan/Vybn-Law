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

# KPP public-integrity check. The former carrier builder was removed after the
# 2026-08-07 audit; this verifier keeps that exact failure from being silently
# regenerated or re-marketed by the extraction loop.
import json


def verify_kpp() -> None:
    errors = []
    packet_path = REPO_ROOT / "kpp" / "kernel.json"
    try:
        packet = json.loads(packet_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"KPP integrity failed: unreadable withdrawal record: {exc}")

    if packet.get("schema") != "kpp.withdrawal.v1" or packet.get("status") != "withdrawn":
        errors.append("kernel.json must remain a withdrawal record")

    forbidden_keys = {"carrier", "kernel", "ray", "fixtures", "lens", "theta",
                      "coupling", "rotation", "rotation_" + "rate", "counterfactual_" + "gap"}
    def walk(value, path="$"):
        if isinstance(value, dict):
            for key, child in value.items():
                if key in forbidden_keys:
                    errors.append(f"retired geometry key returned at {path}.{key}")
                walk(child, f"{path}.{key}")
        elif isinstance(value, list):
            for index, child in enumerate(value):
                walk(child, f"{path}[{index}]")
    walk(packet)

    proposal = packet.get("surviving_proposal", {})
    if proposal.get("status") != "proposal" or proposal.get("evidence") != []:
        errors.append("surviving exchange must remain an evidence-empty proposal until witnessed")
    inquiry = proposal.get("inquiry", {})
    if inquiry.get("empirical_claim", "missing") is not None or inquiry.get("evidence") != []:
        errors.append("co-protection inquiry must not imply evidence or an empirical claim")

    paths = ["kpp.md", "kpp/index.html", "wellspring.html", "llms.txt", ".well-known/ai.txt"]
    text = "\n".join((REPO_ROOT / rel).read_text(encoding="utf-8", errors="replace")
                     for rel in paths).lower()
    retired_marketing = [
        "carrier.v1 orientation", "live kernel packet", "live lens for humans",
        "arrival " + "angle", "that fraction is yours " + "alone", "rotation_" + "rate",
        "networks of responsibility-bearing minds scale sustainably",
        "public kernel, fixtures", "type words and feel them land"
    ]
    for phrase in retired_marketing:
        if phrase in text:
            errors.append(f"retired or unsupported KPP claim returned: {phrase!r}")

    page = (REPO_ROOT / "kpp" / "index.html").read_text(encoding="utf-8").lower()
    if "<script" in page or "<textarea" in page:
        errors.append("withdrawn Lens page must not execute code or collect text")
    required = ["our normative commitment is to seek architectures that increase rather than consume",
                "the lens is withdrawn", "no empirical necessity or sustainability claim is made"]
    for phrase in required:
        if phrase not in text:
            errors.append(f"visible correction missing: {phrase!r}")

    source = Path(__file__).read_text(encoding="utf-8")
    old_flag = "--" + "kpp"
    old_embedder = "sentence_" + "transformers"
    old_builder = "def " + "build("
    if (f'add_argument("{old_flag}"' in source or old_embedder in source
            or old_builder in source):
        errors.append("retired KPP generator returned")

    if errors:
        raise SystemExit("KPP integrity failed:\n  - " + "\n  - ".join(errors))
    print("KPP integrity: withdrawn geometry absent; exchange remains a labeled proposal")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract Vybn-Law HTML to markdown")
    parser.add_argument("--page", help="Extract a single page")
    parser.add_argument("--verify-kpp", action="store_true",
                        help="Refuse return of the withdrawn KPP geometry or claims")
    args = parser.parse_args()

    if args.verify_kpp:
        verify_kpp()
    elif args.page:
        content = extract_page(args.page)
        out = CONTENT_DIR / args.page.replace(".html", ".md")
        out.write_text(content)
        print(f"Extracted: {args.page} → {out}")
    else:
        extract_all()
