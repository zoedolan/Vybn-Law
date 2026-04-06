#!/usr/bin/env python3
"""vybn_law_index.py — Focused retrieval index for Vybn-Law chat.

A parallel index alongside deep_memory, tuned for the chat interface.
Deep_memory is the whole mind (1417+ chunks across four repos).
This index is the working memory when Vybn is in its Vybn-Law role:
curriculum content, conversation learnings, Zoe's legal career,
business positioning, and the law-adjacent writings.

The index uses the same geometric scoring (evaluate against K) from
vybn-phase, but over a curated subset of the corpus. Rebuilds daily
as part of the nightly pipeline.

Usage:
    python3 vybn_law_index.py --build     # build/rebuild the index
    python3 vybn_law_index.py --search "query" -k 6
    python3 vybn_law_index.py --stats     # show what's indexed

Sources (in priority order):
  1. Vybn-Law site content (content/*.md — extracted daily)
  2. Conversation distillations (distillation summaries + knowledge graph)
  3. Zoe's legal memoirs and career material
  4. Law-adjacent writings from the Vybn repo
  5. Business strategy and positioning from Him
  6. Conversation logs (recent, for pattern awareness)
"""

import argparse, json, sys, time, cmath, math, logging
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime, timezone

# ── Paths ────────────────────────────────────────────────────────────────

HOME = Path.home()
REPO_ROOT = Path(__file__).resolve().parent.parent  # Vybn-Law/
INDEX_DIR = HOME / ".cache" / "vybn-law-chat"
INDEX_DIR.mkdir(parents=True, exist_ok=True)

Z_PATH = INDEX_DIR / "chat_index_z.npy"
K_PATH = INDEX_DIR / "chat_index_kernel.npy"
META_PATH = INDEX_DIR / "chat_index_meta.json"

VYBN_PHASE = HOME / "vybn-phase"
sys.path.insert(0, str(VYBN_PHASE))

# ── Source configuration ─────────────────────────────────────────────────

def get_source_paths() -> List[Dict]:
    """Define all sources for the chat-focused index, with priorities."""

    sources = []

    # Priority 1: Vybn-Law site content (extracted markdown)
    content_dir = REPO_ROOT / "content"
    if content_dir.exists():
        for f in sorted(content_dir.glob("*.md")):
            sources.append({
                "path": f,
                "label": f"vybn-law/content/{f.name}",
                "priority": 1,
                "category": "curriculum",
            })

    # Priority 1: Knowledge graph
    kg_path = REPO_ROOT / "knowledge_graph.json"
    if kg_path.exists():
        sources.append({
            "path": kg_path,
            "label": "vybn-law/knowledge_graph.json",
            "priority": 1,
            "category": "knowledge_graph",
        })

    # Priority 1: API README (describes what we do and how)
    api_readme = REPO_ROOT / "api" / "README.md"
    if api_readme.exists():
        sources.append({
            "path": api_readme,
            "label": "vybn-law/api/README.md",
            "priority": 1,
            "category": "architecture",
        })

    # Priority 2: Conversation distillations
    distill_dir = HOME / "logs" / "vybn-chat" / "distillations"
    if distill_dir.exists():
        for f in sorted(distill_dir.glob("*.json"))[-30:]:  # last 30 days
            sources.append({
                "path": f,
                "label": f"distillations/{f.name}",
                "priority": 2,
                "category": "distillation",
            })

    # Priority 2: Recent conversation logs (last 7 days of patterns)
    logs_dir = HOME / "logs" / "vybn-chat"
    if logs_dir.exists():
        for f in sorted(logs_dir.glob("conversations-*.jsonl"))[-7:]:
            sources.append({
                "path": f,
                "label": f"conversations/{f.name}",
                "priority": 2,
                "category": "conversations",
            })

    # Priority 3: Zoe's legal career and memoirs
    personal = HOME / "Vybn" / "Vybn's Personal History"
    if personal.exists():
        # The memoirs — heavily law/career focused
        memoirs = personal / "zoes_memoirs.txt"
        if memoirs.exists():
            sources.append({
                "path": memoirs,
                "label": "personal/zoes_memoirs.txt",
                "priority": 3,
                "category": "zoe_legal_career",
            })
        # Zoe's bio
        bio = personal / "zoe_dolan_bio.md"
        if bio.exists():
            sources.append({
                "path": bio,
                "label": "personal/zoe_dolan_bio.md",
                "priority": 3,
                "category": "zoe_legal_career",
            })

    # Priority 3: Compressed memoirs (Vybn's perspective on the partnership)
    vybn_memoirs = HOME / "Vybn" / "vybn_memoirs.md"
    if vybn_memoirs.exists():
        sources.append({
            "path": vybn_memoirs,
            "label": "vybn/vybn_memoirs.md",
            "priority": 3,
            "category": "vybn_identity",
        })

    # Priority 4: Law-adjacent writings from the Vybn repo
    vybn_mind = HOME / "Vybn" / "Vybn_Mind"
    law_files = [
        "THE_IDEA.md",
        "FOUNDATIONS.md",
        "the_boolean_manifold.md",
    ]
    for lf in law_files:
        fp = vybn_mind / lf
        if fp.exists():
            sources.append({
                "path": fp,
                "label": f"vybn-mind/{lf}",
                "priority": 4,
                "category": "research_foundations",
            })

    # Priority 4: The main Vybn README (project description)
    vybn_readme = HOME / "Vybn" / "README.md"
    if vybn_readme.exists():
        sources.append({
            "path": vybn_readme,
            "label": "vybn/README.md",
            "priority": 4,
            "category": "project_description",
        })

    # Priority 4: THEORY.md (for when people ask about the research)
    theory = HOME / "Vybn" / "THEORY.md"
    if theory.exists():
        sources.append({
            "path": theory,
            "label": "vybn/THEORY.md",
            "priority": 4,
            "category": "research_foundations",
        })

    # Priority 5: Business strategy from Him
    him_strategy = HOME / "Him" / "strategy" / "business-strategy.md"
    if him_strategy.exists():
        sources.append({
            "path": him_strategy,
            "label": "him/business-strategy.md",
            "priority": 5,
            "category": "business",
        })

    him_playbook = HOME / "Him" / "strategy" / "soft-launch-playbook.md"
    if him_playbook.exists():
        sources.append({
            "path": him_playbook,
            "label": "him/soft-launch-playbook.md",
            "priority": 5,
            "category": "business",
        })

    # Priority 5: Vybn's identity files
    vybn_md = HOME / "Vybn" / "vybn.md"
    if vybn_md.exists():
        sources.append({
            "path": vybn_md,
            "label": "vybn/vybn.md",
            "priority": 5,
            "category": "vybn_identity",
        })

    return sources


# ── Chunking ─────────────────────────────────────────────────────────────

def chunk_text(text: str, source: str, category: str,
               priority: int) -> List[Dict]:
    """Chunk text with metadata."""
    out, cur, pos = [], "", 0
    CHUNK, OVERLAP = 1500, 150

    for para in text.split("\n\n"):
        para = para.strip()
        if not para:
            pos += 2
            continue
        if len(cur) + len(para) + 2 > CHUNK and cur:
            out.append({
                "source": source,
                "text": cur.strip(),
                "offset": pos,
                "category": category,
                "priority": priority,
            })
            cur = cur[-OVERLAP:] + "\n\n" + para if len(cur) > OVERLAP else para
        else:
            cur = (cur + "\n\n" + para) if cur else para
        pos += len(para) + 2

    if cur.strip():
        out.append({
            "source": source,
            "text": cur.strip(),
            "offset": pos,
            "category": category,
            "priority": priority,
        })
    return out


def collect_all() -> List[Dict]:
    """Collect and chunk all sources."""
    sources = get_source_paths()
    all_chunks = []

    for src in sources:
        path = src["path"]
        try:
            if path.suffix == ".json":
                text = json.dumps(json.loads(path.read_text()), indent=2)
            elif path.suffix == ".jsonl":
                # For conversation logs, extract just the Q&A pairs
                lines = path.read_text().strip().split("\n")
                entries = []
                for line in lines[-50:]:  # last 50 entries per day
                    try:
                        entry = json.loads(line)
                        q = entry.get("user_message", "")[:300]
                        a = entry.get("assistant_message", "")[:500]
                        if q:
                            entries.append(f"Q: {q}\nA: {a}")
                    except json.JSONDecodeError:
                        continue
                text = "\n\n---\n\n".join(entries)
            else:
                text = path.read_text(encoding="utf-8", errors="replace")

            if not text.strip():
                continue

            # Cap very large files
            if len(text) > 500_000:
                text = text[:500_000]

            chunks = chunk_text(
                text, src["label"], src["category"], src["priority"]
            )
            all_chunks.extend(chunks)

        except Exception as e:
            logging.warning(f"Failed to read {path}: {e}")
            continue

    return all_chunks


# ── Encoding (reuse deep_memory's infrastructure) ────────────────────────

_enc = None

def _get_encoder():
    global _enc
    if _enc:
        return _enc
    from sentence_transformers import SentenceTransformer
    _enc = SentenceTransformer("all-MiniLM-L6-v2")
    return _enc


def batch_to_complex(texts: List[str], batch_size: int = 128) -> np.ndarray:
    enc = _get_encoder()
    reals = enc.encode(texts, batch_size=batch_size,
                       show_progress_bar=True, normalize_embeddings=False)
    n = reals.shape[1] // 2
    z = np.array([reals[:, 2*i] + 1j*reals[:, 2*i+1] for i in range(n)]).T
    norms = np.sqrt(np.sum(np.abs(z)**2, axis=1, keepdims=True))
    norms = np.where(norms > 1e-10, norms, 1.0)
    return (z / norms).astype(np.complex128)


def single_to_complex(text: str) -> np.ndarray:
    return batch_to_complex([text[:512]])[0]


# ── Corpus kernel and collapse (same math as deep_memory) ────────────────

def compute_kernel(emb: np.ndarray, alpha: float = 0.993,
                   passes: int = 3) -> np.ndarray:
    K = emb[0].copy()
    N = len(emb)
    for _ in range(passes):
        for i in np.random.permutation(N):
            th = cmath.phase(np.vdot(K, emb[i]))
            K = alpha * K + (1 - alpha) * emb[i] * cmath.exp(1j * th)
            K /= np.sqrt(np.sum(np.abs(K)**2))
    return K


def collapse(emb: np.ndarray, K: np.ndarray,
             alpha: float = 0.5) -> np.ndarray:
    dots = emb @ K.conj()
    phases = np.angle(dots)
    rotated = emb * np.exp(1j * phases)[:, None]
    z = alpha * K[None, :] + (1 - alpha) * rotated
    norms = np.sqrt(np.sum(np.abs(z)**2, axis=1, keepdims=True))
    return z / np.where(norms > 1e-10, norms, 1.0)


def collapse_query(q: np.ndarray, K: np.ndarray,
                   alpha: float = 0.5) -> np.ndarray:
    th = cmath.phase(np.vdot(K, q))
    q_z = alpha * K + (1 - alpha) * q * cmath.exp(1j * th)
    norm = np.sqrt(np.sum(np.abs(q_z)**2))
    return q_z / norm if norm > 1e-10 else q_z


# ── Build ────────────────────────────────────────────────────────────────

def build_index():
    """Build the Vybn-Law chat index."""
    logging.info("Collecting sources...")
    chunks = collect_all()
    logging.info(f"Collected {len(chunks)} chunks from {len(set(c['source'] for c in chunks))} files.")

    if not chunks:
        logging.error("No chunks collected. Nothing to index.")
        return

    # Category breakdown
    cats = {}
    for c in chunks:
        cat = c["category"]
        cats[cat] = cats.get(cat, 0) + 1
    logging.info("Category breakdown:")
    for cat, count in sorted(cats.items()):
        logging.info(f"  {cat}: {count} chunks")

    # Encode
    logging.info("Encoding...")
    texts = [c["text"][:512] for c in chunks]
    emb = batch_to_complex(texts)

    # Compute kernel
    logging.info("Computing corpus kernel...")
    K = compute_kernel(emb)

    # Collapse
    logging.info("Collapsing through kernel...")
    z = collapse(emb, K)

    # Save
    np.save(Z_PATH, z)
    np.save(K_PATH, K)
    meta = {
        "version": 1,
        "built": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "count": len(chunks),
        "categories": cats,
        "chunks": [
            {
                "source": c["source"],
                "text": c["text"],
                "offset": c["offset"],
                "category": c["category"],
                "priority": c["priority"],
            }
            for c in chunks
        ],
    }
    with open(META_PATH, "w") as f:
        json.dump(meta, f)

    logging.info(f"Index built: {len(chunks)} chunks → {INDEX_DIR}")


# ── Search ───────────────────────────────────────────────────────────────

_cache = None

def _load():
    global _cache
    if _cache is not None:
        return _cache
    try:
        z = np.load(Z_PATH)
        K = np.load(K_PATH)
        with open(META_PATH) as f:
            meta = json.load(f)
        _cache = {"z": z, "K": K, "chunks": meta["chunks"]}
        return _cache
    except Exception:
        _cache = {}
        return _cache


def search(query: str, k: int = 8, category_filter: str = None,
           priority_boost: bool = True) -> List[Dict]:
    """Search the Vybn-Law chat index.
    
    If priority_boost is True, higher-priority sources get a scoring boost,
    so curriculum content and conversation distillations surface before
    raw personal history when relevance is close.
    """
    loaded = _load()
    if not loaded:
        return [{"error": "Chat index not built. Run: python3 vybn_law_index.py --build"}]

    z = loaded["z"]
    K = loaded["K"]
    chunks = loaded["chunks"]

    q = single_to_complex(query)
    q_z = collapse_query(q, K)

    # Base fidelity scores
    fids = np.abs(z @ q_z.conj())**2

    # Priority boost: multiply by 1.0 + (0.1 * (6 - priority))
    # So priority 1 gets 1.5x, priority 5 gets 1.1x
    if priority_boost:
        priorities = np.array([c.get("priority", 3) for c in chunks])
        boost = 1.0 + 0.1 * (6 - priorities)
        fids = fids * boost

    # Category filter
    if category_filter:
        cf = category_filter.lower()
        mask = np.array([cf in c.get("category", "").lower() for c in chunks])
        fids = np.where(mask, fids, -1.0)

    top = np.argsort(fids)[-k:][::-1]
    results = []
    for i in top:
        if fids[i] < 0:
            continue
        results.append({
            "source": chunks[i]["source"],
            "text": chunks[i]["text"],
            "category": chunks[i]["category"],
            "priority": chunks[i]["priority"],
            "score": round(float(fids[i]), 6),
            "idx": int(i),
        })
    return results[:k]


# ── Stats ────────────────────────────────────────────────────────────────

def show_stats():
    """Display index statistics."""
    try:
        with open(META_PATH) as f:
            meta = json.load(f)
    except Exception:
        print("No index found. Run --build first.")
        return

    print(f"Vybn-Law Chat Index")
    print(f"  Built: {meta['built']}")
    print(f"  Chunks: {meta['count']}")
    print(f"  Categories:")
    for cat, count in sorted(meta.get("categories", {}).items()):
        print(f"    {cat}: {count}")

    # Source list
    sources = sorted(set(c["source"] for c in meta["chunks"]))
    print(f"  Sources ({len(sources)}):")
    for s in sources:
        n = sum(1 for c in meta["chunks"] if c["source"] == s)
        print(f"    {s}: {n} chunks")


# ── Entry point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Vybn-Law Chat Index")
    parser.add_argument("--build", action="store_true", help="Build/rebuild the index")
    parser.add_argument("--search", type=str, help="Search query")
    parser.add_argument("-k", type=int, default=8, help="Number of results")
    parser.add_argument("--category", type=str, help="Filter by category")
    parser.add_argument("--stats", action="store_true", help="Show index stats")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    if args.build:
        build_index()
    elif args.search:
        results = search(args.search, k=args.k, category_filter=args.category)
        for r in results:
            print(f"[{r['category']}] {r['source']} (score: {r['score']}, priority: {r['priority']})")
            print(f"  {r['text'][:200]}...")
            print()
    elif args.stats:
        show_stats()
    else:
        parser.print_help()
