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


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract Vybn-Law HTML to markdown")
    parser.add_argument("--page", help="Extract a single page")
    args = parser.parse_args()

    if args.page:
        content = extract_page(args.page)
        out = CONTENT_DIR / args.page.replace(".html", ".md")
        out.write_text(content)
        print(f"Extracted: {args.page} → {out}")
    else:
        extract_all()
