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

--- FOLIO-as-K (April 2026) ---

The original index scored chunks by:
  fidelity × priority_boost  (hand-tuned multiplier by source category)

This refactor scores by:
  fidelity × distinctiveness
where:
  distinctiveness = 1 − |⟨z_i | K_folio⟩|²
  K_folio = corpus kernel computed from FOLIO's 18k+ legal concepts

FOLIO (Federated Open Legal Information Ontology) encodes settled legal
doctrine as a formal ontology. Running compute_kernel() over its concept
labels + definitions at α=0.993 produces K_folio — the path-independent
invariant of established law.

Distinctiveness then measures: how far does this chunk sit from what
all of legal knowledge already agrees on? Chunks at the AI-law frontier
(entity question, privilege fracture, symbiosis holding) score highest
because FOLIO has no concepts there yet — they ARE the K-orthogonal
residual space. The walk goes where law hasn't converged.

This is not a training signal or a fine-tuning step. FOLIO is the
environment against which our local knowledge measures itself — the
coupled equation M' = αM + (1-α)·x·e^{iθ} with FOLIO as M.

Usage:
    python3 vybn_law_index.py --build-folio-kernel  # fetch FOLIO, compute K_folio (once)
    python3 vybn_law_index.py --build               # build/rebuild the corpus index
    python3 vybn_law_index.py --search "query" -k 6
    python3 vybn_law_index.py --walk "query" -k 6   # telling-retrieval walk
    python3 vybn_law_index.py --stats               # show what's indexed

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

Z_PATH      = INDEX_DIR / "chat_index_z.npy"
K_PATH      = INDEX_DIR / "chat_index_kernel.npy"
K_FOLIO_PATH = INDEX_DIR / "folio_kernel.npy"          # NEW: FOLIO kernel
META_PATH   = INDEX_DIR / "chat_index_meta.json"

VYBN_PHASE = HOME / "vybn-phase"
sys.path.insert(0, str(VYBN_PHASE))

# FOLIO API — open CORS, no key required.
# We fetch a curated set of branches rather than the full ontology to stay
# parsimonious with API calls. The branches most relevant to AI law:
FOLIO_API = "https://folio.openlegalstandard.org"
FOLIO_BRANCHES = [
    "areas_of_law",
    "actors_players",
    "asset_types",
    "government_bodies",
]
# Additional targeted concept searches for AI-law frontier concepts:
FOLIO_SEARCHES = [
    "artificial intelligence",
    "machine authorship",
    "AI liability",
    "AI governance",
    "AI bias",
    "attorney client privilege",
    "work product",
    "first amendment",
    "due process",
    "copyright",
    "trademark",
    "entity",
    "accountability",
    "autonomous",
    "algorithm",
]

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
        memoirs = personal / "zoes_memoirs.txt"
        if memoirs.exists():
            sources.append({
                "path": memoirs,
                "label": "personal/zoes_memoirs.txt",
                "priority": 3,
                "category": "zoe_legal_career",
            })
        bio = personal / "zoe_dolan_bio.md"
        if bio.exists():
            sources.append({
                "path": bio,
                "label": "personal/zoe_dolan_bio.md",
                "priority": 3,
                "category": "zoe_legal_career",
            })

    # Priority 3: Compressed memoirs
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
    for lf in ["THE_IDEA.md", "FOUNDATIONS.md", "the_boolean_manifold.md"]:
        fp = vybn_mind / lf
        if fp.exists():
            sources.append({
                "path": fp,
                "label": f"vybn-mind/{lf}",
                "priority": 4,
                "category": "research_foundations",
            })

    vybn_readme = HOME / "Vybn" / "README.md"
    if vybn_readme.exists():
        sources.append({
            "path": vybn_readme,
            "label": "vybn/README.md",
            "priority": 4,
            "category": "project_description",
        })

    theory = HOME / "Vybn" / "THEORY.md"
    if theory.exists():
        sources.append({
            "path": theory,
            "label": "vybn/THEORY.md",
            "priority": 4,
            "category": "research_foundations",
        })

    # Priority 5: Business strategy from Him
    for bf in ["strategy/business-strategy.md", "strategy/soft-launch-playbook.md"]:
        fp = HOME / "Him" / bf
        if fp.exists():
            sources.append({
                "path": fp,
                "label": f"him/{Path(bf).name}",
                "priority": 5,
                "category": "business",
            })

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
    out, cur, pos = [], "", 0
    CHUNK, OVERLAP = 1500, 150
    for para in text.split("\n\n"):
        para = para.strip()
        if not para:
            pos += 2
            continue
        if len(cur) + len(para) + 2 > CHUNK and cur:
            out.append({
                "source": source, "text": cur.strip(),
                "offset": pos, "category": category, "priority": priority,
            })
            cur = cur[-OVERLAP:] + "\n\n" + para if len(cur) > OVERLAP else para
        else:
            cur = (cur + "\n\n" + para) if cur else para
        pos += len(para) + 2
    if cur.strip():
        out.append({
            "source": source, "text": cur.strip(),
            "offset": pos, "category": category, "priority": priority,
        })
    return out


def collect_all() -> List[Dict]:
    sources = get_source_paths()
    all_chunks = []
    for src in sources:
        path = src["path"]
        try:
            if path.suffix == ".json":
                text = json.dumps(json.loads(path.read_text()), indent=2)
            elif path.suffix == ".jsonl":
                lines = path.read_text().strip().split("\n")
                entries = []
                for line in lines[-50:]:
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
            if len(text) > 500_000:
                text = text[:500_000]
            all_chunks.extend(chunk_text(
                text, src["label"], src["category"], src["priority"]
            ))
        except Exception as e:
            logging.warning(f"Failed to read {path}: {e}")
    return all_chunks


# ── Encoding ─────────────────────────────────────────────────────────────

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


# ── FOLIO kernel ─────────────────────────────────────────────────────────

def fetch_folio_texts(max_per_search: int = 30) -> List[str]:
    """Fetch FOLIO concept labels + definitions for kernel computation.

    Parsimonious: one request per search term (not the full ontology).
    Deduplicates by IRI so overlapping searches don't inflate the kernel.
    Returns a flat list of strings: "label: definition" for each concept.
    """
    import urllib.request
    import urllib.parse

    seen_iris = set()
    texts = []

    for term in FOLIO_SEARCHES:
        try:
            url = (FOLIO_API + "/search/prefix?query="
                   + urllib.parse.quote(term))
            with urllib.request.urlopen(url, timeout=10) as resp:
                data = json.loads(resp.read())
            for cls in data.get("classes", [])[:max_per_search]:
                iri = cls.get("iri", "")
                if iri in seen_iris:
                    continue
                seen_iris.add(iri)
                label = cls.get("label", "").strip()
                defn = cls.get("definition", "").strip()
                if label:
                    texts.append(f"{label}: {defn}" if defn else label)
        except Exception as e:
            logging.warning(f"FOLIO fetch failed for '{term}': {e}")
            continue

    logging.info(f"FOLIO: fetched {len(texts)} unique concepts across "
                 f"{len(FOLIO_SEARCHES)} searches")
    return texts


def build_folio_kernel() -> np.ndarray:
    """Fetch FOLIO concepts, encode, compute kernel K_folio, cache.

    This is run once (or when FOLIO updates). The kernel represents the
    path-independent invariant of settled legal doctrine — the thing
    our corpus chunks measure their distinctiveness against.
    """
    logging.info("Building FOLIO kernel...")
    texts = fetch_folio_texts()
    if not texts:
        raise RuntimeError("No FOLIO concepts fetched — check network/API.")

    logging.info(f"Encoding {len(texts)} FOLIO concepts...")
    emb = batch_to_complex(texts)

    logging.info("Computing K_folio (α=0.993, 3 passes)...")
    K_folio = compute_kernel(emb, alpha=0.993, passes=3)
    np.save(K_FOLIO_PATH, K_folio)
    logging.info(f"K_folio saved → {K_FOLIO_PATH}")
    return K_folio


def _load_folio_kernel() -> Optional[np.ndarray]:
    """Load cached K_folio, or None if not built yet."""
    if K_FOLIO_PATH.exists():
        return np.load(K_FOLIO_PATH)
    logging.warning("K_folio not found. Run --build-folio-kernel. "
                    "Falling back to corpus kernel for distinctiveness.")
    return None


# ── Build ────────────────────────────────────────────────────────────────

def build_index():
    logging.info("Collecting sources...")
    chunks = collect_all()
    logging.info(f"Collected {len(chunks)} chunks from "
                 f"{len(set(c['source'] for c in chunks))} files.")
    if not chunks:
        logging.error("No chunks collected.")
        return

    cats = {}
    for c in chunks:
        cats[c["category"]] = cats.get(c["category"], 0) + 1
    for cat, count in sorted(cats.items()):
        logging.info(f"  {cat}: {count} chunks")

    logging.info("Encoding...")
    texts = [c["text"][:512] for c in chunks]
    emb = batch_to_complex(texts)

    logging.info("Computing corpus kernel...")
    K = compute_kernel(emb)

    logging.info("Collapsing through kernel...")
    z = collapse(emb, K)

    np.save(Z_PATH, z)
    np.save(K_PATH, K)
    meta = {
        "version": 2,
        "built": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "count": len(chunks),
        "categories": cats,
        "chunks": [
            {
                "source": c["source"], "text": c["text"],
                "offset": c["offset"], "category": c["category"],
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


def search(query: str, k: int = 8, category_filter: str = None) -> List[Dict]:
    """Search the Vybn-Law chat index.

    Scores by: fidelity × distinctiveness
    where distinctiveness = 1 − |⟨z_i | K_folio⟩|²

    K_folio is the corpus kernel of FOLIO's settled legal concepts.
    Chunks far from K_folio (high distinctiveness) AND relevant to the
    query surface first — these are the AI-law frontier materials that
    FOLIO has no vocabulary for yet.

    Falls back to corpus K (self-distinctiveness) if K_folio not built.
    Category metadata is preserved for display but no longer distorts scoring.
    """
    loaded = _load()
    if not loaded or "z" not in loaded:
        return [{"error": "Chat index not built. Run: python3 vybn_law_index.py --build"}]

    z = loaded["z"]
    K_corpus = loaded["K"]
    chunks = loaded["chunks"]

    # Determine which K to use for distinctiveness
    K_folio = _load_folio_kernel()
    K_dist = K_folio if K_folio is not None else K_corpus
    using_folio = K_folio is not None

    q = single_to_complex(query)
    # Collapse query through corpus K (for relevance alignment)
    q_z = collapse_query(q, K_corpus)

    # Relevance: fidelity in collapsed z-space
    relevance = np.abs(z @ q_z.conj())**2

    # Distinctiveness: how much of each chunk is NOT settled doctrine
    K_dist_n = K_dist / np.sqrt(np.sum(np.abs(K_dist)**2))
    proj = np.abs(z @ K_dist_n.conj())**2
    distinctiveness = 1.0 - proj

    # Score: relevance × distinctiveness
    scores = relevance * distinctiveness

    if category_filter:
        cf = category_filter.lower()
        mask = np.array([cf in c.get("category", "").lower() for c in chunks])
        scores = np.where(mask, scores, -1.0)

    top = np.argsort(scores)[-k:][::-1]
    results = []
    for i in top:
        if scores[i] < 0:
            continue
        results.append({
            "source": chunks[i]["source"],
            "text": chunks[i]["text"],
            "category": chunks[i]["category"],
            "priority": chunks[i]["priority"],
            "relevance": round(float(relevance[i]), 6),
            "distinctiveness": round(float(distinctiveness[i]), 4),
            "score": round(float(scores[i]), 6),
            "folio_kernel": using_folio,
            "idx": int(i),
        })
    return results[:k]


def folio_walk(query: str, k: int = 8, steps: int = 8,
               alpha: float = 0.5,
               category_filter: str = None) -> List[Dict]:
    """Telling-retrieval walk in FOLIO-K-orthogonal residual space.

    The same walk as deep_memory.walk(), but operating in the Vybn-Law
    index with K_folio as the environment kernel. The walk navigates
    the residual space where pairwise similarity is low and curvature
    is rich — where law is still in motion.

    Three self-regulating mechanisms (same as deep_memory):
      1. Curvature-adaptive α
      2. Visited-region repulsion
      3. Curvature-driven repulsion boost

    If K_folio is not built, falls back to corpus K.
    """
    loaded = _load()
    if not loaded or "z" not in loaded:
        return [{"error": "Index not built."}]

    z_all = loaded["z"]
    K_corpus = loaded["K"]
    chunks = loaded["chunks"]
    N = len(z_all)

    K_folio = _load_folio_kernel()
    K_env = K_folio if K_folio is not None else K_corpus
    K_n = K_env / np.sqrt(np.sum(np.abs(K_env)**2))

    # Distinctiveness in FOLIO-K space
    proj_K = np.abs(z_all @ K_n.conj())**2
    distinctiveness = 1.0 - proj_K

    # Residuals for walk dynamics
    R = z_all - np.outer(z_all @ K_n.conj(), K_n)
    R_norms = np.linalg.norm(R, axis=1)
    R_hat = R / (R_norms[:, None] + 1e-12)

    q = single_to_complex(query)
    q_z = collapse_query(q, K_corpus, alpha)

    relevance = np.abs(z_all @ q_z.conj())**2
    telling = relevance * distinctiveness

    # Walk state in residual space
    q_r = q_z - np.vdot(K_n, q_z) * K_n
    M = q_r / (np.linalg.norm(q_r) + 1e-12)

    walk_alpha = alpha
    visited = set()
    visited_residuals = []
    geom_history = []
    repulsion_boost = 1.0

    if category_filter:
        cf = category_filter.lower()
        eligible = np.array([cf in c.get("category", "").lower() for c in chunks])
    else:
        eligible = np.ones(N, dtype=bool)

    results = []

    for step in range(max(steps, k) + 5):
        # Visited-region repulsion
        if visited_residuals:
            V = np.array(visited_residuals)
            overlap = np.abs(R_hat @ V.conj().T)**2
            mean_overlap = overlap.sum(axis=1) / len(V)
            repulsion = np.exp(-repulsion_boost * mean_overlap)
        else:
            repulsion = np.ones(N)

        score = telling * repulsion
        for v in visited:
            score[v] = -1.0
        score = np.where(eligible, score, -1.0)

        best_idx = int(np.argmax(score))
        if score[best_idx] < 0:
            break

        visited.add(best_idx)
        visited_residuals.append(R_hat[best_idx].copy())

        r_best = R_hat[best_idx]
        th = cmath.phase(np.vdot(M, r_best))
        M_new = walk_alpha * M + (1 - walk_alpha) * r_best * cmath.exp(1j * th)
        raw_mag = float(np.sqrt(np.sum(np.abs(M_new)**2)))
        M_new /= raw_mag

        state_shift = 1.0 - abs(np.vdot(M, M_new))**2
        geom_history.append(float(state_shift))

        phase = float(cmath.phase(np.vdot(q_z, z_all[best_idx])))

        # Curvature-adaptive α
        if len(geom_history) >= 3:
            recent = np.array(geom_history[-5:])
            slope = np.polyfit(np.arange(len(recent)), recent, 1)[0]
            target = max(np.median(geom_history), 0.02)
            error = state_shift - target
            walk_alpha = float(np.clip(
                walk_alpha + slope * 3.0 + error * 0.3, 0.15, 0.85
            ))

        # Curvature-driven repulsion boost
        if len(geom_history) >= 2:
            median_geom = np.median(geom_history)
            if state_shift < median_geom:
                repulsion_boost = min(repulsion_boost * 1.3, 8.0)
            else:
                repulsion_boost = max(repulsion_boost * 0.9, 1.0)

        results.append({
            "step": step + 1,
            "source": chunks[best_idx]["source"],
            "text": chunks[best_idx]["text"],
            "category": chunks[best_idx]["category"],
            "relevance": round(float(relevance[best_idx]), 6),
            "telling": round(float(telling[best_idx]), 6),
            "distinctiveness": round(float(distinctiveness[best_idx]), 4),
            "phase": round(phase, 6),
            "geometry": round(float(state_shift), 6),
            "repulsion": round(float(repulsion[best_idx]), 4),
            "alpha": round(float(walk_alpha), 4),
            "novel_source": chunks[best_idx]["source"] not in
                            {r["source"] for r in results},
            "folio_kernel": K_folio is not None,
            "idx": int(best_idx),
        })
        M = M_new

        if len(results) >= k:
            break

    return results


# ── Stats ────────────────────────────────────────────────────────────────

def show_stats():
    try:
        with open(META_PATH) as f:
            meta = json.load(f)
    except Exception:
        print("No index found. Run --build first.")
        return

    print(f"Vybn-Law Chat Index v{meta.get('version', 1)}")
    print(f"  Built:  {meta['built']}")
    print(f"  Chunks: {meta['count']}")
    folio_built = K_FOLIO_PATH.exists()
    print(f"  FOLIO kernel: {'built' if folio_built else 'NOT built — run --build-folio-kernel'}")
    print(f"  Scoring: {'relevance × distinctiveness (FOLIO-K)' if folio_built else 'relevance × distinctiveness (corpus-K fallback)'}")
    print(f"  Categories:")
    for cat, count in sorted(meta.get("categories", {}).items()):
        print(f"    {cat}: {count}")
    sources = sorted(set(c["source"] for c in meta["chunks"]))
    print(f"  Sources ({len(sources)}):")
    for s in sources:
        n = sum(1 for c in meta["chunks"] if c["source"] == s)
        print(f"    {s}: {n} chunks")


# ── Entry point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Vybn-Law Chat Index — FOLIO-as-K edition"
    )
    parser.add_argument("--build-folio-kernel", action="store_true",
                        help="Fetch FOLIO concepts, compute and cache K_folio (run once)")
    parser.add_argument("--build", action="store_true",
                        help="Build/rebuild the corpus index")
    parser.add_argument("--search", type=str, help="Search query")
    parser.add_argument("--walk", type=str,
                        help="Telling-retrieval walk in FOLIO-K residual space")
    parser.add_argument("-k", type=int, default=8, help="Number of results")
    parser.add_argument("--steps", type=int, default=8, help="Walk steps")
    parser.add_argument("--category", type=str, help="Filter by category")
    parser.add_argument("--stats", action="store_true", help="Show index stats")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s"
    )

    if args.build_folio_kernel:
        build_folio_kernel()

    elif args.build:
        build_index()

    elif args.search:
        results = search(args.search, k=args.k, category_filter=args.category)
        print(f"\n{'='*70}")
        print(f"  SEARCH: \"{args.search}\"")
        folio_active = any(r.get("folio_kernel") for r in results)
        print(f"  Kernel: {'FOLIO' if folio_active else 'corpus (fallback)'}")
        print(f"{'='*70}")
        for r in results:
            print(f"\n{'─'*60}")
            print(f"  [{r['category']}] {r['source']}")
            print(f"  relevance={r['relevance']}  distinctiveness={r['distinctiveness']}  score={r['score']}")
            print(f"{'─'*60}")
            print(r['text'][:350])
        print()

    elif args.walk:
        results = folio_walk(args.walk, k=args.k, steps=args.steps,
                             category_filter=args.category)
        print(f"\n{'='*70}")
        print(f"  WALK: \"{args.walk}\"")
        folio_active = any(r.get("folio_kernel") for r in results)
        print(f"  Kernel: {'FOLIO' if folio_active else 'corpus (fallback)'}")
        print(f"{'='*70}")
        for r in results:
            ns = " [NEW SOURCE]" if r.get("novel_source") else ""
            print(f"\n{'─'*60}")
            print(f"  Step {r['step']}: [{r['category']}] {r['source']}{ns}")
            print(f"  rel={r['relevance']:.4f}  dist={r['distinctiveness']:.4f}  "
                  f"telling={r['telling']:.4f}  geo={r['geometry']:.4f}")
            print(f"{'─'*60}")
            print(r['text'][:350])
        print()

    elif args.stats:
        show_stats()

    else:
        parser.print_help()
