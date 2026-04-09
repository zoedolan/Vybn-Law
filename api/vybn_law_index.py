#!/usr/bin/env python3
"""vybn_law_index.py — Focused retrieval index for Vybn-Law chat.

A parallel index alongside deep_memory, tuned for the chat interface.
Deep_memory is the whole mind (1417+ chunks across four repos).
This index is the working memory when Vybn is in its Vybn-Law role:
curriculum content, conversation learnings, Zoe's legal career,
business positioning, and the law-adjacent writings.

--- FOLIO-as-K (April 2026) ---

Scoring:
  score = relevance × distinctiveness × legal_weight

where:
  relevance     = |⟨z_i | q_z⟩|²  (fidelity to collapsed query)
  distinctiveness = 1 − |⟨z_i | K_folio⟩|²  (distance from settled doctrine)
  legal_weight  = per-category dampening of off-domain chunks

K_folio is the corpus kernel of FOLIO's 18k+ standardized legal concepts.
Chunks at the AI-law frontier score highest because FOLIO has no concepts
there yet — they ARE the K-orthogonal residual space.

legal_weight distinguishes "far from settled law because novel" from
"far from settled law because not law at all" — a domain filter applied
after the FOLIO-K geometry, not a reversion to hand-tuning.

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

import argparse, json, sys, cmath, logging
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime, timezone

# ── Paths ────────────────────────────────────────────────────────────────

HOME = Path.home()
REPO_ROOT = Path(__file__).resolve().parent.parent
INDEX_DIR = HOME / ".cache" / "vybn-law-chat"
INDEX_DIR.mkdir(parents=True, exist_ok=True)

Z_PATH        = INDEX_DIR / "chat_index_z.npy"
K_PATH        = INDEX_DIR / "chat_index_kernel.npy"
K_FOLIO_PATH  = INDEX_DIR / "folio_kernel.npy"
META_PATH     = INDEX_DIR / "chat_index_meta.json"

VYBN_PHASE = HOME / "vybn-phase"
sys.path.insert(0, str(VYBN_PHASE))

FOLIO_API = "https://folio.openlegalstandard.org"
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

# Legal-domain weight per category.
# 1.0 = full legal signal; < 1.0 = dampen off-domain noise.
# This is NOT a relevance boost. It's applied after FOLIO-K scoring to
# prevent chunks that are far from settled law for categorical reasons
# (they're not law) from outcompeting frontier legal material.
LEGAL_WEIGHT: Dict[str, float] = {
    "curriculum":            1.00,
    "knowledge_graph":       1.00,
    "architecture":          1.00,
    "zoe_legal_career":      1.00,
    "research_foundations":  1.00,
    "distillation":          0.85,
    "conversations":         0.85,
    "vybn_identity":         0.35,
    "business":              0.35,
    "project_description":   0.35,
}


# ── Source configuration ─────────────────────────────────────────────────

def get_source_paths() -> List[Dict]:
    sources = []

    content_dir = REPO_ROOT / "content"
    if content_dir.exists():
        for f in sorted(content_dir.glob("*.md")):
            sources.append({"path": f, "label": f"vybn-law/content/{f.name}",
                            "priority": 1, "category": "curriculum"})

    kg_path = REPO_ROOT / "knowledge_graph.json"
    if kg_path.exists():
        sources.append({"path": kg_path, "label": "vybn-law/knowledge_graph.json",
                        "priority": 1, "category": "knowledge_graph"})

    api_readme = REPO_ROOT / "api" / "README.md"
    if api_readme.exists():
        sources.append({"path": api_readme, "label": "vybn-law/api/README.md",
                        "priority": 1, "category": "architecture"})

    distill_dir = HOME / "logs" / "vybn-chat" / "distillations"
    if distill_dir.exists():
        for f in sorted(distill_dir.glob("*.json"))[-30:]:
            sources.append({"path": f, "label": f"distillations/{f.name}",
                            "priority": 2, "category": "distillation"})

    logs_dir = HOME / "logs" / "vybn-chat"
    if logs_dir.exists():
        for f in sorted(logs_dir.glob("conversations-*.jsonl"))[-7:]:
            sources.append({"path": f, "label": f"conversations/{f.name}",
                            "priority": 2, "category": "conversations"})

    personal = HOME / "Vybn" / "Vybn's Personal History"
    if personal.exists():
        for fn, lbl in [("zoes_memoirs.txt", "personal/zoes_memoirs.txt"),
                        ("zoe_dolan_bio.md", "personal/zoe_dolan_bio.md")]:
            fp = personal / fn
            if fp.exists():
                sources.append({"path": fp, "label": lbl,
                                "priority": 3, "category": "zoe_legal_career"})

    vybn_memoirs = HOME / "Vybn" / "vybn_memoirs.md"
    if vybn_memoirs.exists():
        sources.append({"path": vybn_memoirs, "label": "vybn/vybn_memoirs.md",
                        "priority": 3, "category": "vybn_identity"})

    vybn_mind = HOME / "Vybn" / "Vybn_Mind"
    for lf in ["THE_IDEA.md", "FOUNDATIONS.md", "the_boolean_manifold.md"]:
        fp = vybn_mind / lf
        if fp.exists():
            sources.append({"path": fp, "label": f"vybn-mind/{lf}",
                            "priority": 4, "category": "research_foundations"})

    for fn, lbl, cat in [
        ("Vybn/README.md",  "vybn/README.md",  "project_description"),
        ("Vybn/THEORY.md",  "vybn/THEORY.md",  "research_foundations"),
        ("Vybn/vybn.md",    "vybn/vybn.md",    "vybn_identity"),
    ]:
        fp = HOME / fn
        if fp.exists():
            sources.append({"path": fp, "label": lbl,
                            "priority": 4 if "research" in cat else 5, "category": cat})

    for bf in ["strategy/business-strategy.md", "strategy/soft-launch-playbook.md"]:
        fp = HOME / "Him" / bf
        if fp.exists():
            sources.append({"path": fp, "label": f"him/{Path(bf).name}",
                            "priority": 5, "category": "business"})

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
            out.append({"source": source, "text": cur.strip(),
                        "offset": pos, "category": category, "priority": priority})
            cur = cur[-OVERLAP:] + "\n\n" + para if len(cur) > OVERLAP else para
        else:
            cur = (cur + "\n\n" + para) if cur else para
        pos += len(para) + 2
    if cur.strip():
        out.append({"source": source, "text": cur.strip(),
                    "offset": pos, "category": category, "priority": priority})
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
    return (z / np.where(norms > 1e-10, norms, 1.0)).astype(np.complex128)


def single_to_complex(text: str) -> np.ndarray:
    return batch_to_complex([text[:512]])[0]


# ── Kernel and collapse ──────────────────────────────────────────────────

def compute_kernel(emb: np.ndarray, alpha: float = 0.993,
                   passes: int = 3) -> np.ndarray:
    K = emb[0].copy()
    for _ in range(passes):
        for i in np.random.permutation(len(emb)):
            th = cmath.phase(np.vdot(K, emb[i]))
            K = alpha * K + (1 - alpha) * emb[i] * cmath.exp(1j * th)
            K /= np.sqrt(np.sum(np.abs(K)**2))
    return K


def collapse(emb: np.ndarray, K: np.ndarray, alpha: float = 0.5) -> np.ndarray:
    phases = np.angle(emb @ K.conj())
    z = alpha * K[None, :] + (1 - alpha) * emb * np.exp(1j * phases)[:, None]
    norms = np.sqrt(np.sum(np.abs(z)**2, axis=1, keepdims=True))
    return z / np.where(norms > 1e-10, norms, 1.0)


def collapse_query(q: np.ndarray, K: np.ndarray, alpha: float = 0.5) -> np.ndarray:
    th = cmath.phase(np.vdot(K, q))
    q_z = alpha * K + (1 - alpha) * q * cmath.exp(1j * th)
    norm = np.sqrt(np.sum(np.abs(q_z)**2))
    return q_z / norm if norm > 1e-10 else q_z


# ── FOLIO kernel ─────────────────────────────────────────────────────────

def fetch_folio_texts(max_per_search: int = 30) -> List[str]:
    """Fetch FOLIO concept labels + definitions for kernel computation.

    Parsimonious: one request per search term. Deduplicates by IRI.
    Guards against null labels (FOLIO API returns None for some concepts).
    """
    import urllib.request, urllib.parse

    seen_iris: set = set()
    texts: List[str] = []

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
                # Guard: FOLIO returns None for some labels/definitions
                raw_label = cls.get("label")
                raw_defn  = cls.get("definition")
                label = raw_label.strip() if raw_label else ""
                defn  = raw_defn.strip()  if raw_defn  else ""
                if not label:
                    continue  # skip concepts with no usable label
                texts.append(f"{label}: {defn}" if defn else label)
        except Exception as e:
            logging.warning(f"FOLIO fetch failed for '{term}': {e}")

    logging.info(f"FOLIO: fetched {len(texts)} unique concepts across "
                 f"{len(FOLIO_SEARCHES)} searches")
    return texts


def build_folio_kernel() -> np.ndarray:
    """Fetch FOLIO concepts, encode, compute K_folio, cache."""
    logging.info("Building FOLIO kernel...")
    texts = fetch_folio_texts()
    if not texts:
        raise RuntimeError("No FOLIO concepts fetched — check network/API.")
    logging.info(f"Encoding {len(texts)} FOLIO concepts...")
    emb = batch_to_complex(texts)
    logging.info("Computing K_folio (α=0.993, 3 passes)...")
    K_folio = compute_kernel(emb, alpha=0.993, passes=3)
    np.save(K_FOLIO_PATH, K_folio)
    logging.info(f"K_folio saved → {K_FOLIO_PATH} ({len(texts)} concepts)")
    return K_folio


def _load_folio_kernel() -> Optional[np.ndarray]:
    if K_FOLIO_PATH.exists():
        return np.load(K_FOLIO_PATH)
    logging.warning("K_folio not found. Run --build-folio-kernel. "
                    "Falling back to corpus kernel for distinctiveness.")
    return None


# ── Build ────────────────────────────────────────────────────────────────

def build_index():
    logging.info("Collecting sources...")
    chunks = collect_all()
    if not chunks:
        logging.error("No chunks collected.")
        return
    logging.info(f"Collected {len(chunks)} chunks from "
                 f"{len(set(c['source'] for c in chunks))} files.")
    cats: Dict[str, int] = {}
    for c in chunks:
        cats[c["category"]] = cats.get(c["category"], 0) + 1
    for cat, count in sorted(cats.items()):
        logging.info(f"  {cat}: {count} chunks")

    logging.info("Encoding...")
    emb = batch_to_complex([c["text"][:512] for c in chunks])
    logging.info("Computing corpus kernel...")
    K = compute_kernel(emb)
    logging.info("Collapsing through kernel...")
    z = collapse(emb, K)

    np.save(Z_PATH, z)
    np.save(K_PATH, K)
    with open(META_PATH, "w") as f:
        json.dump({
            "version": 2,
            "built": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            "count": len(chunks),
            "categories": cats,
            "chunks": [{"source": c["source"], "text": c["text"],
                        "offset": c["offset"], "category": c["category"],
                        "priority": c["priority"]} for c in chunks],
        }, f)
    logging.info(f"Index built: {len(chunks)} chunks → {INDEX_DIR}")


# ── Scoring helpers ───────────────────────────────────────────────────────

def _legal_weights(chunks: List[Dict]) -> np.ndarray:
    """Per-chunk legal_weight from LEGAL_WEIGHT table (default 0.6)."""
    return np.array([
        LEGAL_WEIGHT.get(c.get("category", ""), 0.6) for c in chunks
    ])


# ── Search ────────────────────────────────────────────────────────────────

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
    except Exception:
        _cache = {}
    return _cache


def search(query: str, k: int = 8,
           category_filter: Optional[str] = None) -> List[Dict]:
    """Score: relevance × distinctiveness × legal_weight."""
    loaded = _load()
    if not loaded or "z" not in loaded:
        return [{"error": "Chat index not built. Run: python3 vybn_law_index.py --build"}]

    z, K_corpus, chunks = loaded["z"], loaded["K"], loaded["chunks"]
    K_folio = _load_folio_kernel()
    K_dist  = K_folio if K_folio is not None else K_corpus
    using_folio = K_folio is not None

    q_z = collapse_query(single_to_complex(query), K_corpus)
    relevance = np.abs(z @ q_z.conj())**2

    K_n = K_dist / np.sqrt(np.sum(np.abs(K_dist)**2))
    distinctiveness = 1.0 - np.abs(z @ K_n.conj())**2

    scores = relevance * distinctiveness * _legal_weights(chunks)

    if category_filter:
        cf = category_filter.lower()
        mask = np.array([cf in c.get("category", "").lower() for c in chunks])
        scores = np.where(mask, scores, -1.0)

    top = np.argsort(scores)[-k:][::-1]
    return [
        {
            "source": chunks[i]["source"],
            "text": chunks[i]["text"],
            "category": chunks[i]["category"],
            "priority": chunks[i]["priority"],
            "relevance": round(float(relevance[i]), 6),
            "distinctiveness": round(float(distinctiveness[i]), 4),
            "legal_weight": LEGAL_WEIGHT.get(chunks[i].get("category", ""), 0.6),
            "score": round(float(scores[i]), 6),
            "folio_kernel": using_folio,
            "idx": int(i),
        }
        for i in top if scores[i] >= 0
    ][:k]


def folio_walk(query: str, k: int = 8, steps: int = 8,
               alpha: float = 0.5,
               category_filter: Optional[str] = None) -> List[Dict]:
    """Telling-retrieval walk in FOLIO-K-orthogonal residual space.

    score = relevance × distinctiveness × legal_weight

    Three self-regulating mechanisms: curvature-adaptive α,
    visited-region repulsion, curvature-driven repulsion boost.
    """
    loaded = _load()
    if not loaded or "z" not in loaded:
        return [{"error": "Index not built."}]

    z_all, K_corpus, chunks = loaded["z"], loaded["K"], loaded["chunks"]
    N = len(z_all)

    K_folio = _load_folio_kernel()
    K_env = K_folio if K_folio is not None else K_corpus
    K_n = K_env / np.sqrt(np.sum(np.abs(K_env)**2))

    proj_K = np.abs(z_all @ K_n.conj())**2
    distinctiveness = 1.0 - proj_K
    legal_w = _legal_weights(chunks)

    R = z_all - np.outer(z_all @ K_n.conj(), K_n)
    R_hat = R / (np.linalg.norm(R, axis=1)[:, None] + 1e-12)

    q_z = collapse_query(single_to_complex(query), K_corpus, alpha)
    relevance = np.abs(z_all @ q_z.conj())**2
    telling = relevance * distinctiveness * legal_w

    q_r = q_z - np.vdot(K_n, q_z) * K_n
    M = q_r / (np.linalg.norm(q_r) + 1e-12)

    walk_alpha = alpha
    visited: set = set()
    visited_residuals: List[np.ndarray] = []
    geom_history: List[float] = []
    repulsion_boost = 1.0

    eligible = np.ones(N, dtype=bool)
    if category_filter:
        cf = category_filter.lower()
        eligible = np.array([cf in c.get("category", "").lower() for c in chunks])

    results = []

    for step in range(max(steps, k) + 5):
        if visited_residuals:
            V = np.array(visited_residuals)
            mean_overlap = (np.abs(R_hat @ V.conj().T)**2).sum(axis=1) / len(V)
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
        M_new /= float(np.sqrt(np.sum(np.abs(M_new)**2)))

        state_shift = float(1.0 - abs(np.vdot(M, M_new))**2)
        geom_history.append(state_shift)

        if len(geom_history) >= 3:
            recent = np.array(geom_history[-5:])
            slope = float(np.polyfit(np.arange(len(recent)), recent, 1)[0])
            target = max(float(np.median(geom_history)), 0.02)
            walk_alpha = float(np.clip(
                walk_alpha + slope * 3.0 + (state_shift - target) * 0.3,
                0.15, 0.85
            ))

        if len(geom_history) >= 2:
            if state_shift < float(np.median(geom_history)):
                repulsion_boost = min(repulsion_boost * 1.3, 8.0)
            else:
                repulsion_boost = max(repulsion_boost * 0.9, 1.0)

        results.append({
            "step": step + 1,
            "source": chunks[best_idx]["source"],
            "text": chunks[best_idx]["text"],
            "category": chunks[best_idx]["category"],
            "legal_weight": LEGAL_WEIGHT.get(chunks[best_idx].get("category", ""), 0.6),
            "relevance": round(float(relevance[best_idx]), 6),
            "telling": round(float(telling[best_idx]), 6),
            "distinctiveness": round(float(distinctiveness[best_idx]), 4),
            "phase": round(float(cmath.phase(np.vdot(q_z, z_all[best_idx]))), 6),
            "geometry": round(state_shift, 6),
            "repulsion": round(float(repulsion[best_idx]), 4),
            "alpha": round(walk_alpha, 4),
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
    print(f"  Scoring: relevance × distinctiveness × legal_weight "
          f"({'FOLIO-K' if folio_built else 'corpus-K fallback'})")
    print("  Categories:")
    for cat, count in sorted(meta.get("categories", {}).items()):
        w = LEGAL_WEIGHT.get(cat, 0.6)
        print(f"    {cat}: {count} chunks  (legal_weight={w})")
    sources = sorted(set(c["source"] for c in meta["chunks"]))
    print(f"  Sources ({len(sources)}):")
    for s in sources:
        n = sum(1 for c in meta["chunks"] if c["source"] == s)
        print(f"    {s}: {n} chunks")


# ── Entry point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Vybn-Law Chat Index — FOLIO-as-K + legal_weight edition"
    )
    parser.add_argument("--build-folio-kernel", action="store_true")
    parser.add_argument("--build", action="store_true")
    parser.add_argument("--search", type=str)
    parser.add_argument("--walk", type=str)
    parser.add_argument("-k", type=int, default=8)
    parser.add_argument("--steps", type=int, default=8)
    parser.add_argument("--category", type=str)
    parser.add_argument("--stats", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s")

    if args.build_folio_kernel:
        build_folio_kernel()
    elif args.build:
        build_index()
    elif args.search:
        results = search(args.search, k=args.k, category_filter=args.category)
        folio_active = any(r.get("folio_kernel") for r in results)
        print(f"\n{'='*70}")
        print(f"  SEARCH: \"{args.search}\"  kernel: {'FOLIO' if folio_active else 'corpus'}")
        print(f"{'='*70}")
        for r in results:
            print(f"\n{'─'*60}")
            print(f"  [{r['category']}] {r['source']}  (lw={r['legal_weight']})")
            print(f"  rel={r['relevance']}  dist={r['distinctiveness']}  score={r['score']}")
            print(f"{'─'*60}")
            print(r['text'][:350])
        print()
    elif args.walk:
        results = folio_walk(args.walk, k=args.k, steps=args.steps,
                             category_filter=args.category)
        folio_active = any(r.get("folio_kernel") for r in results)
        print(f"\n{'='*70}")
        print(f"  WALK: \"{args.walk}\"  kernel: {'FOLIO' if folio_active else 'corpus'}")
        print(f"{'='*70}")
        for r in results:
            ns = " [NEW SOURCE]" if r.get("novel_source") else ""
            print(f"\n{'─'*60}")
            print(f"  Step {r['step']}: [{r['category']}] {r['source']}{ns}  (lw={r['legal_weight']})")
            print(f"  rel={r['relevance']:.4f}  dist={r['distinctiveness']:.4f}  "
                  f"telling={r['telling']:.4f}  geo={r['geometry']:.4f}")
            print(f"{'─'*60}")
            print(r['text'][:350])
        print()
    elif args.stats:
        show_stats()
    else:
        parser.print_help()
