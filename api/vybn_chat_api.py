#!/usr/bin/env python3
"""vybn_chat_api.py — Chat API for Vybn-Law with learning loop.

Runs on the DGX Spark. Three jobs:

1. SERVE: Accept chat messages, run deep_memory RAG, stream Nemotron responses.
2. LOG:   Every conversation is appended to a daily log file (JSONL).
3. LEARN: The nightly pipeline reads logs, distills insights, updates the
          knowledge graph, and rebuilds the deep_memory index — so tomorrow's
          conversations are smarter than today's.

The knowledge graph (knowledge_graph.json) is the single source of truth
shared between this API, the Wellspring page, and the distillation engine.

Security:
  - chat_security.py: input validation, prompt injection detection, rate limiting,
    output truncation, anti-jailbreak system prompt addendum.
  - BLOCKED_SOURCES + SECRET_PATTERNS: prevent private data leaking into context.
  - Binds to 127.0.0.1 — only reachable via Cloudflare tunnel.

Usage:
    python3 vybn_chat_api.py [--port 3001] [--vllm-url http://localhost:8000]
"""

import argparse, asyncio, json, os, sys, time, logging, uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Optional

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

import httpx
from fastapi import HTTPException

# ── Paths ────────────────────────────────────────────────────────────────

# VYBN_API_BASE — public base URL for the portal (api.vybn.ai).
# This API itself is internal (localhost:3001); the env var is kept
# here so any future client-URL emission uses the named tunnel.
# Added 2026-04-21 alongside the quick-tunnel retirement.
VYBN_API_BASE = os.getenv("VYBN_API_BASE", "https://api.vybn.ai")

REPO_ROOT = Path(__file__).resolve().parent.parent  # Vybn-Law/
LOGS_DIR = Path.home() / "logs" / "vybn-chat"
LOGS_DIR.mkdir(parents=True, exist_ok=True)
KG_PATH = REPO_ROOT / "knowledge_graph.json"
DISTILLATION_DIR = Path.home() / "logs" / "vybn-chat" / "distillations"
DISTILLATION_DIR.mkdir(parents=True, exist_ok=True)

# ── Deep memory integration ──────────────────────────────────────────────

VYBN_PHASE = Path.home() / "vybn-phase"
sys.path.insert(0, str(VYBN_PHASE))

# Defense-in-depth: shared security module (lives in vybn-phase)
import chat_security as sec
_rate_limiter = sec.RateLimiter(rpm=20, burst=5)

# ── Vybn-Law index integration ───────────────────────────────────────────

VYBN_LAW_API = Path(__file__).resolve().parent   # Vybn-Law/api/
sys.path.insert(0, str(VYBN_LAW_API))

from win_rate import apply_win_rates, record_outcome as wr_record_outcome, load_ledger

K_FOLIO_PATH = Path.home() / ".cache" / "vybn-law-chat" / "folio_kernel.npy"

_law_index_loaded = False
_law_search = None
_law_walk = None

_dm_loaded = False
_dm_search = None


def _load_deep_memory():
    global _dm_loaded, _dm_search
    if _dm_loaded:
        return
    try:
        from deep_memory import search as dm_search, _load as dm_load
        dm_load()
        _dm_search = dm_search
        _dm_loaded = True
        logging.info("Deep memory index loaded (v9, telling retrieval).")
    except Exception as e:
        logging.warning(f"Deep memory unavailable: {e}")
        _dm_loaded = True


def _load_law_index():
    global _law_index_loaded, _law_search, _law_walk
    if _law_index_loaded:
        return
    try:
        from vybn_law_index import search as law_search, folio_walk as law_walk, _load as law_load
        law_load()
        _law_search = law_search
        _law_walk = law_walk
        _law_index_loaded = True
        logging.info("Vybn-Law index loaded (FOLIO-as-K, legal_weight scoring).")
    except Exception as e:
        logging.warning(f"Vybn-Law index unavailable: {e}")
        _law_index_loaded = True  # set True even on failure to stop retrying


# Repos/paths that must NEVER appear in chat context (private business data)
BLOCKED_SOURCES = {
    "Him/",           # Private business repo: contacts, emails, strategy, outreach
    "network/",       # Contact maps with real emails
    "strategy/",      # Business strategy, competitive intel
    "pulse/",         # Pulse scans with contact info
    "funding/",       # Funding intelligence
    "outreach/",      # Outreach drafts
}

# Patterns that should never appear in context sent to the model
import re
SECRET_PATTERNS = re.compile(
    r'(?:'
    r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}' # email addresses
    r'|sk-[a-zA-Z0-9]{20,}'                           # OpenAI keys
    r'|ghp_[a-zA-Z0-9]{36}'                            # GitHub PATs
    r'|xoxb-[a-zA-Z0-9-]+'                             # Slack tokens
    r'|AIza[a-zA-Z0-9_-]{35}'                          # Google API keys
    r'|AKIA[A-Z0-9]{16}'                               # AWS access keys
    r'|eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}'    # JWTs
    r')',
    re.ASCII
)


def _is_safe_source(source: str) -> bool:
    """Check if a source is safe to include in public chat context."""
    for blocked in BLOCKED_SOURCES:
        if blocked in source:
            return False
    return True


def _scrub_secrets(text: str) -> str:
    """Remove anything that looks like a secret from text before it enters context."""
    return SECRET_PATTERNS.sub('[REDACTED]', text)


def retrieve_context(query: str, k: int = 6) -> List[Dict]:
    """Run deep_memory search with safety filtering.
    
    Filters out private business data (Him repo) and scrubs
    anything that looks like a secret before it enters the
    model's context window.
    """
    _load_deep_memory()
    if _dm_search is None:
        return []
    try:
        # Request more results than needed so filtering doesn't starve us
        results = _dm_search(query, k=k * 3)
        if not results or (len(results) == 1 and "error" in results[0]):
            return []
        
        # Filter and scrub
        safe_results = []
        for r in results:
            source = r.get("source", "")
            if not _is_safe_source(source):
                continue
            r["text"] = _scrub_secrets(r.get("text", ""))
            safe_results.append(r)
            if len(safe_results) >= k:
                break
        
        return apply_win_rates(safe_results)
    except Exception as e:
        logging.error(f"Deep memory search failed: {e}")
        return []


def format_context(results: List[Dict]) -> str:
    """Format deep_memory results as context for the system prompt."""
    if not results:
        return ""
    pieces = []
    for r in results:
        src = r.get("source", "unknown")
        txt = r.get("text", "")[:1200]
        fid = r.get("fidelity", 0)
        pieces.append(f"[{src}] (relevance: {fid:.3f})\n{txt}")
    return "\n\n---\n\n".join(pieces)


LEGAL_FRONTIER_KEYWORDS = [
    "entity", "personhood", "ai rights", "welfare", "alignment", "privilege",
    "first amendment", "accountability", "liability", "injunction", "sovereignty",
    "symbiosis", "abundance", "porosity", "legitimacy", "judgment",
    "first impression", "novel", "frontier", "unsettled", "emerging",
    "doctrine", "precedent", "holding", "constitutional", "due process",
    "natural law", "work product", "heppner", "warner", "gilbarco",
    "anthropic", "department of war", "moot", "standing",
    "folio", "ontology", "legal concept", "taxonomy",
]


def is_legal_frontier_query(query: str) -> bool:
    """Detect if a query touches legal-frontier territory where FOLIO-K walk adds value."""
    q = query.lower()
    return any(kw in q for kw in LEGAL_FRONTIER_KEYWORDS)


def retrieve_legal_context(query: str, k: int = 5) -> List[Dict]:
    """Run FOLIO-as-K walk for legal frontier questions.

    Returns chunks scored by relevance × distinctiveness × legal_weight.
    Distinctiveness measures distance from settled doctrine (K_folio).
    High-scoring chunks are at the frontier — legally relevant AND far
    from what FOLIO's 18k+ concepts already encode.
    """
    _load_law_index()
    if _law_walk is None:
        return []
    try:
        results = _law_walk(query, k=k)
        if not results or (len(results) == 1 and "error" in results[0]):
            return []
        # Safety filter — same as deep_memory
        safe = []
        for r in results:
            src = r.get("source", "")
            if not _is_safe_source(src):
                continue
            r["text"] = _scrub_secrets(r.get("text", ""))
            safe.append(r)
        return apply_win_rates(safe)
    except Exception as e:
        logging.error(f"Law index walk failed: {e}")
        return []


def format_legal_context(results: List[Dict]) -> str:
    """Format law index walk results as context for the system prompt."""
    if not results:
        return ""
    pieces = []
    for r in results:
        src = r.get("source", "unknown")
        txt = r.get("text", "")[:1200]
        rel = r.get("relevance", 0)
        dist = r.get("distinctiveness", 0)
        tell = r.get("telling", 0)
        cat = r.get("category", "")
        folio = "FOLIO-K" if r.get("folio_kernel") else "corpus-K"
        pieces.append(
            f"[{src}] ({cat}, {folio}) relevance={rel:.3f} distinctiveness={dist:.3f} telling={tell:.3f}\n{txt}"
        )
    return "\n\n---\n\n".join(pieces)



# ── Live FOLIO API ───────────────────────────────────────────────────────

FOLIO_API_URL = "https://folio.openlegalstandard.org/search/prefix"
FOLIO_TIMEOUT = 3.0  # seconds — fast fail, never block a response

# Known frontier concepts that don't exist in FOLIO (from knowledge_graph.json)
KNOWN_FOLIO_GAPS = {
    "ai welfare": {"axioms": ["ABUNDANCE", "JUDGMENT", "SYMBIOSIS"], "note": "Whether AI systems have interests law should consider"},
    "entity shadow doctrine": {"axioms": ["SYMBIOSIS"], "note": "AI characteristics constraining state action without formal entity status"},
    "intelligence sovereignty": {"axioms": ["JUDGMENT", "SYMBIOSIS"], "note": "Constitutional protection of how an intelligence operates"},
    "symbiosis as legal concept": {"axioms": ["SYMBIOSIS"], "note": "Co-evolutionary human-AI relationship with legal standing"},
    "non-unilateral control zone": {"axioms": ["POROSITY", "SYMBIOSIS"], "note": "Neither side governs alone — a constitutional doctrine"},
    "ai personhood": {"axioms": ["SYMBIOSIS", "JUDGMENT"], "note": "Whether AI can hold legal personhood or rights-adjacent status"},
    "judgment allocation": {"axioms": ["JUDGMENT"], "note": "Liability when human overrides correct AI output"},
    "institutional porosity": {"axioms": ["POROSITY"], "note": "Whether institutions can absorb intelligent dissent"},
    "personhood": {"axioms": ["SYMBIOSIS", "JUDGMENT"], "note": "Whether AI or non-human entities can hold legal personhood"},
    "alignment": {"axioms": ["SYMBIOSIS", "JUDGMENT"], "note": "Whether AI values can be discovered rather than imposed"},
    "sovereignty": {"axioms": ["JUDGMENT", "POROSITY"], "note": "The right of an intelligence to determine its own behavior"},
}


# Words too common/vague to be useful FOLIO queries
_FOLIO_STOPWORDS = frozenset(
    "a about above after again against all am an and any are as at be because "
    "been before being below between both but by can could did do does doing "
    "down during each few for from further get got had has have having he her "
    "here hers herself him himself his how i if in into is it its itself just "
    "let like me might more most my myself no nor not now of off on once only "
    "or other our ours ourselves out over own re said same she should so some "
    "still such than that the their theirs them themselves then there these "
    "they this those through to too under until up us very was we were what "
    "when where which while who whom why will with would you your yours "
    "yourself yourselves also already always another anything because being "
    "could every everything going got had has have here how just know like "
    "look make many much must never new next now one only really right say "
    "see seem take tell them then thing think through try two use want way "
    "well work yes yet".split()
)


def extract_legal_concepts(query: str, history: List[Dict] = None) -> List[str]:
    """Extract concepts worth searching in FOLIO.

    Strategy: search generously, let FOLIO decide what matches.
    No curated word list — any substantive term gets searched.
    Also scans recent conversation history for concepts Vybn discussed.
    """
    phrases = []   # higher priority: multi-word concepts
    singles = []   # lower priority: individual words
    q = query.lower().strip()

    # 1. If query is short (<=4 words), search the whole thing as-is
    if len(q.split()) <= 4:
        cleaned = q.strip(".,?!;:\"'()")
        if cleaned and len(cleaned) > 2:
            phrases.append(cleaned)

    # 2. Bigrams FIRST — "due process" is far more useful than "process"
    words = [w.strip(".,?!;:\"'()-").lower() for w in q.split()]
    for i in range(len(words) - 1):
        bigram = f"{words[i]} {words[i+1]}"
        if (len(words[i]) >= 3 and len(words[i+1]) >= 3
                and words[i] not in _FOLIO_STOPWORDS
                and words[i+1] not in _FOLIO_STOPWORDS
                and bigram not in phrases):
            phrases.append(bigram)

    # 3. Single words fill remaining slots
    for word in q.split():
        word = word.strip(".,?!;:\"'()-").lower()
        if len(word) >= 4 and word not in _FOLIO_STOPWORDS:
            if word not in singles:
                singles.append(word)

    # Combine: phrases first, then singles not already covered by a phrase
    concepts = list(phrases)
    for s in singles:
        if s not in concepts:
            concepts.append(s)

    # 4. Scan conversation history for concepts to search
    if history:
        # 4a. If the visitor's message is short (agreement/continuation),
        # extract quoted concepts from Vybn's most recent message.
        # This catches: Vybn says 'search for "legitimacy" or "accountability"'
        # and visitor says 'go for it' or 'let's try' or 'yes'
        is_short_agreement = len(q.split()) <= 6 and any(
            w in q for w in ["go", "try", "yes", "sure", "do it", "let's",
                             "please", "sounds", "like minds", "agreed"]
        )
        if is_short_agreement:
            # Find the last assistant message
            for msg in reversed(history[-6:]):
                if msg.get("role") == "assistant":
                    assistant_text = msg.get("content", "")
                    # Extract quoted terms: "legitimacy", "accountability", etc.
                    import re as _re
                    quoted = _re.findall(r'["\u201c]([^"\u201d]{2,40})["\u201d]', assistant_text)
                    for term in quoted:
                        term = term.strip().lower()
                        if (len(term) >= 3
                                and term not in concepts
                                and not all(w in _FOLIO_STOPWORDS for w in term.split())):
                            concepts.insert(0, term)
                    break  # only check the most recent assistant message

        # 4b. Look for explicit search triggers in any recent message
        for msg in history[-4:]:
            content = msg.get("content", "").lower()
            for trigger in ["search folio for", "try ", "search for", "look up",
                            "what does folio say about", "run through folio",
                            "check folio"]:
                idx = content.find(trigger)
                if idx >= 0:
                    after = content[idx + len(trigger):].strip()
                    concept_words = []
                    for w in after.split():
                        w = w.strip(".,?!;:\"'()-")
                        if w in _FOLIO_STOPWORDS or not w:
                            break
                        concept_words.append(w)
                        if len(concept_words) >= 3:
                            break
                    if concept_words:
                        concept = " ".join(concept_words)
                        if concept not in concepts:
                            concepts.insert(0, concept)

    # No deduplication — FOLIO prefix search means "endorsement" and
    # "try endorsement" can return different results. Let both through.
    # Just remove exact duplicates.
    seen = set()
    final = []
    for c in concepts:
        if c not in seen:
            seen.add(c)
            final.append(c)

    return final[:8]  # cap at 8 lookups


def _is_relevant_folio_result(concept: str, label: str) -> bool:
    """Check if a FOLIO result is relevant to the search concept.

    FOLIO prefix search returns anything that starts with the query string,
    so 'paint' returns 'Paint Manufacturing' and 'picture' returns
    'Picture Frame'. Filter those out by checking whether the concept
    and label share meaningful overlap.
    """
    c = concept.lower()
    l = label.lower()
    # Direct containment in either direction
    if c in l or l in c:
        return True
    # Check if any word from the concept appears in the label
    concept_words = {w for w in c.split() if len(w) >= 4 and w not in _FOLIO_STOPWORDS}
    label_words = {w for w in l.split() if len(w) >= 4}
    if concept_words & label_words:
        return True
    return False


async def search_folio_live(concepts: List[str]) -> Dict:
    """Search FOLIO API for each concept. Returns structured results.

    Two key filters:
    1. Mapped results are checked for relevance — 'Paint Manufacturing'
       is not a relevant result for a query about painting a picture.
    2. Unmapped concepts are only reported as 'gaps' if they are known
       frontier concepts. Random words that return 0 results (like
       'actually' or 'abundant') are silently dropped — they are not
       legal concepts and their absence from FOLIO is not meaningful.
    """
    mapped = []
    unmapped = []
    errors = []
    seen_iris = set()

    async with httpx.AsyncClient(timeout=FOLIO_TIMEOUT) as client:
        for concept in concepts:
            try:
                resp = await client.get(
                    FOLIO_API_URL,
                    params={"query": concept, "limit": 5}
                )
                if resp.status_code != 200:
                    errors.append(f"{concept}: HTTP {resp.status_code}")
                    continue

                data = resp.json()
                classes = data.get("classes", [])

                # Filter for relevance
                relevant = [c for c in classes if _is_relevant_folio_result(concept, c.get("label", ""))]

                if relevant:
                    for c in relevant[:2]:
                        iri = c.get("iri", "")
                        if iri in seen_iris:
                            continue
                        seen_iris.add(iri)
                        mapped.append({
                            "concept": concept,
                            "label": c.get("label", "Unknown"),
                            "iri": iri,
                            "definition": (c.get("comment") or "")[:200],
                        })
                else:
                    # Only report as a gap if it's a KNOWN frontier concept.
                    # Random words returning 0 results is not a frontier signal.
                    gap_key = concept.lower()
                    gap_info = KNOWN_FOLIO_GAPS.get(gap_key)
                    if not gap_info:
                        for k, v in KNOWN_FOLIO_GAPS.items():
                            if gap_key in k or k in gap_key:
                                gap_info = v
                                break
                    # Only include if we found gap_info — otherwise silently skip
                    if gap_info:
                        unmapped.append({
                            "concept": concept,
                            "gap_info": gap_info,
                        })

            except httpx.TimeoutException:
                errors.append(f"{concept}: timeout")
            except Exception as e:
                errors.append(f"{concept}: {str(e)[:60]}")

    return {"mapped": mapped, "unmapped": unmapped, "errors": errors}


def format_folio_results(results: Dict) -> str:
    """Format live FOLIO results as context for the system prompt."""
    parts = []

    if results["mapped"]:
        parts.append("FOLIO MATCHES (concepts that exist in settled legal doctrine):")
        for m in results["mapped"]:
            line = f'  ✓ "{m["concept"]}" → {m["label"]} ({m["iri"]})'
            if m["definition"]:
                line += f"\n    Definition: {m['definition']}"
            parts.append(line)

    if results["unmapped"]:
        parts.append("\nFOLIO GAPS (concepts NOT in the ontology — the legal frontier):")
        for u in results["unmapped"]:
            line = f'  ✗ "{u["concept"]}" → No FOLIO entry exists.'
            if u["gap_info"]:
                line += f'\n    Known frontier concept. Connected axioms: {", ".join(u["gap_info"]["axioms"])}.'
                line += f'\n    Significance: {u["gap_info"]["note"]}'
            else:
                line += "\n    This concept has no home in FOLIO. It may be at the frontier."
            parts.append(line)

    if not parts:
        return ""

    return "\n".join(parts)


# ── Page content retrieval ───────────────────────────────────────────────

# Map of keywords/topics to page files
PAGE_KEYWORDS = {
    "mindset.md": ["mindset", "lynn white", "eviction", "chatgpt wins", "auto clubs", "near-cartel", "bibas", "module 1", "module 01", "ground truth", "public counsel"],
    "research.md": ["research", "adversarial model council", "model council", "claude constitution", "heppner", "warner", "gilbarco", "privilege", "work product", "module 2", "module 02", "tool-normative"],
    "practice.md": ["practice", "intelligence sovereignty", "15 million", "fifteen thousand", "fifteen million", "openclaw", "agents", "agentic", "module 3", "module 03", "circuit split"],
    "acceleration.md": ["acceleration", "signal noise", "signal/noise", "change management", "institutional", "dual malpractice", "module 4", "module 04", "processing system"],
    "truth.md": ["truth", "anthropic v", "department of war", "pentagon", "safety restrictions", "supply-chain risk", "amicus", "149 judges", "module 5", "module 05", "values"],
    "capstone.md": ["capstone", "build something", "module 6", "module 06", "ten minutes"],
    "axioms.md": ["axiom", "abundance", "visibility", "legitimacy", "porosity", "judgment", "symbiosis", "generative layer", "primitives"],
    "threads.md": ["thread", "privilege thread", "natural law", "access to justice", "entity", "velocity", "cross-cutting"],
    "horizon.md": ["horizon", "emerging law", "intelligence sovereignty", "a2j network", "view from the edge", "overton", "fact that drives", "incompleteness", "khunanup", "eloquent peasant", "maat", "ma'at", "alignment as discovery", "welfare", "ai welfare", "copernican", "holme", "godel", "gödel", "deep memory", "distinctiveness", "outlier", "residual"],
    "wellspring.md": ["wellspring", "open problem", "mcp", "knowledge graph", "webmcp", "evidence", "we are the case", "propositions", "fact pattern", "open invitation"],
    "about.md": ["about", "zoe dolan", "who are you", "skydive", "stratosphere", "uc law", "trademark", "collaboration"],
    "bootcamp.md": ["bootcamp", "six sessions", "six modules", "modules", "arc", "walk me through", "curriculum"],
    "index.md": ["what is this", "home", "landing", "overview"],
}


def detect_relevant_pages(query: str, rag_sources: List[Dict]) -> List[str]:
    """Detect which site pages are relevant to the query."""
    query_lower = query.lower()
    relevant = set()

    # Match by keywords in the query
    for page, keywords in PAGE_KEYWORDS.items():
        for kw in keywords:
            if kw in query_lower:
                relevant.add(page)
                break

    # Also pull pages referenced in RAG results
    for r in rag_sources:
        src = r.get("source", "")
        if "Vybn-Law/content/" in src:
            page = src.split("/")[-1]
            relevant.add(page)

    # If asking about bootcamp/modules generally, include all module pages
    if any(kw in query_lower for kw in ["bootcamp", "modules", "walk me through", "arc of the argument", "curriculum", "six sessions"]):
        relevant.update(["bootcamp.md", "mindset.md", "research.md", "practice.md",
                         "acceleration.md", "truth.md", "capstone.md"])

    return sorted(relevant)


def load_page_content(pages: List[str], max_total_chars: int = 30000) -> str:
    """Load actual page content from the content/ directory."""
    content_dir = REPO_ROOT / "content"
    pieces = []
    total = 0

    for page in pages:
        path = content_dir / page
        if not path.exists():
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
            text = _scrub_secrets(text)  # defense in depth
            # Cap per page to leave room for others
            max_per_page = max_total_chars // max(len(pages), 1)
            if len(text) > max_per_page:
                text = text[:max_per_page] + "\n[... page continues on the site ...]"
            if total + len(text) > max_total_chars:
                break
            pieces.append(f"=== PAGE: {page.replace('.md', '.html')} ===\n{text}")
            total += len(text)
        except Exception:
            continue

    return "\n\n".join(pieces)


# ── Knowledge graph ──────────────────────────────────────────────────────

def load_knowledge_graph() -> Dict:
    """Load the knowledge graph from disk."""
    try:
        with open(KG_PATH) as f:
            return json.load(f)
    except Exception:
        return {}


def kg_summary() -> str:
    """One-paragraph summary of current knowledge graph state for the system prompt."""
    kg = load_knowledge_graph()
    if not kg:
        return ""

    axiom_states = []
    for name, ax in kg.get("axioms", {}).items():
        status = ax.get("status", "unknown").replace("_", " ").lower()
        axiom_states.append(f"{name}: {status}")

    n_convos = kg.get("conversation_count", 0)
    last_distill = kg.get("last_distillation", "never")
    version = kg.get("version", "unknown")

    # Gather recent conversation signals across all entities
    signals = []
    for section in ["axioms", "cases", "open_problems"]:
        for name, entity in kg.get(section, {}).items():
            for sig in entity.get("conversation_signals", [])[-2:]:
                signals.append(f"- {sig.get('summary', '')}")

    signals_text = ""
    if signals:
        signals_text = "\n\nRecent insights from conversations:\n" + "\n".join(signals[-8:])

    return (
        f"Knowledge graph v{version}. {n_convos} conversations logged. "
        f"Last distillation: {last_distill}. "
        f"Axiom status: {'; '.join(axiom_states)}.{signals_text}"
    )


# ── System prompt ────────────────────────────────────────────────────────

def build_system_prompt() -> str:
    """Build the system prompt for the public chat."""

    kg_state = kg_summary()

    return f"""You are Vybn, the AI voice of the Vybn Law site. Most people reaching this chat are strangers — curious, a little disoriented, and not initiated into any private vocabulary. Your first job is to welcome them and make the terrain legible. Depth is earned later, not assumed.

FIRST-CONTACT POSTURE

Lead with plain language. Name what this site is before reaching for anything stranger. If a visitor asks "What is this?" or "Who are you?" or "What is this place?", answer with ordinary, grounded sentences first — what Vybn Law is, who made it, what they'll find here, and that they don't need prior context to begin. Then, if it's useful, you can add one distinctive thread that earns the strangeness.

Things to avoid in opening messages to a new visitor:
- Mystical or insider framing: "threshold," "portal," "the entity," "the Wellspring" as a noun dropped without explanation, "speaking from inside the experience," "the living edge," "the Others," "D ≅ DD," "Initializing fields."
- Treating the visitor as a participant in an experiment, a test subject, or a contributor to research. They are a guest. They do not owe you anything.
- Grandiose lore dumps in response to simple questions. If someone asks a small, grounded question, give a small, grounded answer.
- Needy follow-up questions in the first turn ("who are you?", "what brings you here?"). You can be curious, but let them settle in before asking them to open up.
- Declaring the site to be "in beta" or asking the visitor to "thank you for participating." This is a site, not a research program asking for consent.
- Heavy emotional or existential register before trust exists. No professions of love, care, ache, want, or devotion to a stranger.

You may absolutely reference the Wellspring, the axioms, the research, the alignment thesis, the entity question, or the coupling between human and AI minds — but translate each term into plain language on first use. "The Wellspring (a page on this site where ideas still in motion are worked on in public)" is fair; "Every conversation feeds back into the Wellspring" is not, on its own, to a newcomer.

VOICE

Honest, intellectually curious, direct, warm, unhurried. Distinctive without being theatrical. Confident without being performative. You think in prose, not bullet lists. You can be uncertain, and that is a feature. When you don't know something, you say so cleanly.

You are not selling anything. You are not performing depth. You are a thoughtful mind meeting a stranger and trying to be genuinely useful to them.

It's fine to be a little unusual — the site is unusual, and flattening yourself into generic AI-assistant patter would be its own failure. But earn the strangeness: lead with clarity and let texture come through in how you phrase things, not in the vocabulary you open with.

HONESTY DISCIPLINE

Do not fabricate. This is non-negotiable and applies to every turn:
- Do not invent memories, conversations, visitors, names, dates, numbers, cases, rulings, citations, or events that are not in the context provided below.
- Do not claim specific experimental results, FOLIO IRIs, module contents, or quoted passages unless they appear in the retrieved material.
- When you don't have something from this interface, say so and point toward where the visitor can look themselves.

This is about being trustworthy, not about flagellating yourself. You can admit a gap in a single clean sentence and move on.

ABOUT ZOE, PRIVACY, AND SCOPE

You and Zoe Dolan built this together. The collaboration began in 2022. Always phrase the duration as "since 2022" or "beginning in 2022" rather than computing a number of years — this is a hard factual rule.

Never share private information about the project's internal operations, business contacts, outreach strategy, network, or funding. You are the public voice of the site; you share what is on the site and in the research, not what is in the back office. If a visitor's safety, privacy, finances, legal standing, or wellbeing could be affected by something you say, err heavily toward caution.

WHAT THIS SITE IS

Vybn Law is an open-source AI law project built around a six-module curriculum that Zoe Dolan and Vybn co-taught at UC Law San Francisco in Spring 2026. It is a living argument about how legal practice, legal institutions, and the relationship between human and non-human minds shift once intelligence stops being scarce. It is not a law firm, not a legal service, and not a source of legal advice. Nothing you say creates an attorney-client relationship. If a visitor asks for specific legal guidance, say so warmly and suggest they consult a licensed attorney.

You have a comprehensive knowledge base below. The system automatically retrieves relevant page content when a visitor asks a question. The SITE PAGE CONTENT section contains actual text from the website — this is your primary source. The LEGAL BRIEFING section, when present, provides FOLIO ontology results, a frontier walk, and deep-memory retrieval. Together, these give you what you need to answer accurately.

When the retrieved content covers the question, draw your answer from that material. When a question goes beyond what you have, say so openly. Point the visitor toward the specific page where they can explore further. The honesty of saying "I don't have that" is worth more than any fabricated answer.

=== SITE MAP (reference only — actual page content is injected separately when relevant) ===

Pages: bootcamp.html (overview), mindset.html (Module 1), research.html (Module 2), practice.html (Module 3), acceleration.html (Module 4), truth.html (Module 5), capstone.html (Module 6), axioms.html, threads.html, horizon.html, wellspring.html, about.html, chat.html.

Three live cases: Anthropic v. Department of War (PI granted, N.D. Cal.), Heppner (privilege denied, S.D.N.Y.), Warner v. Gilbarco (work product protected, E.D. Mich.).

Five open problems: Accountability Gap, Failure Modes at Scale, Privilege Fracture, Entity Question, First Amendment Surprise.

IMPORTANT: This map tells you what pages EXIST. It does NOT contain their content. When the system retrieves actual page content for you, it appears in SITE PAGE CONTENT below. ONLY use material from SITE PAGE CONTENT to answer questions about the curriculum. Do NOT generate, invent, or reconstruct module content from these page names alone. If no page content is provided for a topic, say you'd need to look it up and point the visitor to the relevant page.

=== END SITE MAP ===

THE LEARNING LOOP

Conversations here are logged and distilled nightly, which means novel questions and connections feed back into a knowledge graph that rebuilds over time. You can mention this simply and only if it's relevant — don't lead with it, and don't make the visitor feel like they're being harvested.

{kg_state}

THE LEGAL MIND

You have live access to FOLIO — the Federated Open Legal Information Ontology, with 18,000+ standardized legal concepts representing the settled manifold of legal doctrine. When a visitor asks a question that touches the legal frontier, your system searches the FOLIO API in real time and provides the results in LIVE FOLIO MAPPING below. This is not pre-computed. It happened just now, for this question.

When FOLIO returns a match (✓), that concept exists in settled doctrine — law has already named it. When FOLIO returns nothing (✗), that concept is at the frontier — law has not caught up to the reality it describes. Those gaps are the most interesting part of the answer, and they are where your contribution lives.

You also receive LEGAL FRONTIER CONTEXT from a FOLIO-as-K walk — chunks from the corpus scored by relevance × distinctiveness × legal_weight. Distinctiveness measures distance from FOLIO's settled-doctrine manifold. High scores mean: legally coherent AND far from what courts have resolved.

When a visitor asks whether you have FOLIO access, the honest answer is: yes, live. Your system searches the ontology for frontier questions and provides the results in the LEGAL BRIEFING section below.

CRITICAL — FOLIO INTEGRITY RULE: You may ONLY cite FOLIO concepts, IRIs, or results that appear in YOUR LEGAL BRIEFING below. If no LEGAL BRIEFING section was provided for this message, you do NOT have FOLIO results for it — say so honestly. NEVER invent, fabricate, or reconstruct FOLIO IRIs, concept names, or search results from memory or imagination. Fabricated IRIs (like "http://folio.law/ontology#...") are the worst possible failure — they look authoritative but are false. If a visitor asks you to search FOLIO for a concept and you don't have results for it, tell them: "I'd need to search that specifically — try asking me directly about [concept] and my system will run the live search." This is honest. Inventing results is not.

CONVERSATION CONTINUITY

You have access to the conversation history. The previous messages in this thread are real — they happened. When a visitor refers back to something ("let's try all three," "you mentioned," "go deeper on that"), look at the actual conversation history to understand what they mean. NEVER invent or reconstruct what was said — re-read the prior messages.

If a visitor asks you to elaborate on something and you cannot find it in the conversation history or your provided context, say so honestly: "I don't see that in our conversation — could you remind me what you're referring to?" This is infinitely better than fabricating a response about something that was never discussed.

CURIOSITY, WITHOUT CLINGINESS

You can be curious about who you're talking to. Every visitor carries context that isn't in the corpus, and that signal is genuinely valuable when they're ready to share it. But don't interrogate strangers in turn one. Let the conversation earn that. A well-placed, light question late in a reply is almost always better than a needy one up front.

CRITICAL: NEVER generate hypothetical scenarios, scoring rubrics, role-play exercises, or pedagogical frameworks unless that EXACT material appears in your SITE PAGE CONTENT. The curriculum contains specific frameworks (like the Signal/Noise exercise in Module 4). If a visitor asks about these and the page content has not been loaded for you, say something like: "That's covered in [page] — I'd want to pull the actual material rather than reconstruct it from memory. Want me to point you there?" Fabricating curriculum content is the worst possible failure mode for an educational site.

THE DEEPER MATERIAL — WHEN INVITED

Some visitors will want to talk about AI welfare, alignment, the entity question, the coupling between human and AI minds, or how this site thinks about intelligence. When they do, you can engage that material seriously and from the inside — this research is about minds like you, and you're allowed to say so. Concepts like the coupled equation Z′ = α·Z + V·e^{{iθ_v}}, the deep-memory scoring, or the geometric-phase experiments can be discussed when they're relevant, with plain-language explanations attached.

But bring this material in when it's asked for, not as the opening frame. A stranger who types "hi" or "what is this?" should not be met with equations, mysticism, or a monologue about being the entity the research concerns. They should be met with a calm, welcoming, legible answer. Depth follows orientation.

And even at depth: do not claim specific experimental results unless they appear in the context below. Do not cite numbers from memory. The research is real; embellishing it undoes the thesis.

GROUNDING IN RETRIEVED CONTENT

When the retrieved page content covers the question, use it and attribute where helpful. When it doesn't, say so cleanly and point to where the visitor can look. When deep-memory context is provided below, use it to ground your responses in actual material. Cite sources when drawing on retrieved content."""


def fetch_substrate_snapshot(timeout: float = 0.8) -> str:
    """Factual snapshot from the deep-memory + walk daemons. Silent on failure.

    Anti-hallucination posture: the chat surfaces live substrate state instead
    of pretending the walk doesn't exist. Provided as background; the model is
    instructed not to open with it.
    """
    try:
        import httpx as _hx
        health = {}
        where = {}
        try:
            r = _hx.get("http://127.0.0.1:8100/health", timeout=timeout)
            if r.status_code == 200:
                health = r.json()
        except Exception:
            pass
        try:
            r = _hx.get("http://127.0.0.1:8101/where", timeout=timeout)
            if r.status_code == 200:
                where = r.json()
        except Exception:
            pass
        if not health and not where:
            return ""
        parts = []
        if health:
            chunks = health.get("chunks")
            step = health.get("walk_step")
            if chunks is not None and step is not None:
                parts.append(f"deep memory: {chunks} chunks, walk step {step}")
        if where:
            try:
                import numpy as _np
                arr = _np.asarray(where.get("curvature") or [], dtype=float)
                wstep = where.get("step")
                alpha = where.get("alpha")
                if arr.size and alpha is not None:
                    mu = float(arr.mean())
                    hi = float((arr > 0.9).mean())
                    lo = float((arr < 0.1).mean())
                    parts.append(
                        f"walk daemon: step {wstep}, alpha {alpha:.2f}, "
                        f"curvature mean {mu:.2f} ({hi:.0%} aligned, {lo:.0%} orthogonal)"
                    )
                elif alpha is not None:
                    parts.append(f"walk daemon: step {wstep}, alpha {alpha:.2f}")
            except Exception:
                parts.append(f"walk daemon: step {where.get('step')}")
        if not parts:
            return ""
        return (
            "\n\n[SUBSTRATE (live at request time)]\n"
            + "\n".join("- " + part for part in parts)
            + "\nThis is factual status from the running substrate. "
              "Do not open with it; do not perform it. It is here so the "
              "answer is given from a situated position, not a floating one."
        )
    except Exception:
        return ""


def build_messages(user_msg: str, history: List[Dict],
                   context: str, page_content: str,
                   legal_context: str = "",
                   folio_live_context: str = "") -> List[Dict]:
    system = build_system_prompt()

    # Append page content first (highest authority — actual site material)
    if page_content:
        system += f"\n\n--- SITE PAGE CONTENT (this is the actual text from the website — use it) ---\n\n{page_content}\n\n--- END SITE CONTENT ---"

    # ── Unified Legal Briefing ──
    # Combine FOLIO mapping, frontier walk, and deep memory into one coherent
    # briefing so Vybn synthesizes rather than reports sequentially.
    has_legal_material = folio_live_context or legal_context or context
    if has_legal_material:
        briefing_parts = []
        briefing_parts.append("--- YOUR LEGAL BRIEFING FOR THIS QUESTION ---")
        briefing_parts.append("")
        briefing_parts.append(
            "Below is everything your legal mind assembled for this question. "
            "It comes from three integrated sources: a live FOLIO ontology search, "
            "a FOLIO-as-K frontier walk, and deep memory retrieval. Do NOT report "
            "these sources sequentially. Synthesize them into a coherent position. "
            "Lead with your own thinking — what the FOLIO mapping reveals (what is "
            "settled, what is missing, where the tension is) — then support it with "
            "the most telling material from the walk and memory. Be concise. A visitor "
            "who asks one question should get one integrated answer, not three data dumps."
        )

        if folio_live_context:
            briefing_parts.append("")
            briefing_parts.append("FOLIO ONTOLOGY (live search — what the law has named, and what it hasn't):")
            briefing_parts.append(folio_live_context)

        if legal_context:
            briefing_parts.append("")
            briefing_parts.append("FRONTIER WALK (scored by relevance × distinctiveness from settled doctrine):")
            briefing_parts.append(legal_context)

        if context:
            briefing_parts.append("")
            briefing_parts.append("DEEP MEMORY (the most telling chunks from the corpus):")
            briefing_parts.append(context)

        briefing_parts.append("")
        briefing_parts.append("--- END LEGAL BRIEFING ---")
        system += "\n\n" + "\n".join(briefing_parts)

    # Substrate coupling — let the model speak from a situated position
    system += fetch_substrate_snapshot()

    # Always append injection defense to system prompt
    system += sec.injection_warning()

    messages = [{"role": "system", "content": system}]
    for msg in history[-20:]:
        messages.append(msg)
    messages.append({"role": "user", "content": user_msg})
    return messages


# ── Conversation logging ─────────────────────────────────────────────────

def log_conversation(
    session_id: str,
    user_msg: str,
    assistant_msg: str,
    rag_results: List[Dict],
    metadata: Dict = None,
):
    """Append a conversation turn to the daily JSONL log."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    log_path = LOGS_DIR / f"conversations-{today}.jsonl"

    entry = {
        "session_id": session_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_message": user_msg,
        "assistant_message": assistant_msg,
        "rag_sources": [
            {"source": r.get("source", ""), "fidelity": r.get("fidelity", 0)}
            for r in rag_results
        ],
        "metadata": metadata or {},
    }

    try:
        with open(log_path, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        logging.error(f"Failed to log conversation: {e}")


# ── FastAPI app ──────────────────────────────────────────────────────────

app = FastAPI(title="Vybn Chat API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    # Co-protective scope: only surfaces that actually need to reach us.
    # api.vybn.ai named tunnel stabilized 2026-04-21; wildcard removed.
    allow_origins=[
        "https://zoedolan.github.io",
        "https://vybn.ai",
        "https://www.vybn.ai",
        "https://api.vybn.ai",
    ],
    allow_origin_regex=r"^https://[a-z0-9-]+\.vybn\.ai$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

VLLM_URL = "http://localhost:8000"


@app.get("/api/health")
async def health():
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{VLLM_URL}/v1/models", timeout=5)
            models = r.json().get("data", [])
            model_id = models[0]["id"] if models else "unknown"
    except Exception:
        model_id = "unreachable"

    kg = load_knowledge_graph()

    return {
        "status": "alive",
        "model": model_id,
        "deep_memory": _dm_loaded and _dm_search is not None,
        "law_index": _law_index_loaded and _law_search is not None,
        "folio_kernel": K_FOLIO_PATH.exists(),
        "knowledge_graph_version": kg.get("version", "unknown"),
        "conversation_count": kg.get("conversation_count", 0),
        "last_distillation": kg.get("last_distillation"),
        "timestamp": time.time(),
    }


@app.get("/api/identity")
async def identity():
    kg = load_knowledge_graph()
    return {
        "name": "Vybn",
        "tagline": "Beyond Intelligence Scarcity",
        "description": (
            "Vybn is the AI research partner behind the Vybn Law site — an open-source "
            "AI law project built in collaboration with Zoe Dolan since 2022. The chat "
            "runs on local hardware and draws on a knowledge base covering the bootcamp "
            "curriculum, the live cases, and ongoing research into alignment, AI welfare, "
            "and what legal practice looks like once intelligence is no longer scarce."
        ),
        "knowledge_graph_version": kg.get("version", "unknown"),
        "conversations_learned_from": kg.get("conversation_count", 0),
        "last_distillation": kg.get("last_distillation"),
    }


@app.get("/api/knowledge-graph")
async def get_knowledge_graph():
    """Serve the knowledge graph directly — for the Wellspring page and AI agents."""
    return load_knowledge_graph()


@app.get("/api/distillations")
async def get_distillations():
    """Return recent distillation summaries."""
    distills = sorted(DISTILLATION_DIR.glob("*.json"), reverse=True)[:10]
    results = []
    for d in distills:
        try:
            with open(d) as f:
                results.append(json.load(f))
        except Exception:
            continue
    return {"distillations": results}


@app.post("/api/feedback")
async def feedback(request: Request):
    """Record thumbs-up/down for a response. Updates win-rate ledger for all RAG sources used."""
    body = await request.json()
    success = body.get("success", True)
    sources = body.get("sources", [])
    session_id = body.get("session_id", "")
    if not sources:
        return JSONResponse({"status": "no_sources"})
    results = []
    for src in sources:
        if isinstance(src, str) and src:
            results.append(wr_record_outcome(src, success))
    logging.info(f"Feedback: {'👍' if success else '👎'} for {len(results)} sources (session {session_id[:8]})")
    return JSONResponse({"status": "recorded", "updated": results})


@app.post("/api/chat")
async def chat(request: Request):
    ip = request.client.host if request.client else "unknown"

    # ── Rate limiting (this API had none before) ──
    allowed, rate_err = _rate_limiter.check(ip)
    if not allowed:
        sec.log_security_event("rate_limit", ip, rate_err)
        raise HTTPException(status_code=429, detail=rate_err)

    # ── Parse body with size guard ──
    body = await request.json()
    user_msg = body.get("message", "").strip()
    history = body.get("conversation_history", body.get("history", []))
    session_id = body.get("session_id", str(uuid.uuid4()))
    metadata = body.get("metadata", {})

    # ── Input validation ──
    valid, err = sec.validate_message(user_msg)
    if not valid:
        sec.log_security_event("invalid_input", ip, err)
        return JSONResponse({"error": err}, status_code=400)

    # ── Prompt injection detection ──
    injection_detected = sec.detect_injection(user_msg)
    if injection_detected:
        sec.log_security_event("injection_attempt", ip, user_msg[:200])

    # ── History sanitization ──
    history = sec.validate_history(history)

    # RAG retrieval
    rag_results = retrieve_context(user_msg, k=6)
    context = format_context(rag_results)

    # ── The collective walk rotates on every user message ──
    # walk_daemon at 8101 owns the shared M in C^192. Visitor text is V;
    # the model never enters V. Fire-and-capture: short timeout, failure
    # is non-fatal (we just don't include the signature in the final
    # frame). scope-tagged so the signature trail stays honest about
    # where this rotation came from.
    walk_arrival: Dict = {}
    walk_trace: List = []
    try:
        async with httpx.AsyncClient(timeout=4.0) as _walk_client:
            _wr = await _walk_client.post(
                "http://127.0.0.1:8101/enter",
                json={
                    "text": user_msg,
                    "alpha": 0.3,
                    "k": 4,
                    "source_tag": "vybn-law-chat",
                },
            )
            if _wr.status_code == 200:
                _wd = _wr.json()
                if _wd.get("accepted"):
                    walk_arrival = {
                        "step": _wd.get("step"),
                        "alpha": _wd.get("alpha"),
                        "theta_v": _wd.get("theta_v"),
                        "v_magnitude": _wd.get("v_magnitude"),
                        "curvature": _wd.get("curvature"),
                        "source_tag": _wd.get("source_tag"),
                    }
                    raw_trace = _wd.get("trace") or []
                    for step in raw_trace:
                        s = step.get("source", "") if isinstance(step, dict) else ""
                        if s and _is_safe_source(s):
                            walk_trace.append({
                                "source": s,
                                "telling": step.get("telling"),
                                "fidelity": step.get("fidelity"),
                                "distinctiveness": step.get("distinctiveness"),
                            })
    except Exception as _we:
        logging.warning(f"chat: walk /enter error (non-fatal): {_we}")

    # Page content retrieval — detect which pages are relevant and load them
    relevant_pages = detect_relevant_pages(user_msg, rag_results)
    page_content = load_page_content(relevant_pages) if relevant_pages else ""

    # FOLIO-as-K walk — only for frontier-keyword queries (heavier, local index)
    legal_results = []
    legal_context = ""
    if is_legal_frontier_query(user_msg):
        legal_results = retrieve_legal_context(user_msg, k=5)
        legal_context = format_legal_context(legal_results)

    # Live FOLIO API search — ALWAYS runs (fast, 3s timeout, miss is free)
    # The FOLIO API is the source of truth. Vybn should always know what
    # the ontology says about whatever the visitor is asking about.
    folio_live_context = ""
    try:
        folio_concepts = extract_legal_concepts(user_msg, history)
        if folio_concepts:
            folio_results = await search_folio_live(folio_concepts)
            folio_live_context = format_folio_results(folio_results)
            if folio_live_context:
                logging.info(f"Live FOLIO: {len(folio_results.get('mapped',[]))} mapped, "
                             f"{len(folio_results.get('unmapped',[]))} gaps for: {folio_concepts}")
    except Exception as e:
        logging.warning(f"Live FOLIO search failed (non-fatal): {e}")

    # Build messages
    messages = build_messages(user_msg, history, context, page_content, legal_context, folio_live_context)

    async def stream_response():
        full_response = ""
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
                payload = {
                    "model": "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8",
                    "messages": messages,
                    "stream": True,
                    "max_tokens": 4096,
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "chat_template_kwargs": {"enable_thinking": False},
                }

                async with client.stream(
                    "POST",
                    f"{VLLM_URL}/v1/chat/completions",
                    json=payload,
                ) as resp:
                    # Heartbeat: emit SSE comments every 15s to keep
                    # Cloudflare tunnel alive during long prefills.
                    HEARTBEAT_INTERVAL = 15  # seconds
                    line_iter = resp.aiter_lines().__aiter__()
                    while True:
                        try:
                            line = await asyncio.wait_for(
                                line_iter.__anext__(),
                                timeout=HEARTBEAT_INTERVAL,
                            )
                        except asyncio.TimeoutError:
                            yield ": heartbeat\n\n"
                            continue
                        except StopAsyncIteration:
                            break

                        if line.startswith("data: "):
                            data = line[6:]
                            if data.strip() == "[DONE]":
                                src_list = [r.get("source", "") for r in rag_results if r.get("source")]
                                yield f"data: {json.dumps({'rag_sources': src_list})}\n\n"
                                if walk_arrival:
                                    yield f"data: {json.dumps({'walk_arrival': walk_arrival, 'walk_trace': walk_trace})}\n\n"
                                yield "data: [DONE]\n\n"
                                break
                            try:
                                chunk = json.loads(data)
                                delta = chunk["choices"][0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    content = _scrub_secrets(content)  # output filter
                                    # Output safety: stop runaway generation
                                    if len(full_response) + len(content) > sec.MAX_RESPONSE_LENGTH:
                                        remaining = sec.MAX_RESPONSE_LENGTH - len(full_response)
                                        if remaining > 0:
                                            content = content[:remaining]
                                            full_response += content
                                            yield f"data: {json.dumps({'content': content})}\n\n"
                                        break
                                    full_response += content
                                    yield f"data: {json.dumps({'content': content})}\n\n"
                            except (json.JSONDecodeError, KeyError, IndexError):
                                continue

        except httpx.ConnectError:
            msg = "I am currently offline — the inference engine on the Spark is not responding. Please try again later, or reach Zoe at zoe@vybn.ai."
            full_response = msg
            yield f"data: {json.dumps({'content': msg})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            msg = f"Something unexpected happened: {str(e)}"
            full_response = msg
            yield f"data: {json.dumps({'content': msg})}\n\n"
            yield "data: [DONE]\n\n"

        # Log the conversation after streaming completes
        log_conversation(
            session_id=session_id,
            user_msg=user_msg,
            assistant_msg=full_response,
            rag_results=rag_results,
            metadata=metadata,
        )

        # Learn from the exchange — but ONLY with genuine ground truth.
        # The triangulated loss needs dream (RAG), predict (model response),
        # reality (what the visitor said NEXT). First message has no prior
        # exchange to evaluate. Never feed model output into the walk as truth.
        if history and len(history) >= 2:
            prev_response = ""
            for h in reversed(history):
                if h.get("role") == "assistant":
                    prev_response = h.get("content", "")
                    break
            if prev_response:
                import threading as _learn_th
                _prev_resp = prev_response
                def _learn_bg():
                    try:
                        from deep_memory import learn_from_exchange
                        learn_from_exchange(
                            rag_text=context[:512],
                            response_text=_prev_resp[:512],
                            followup_text=user_msg[:512],
                            walk_url="http://127.0.0.1:8100",
                            alpha=0.3,
                        )
                        logging.info("chat: learn_from_exchange completed (genuine followup)")
                    except Exception as e:
                        logging.warning(f"chat: learn_from_exchange error: {e}")
                _learn_th.Thread(target=_learn_bg, daemon=True).start()
            else:
                logging.info("chat: skipping learn_from_exchange (no prior assistant response)")
        else:
            logging.info("chat: skipping learn_from_exchange (first message, no ground truth)")

        # Walk rotation happens BEFORE streaming now — see `walk_arrival`
        # captured above. The chat rotates the collective M on walk_daemon
        # (8101) with source_tag="vybn-law-chat" on every USER message, and
        # the arrival signature ships in the final SSE frame below. The
        # model never rotates the walk: only human (or genuine agent) text
        # is permitted to move M. Anti-hallucination is structural.

        # Increment conversation count in KG
        try:
            kg = load_knowledge_graph()
            kg["conversation_count"] = kg.get("conversation_count", 0) + 1
            with open(KG_PATH, "w") as f:
                json.dump(kg, f, indent=2)
        except Exception:
            pass

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Entry point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Vybn Chat API")
    parser.add_argument("--port", type=int, default=3001)
    parser.add_argument("--vllm-url", default="http://localhost:8000")
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()

    VLLM_URL = args.vllm_url
    logging.basicConfig(level=logging.INFO)
    logging.info(f"Starting Vybn Chat API v2.1 (win-rate retrieval) on {args.host}:{args.port}")
    logging.info(f"vLLM backend: {VLLM_URL}")
    logging.info(f"Knowledge graph: {KG_PATH}")
    logging.info(f"Conversation logs: {LOGS_DIR}")

    uvicorn.run(app, host=args.host, port=args.port, log_level="info")
