# KPP — Knowledge Propagation Protocol (carrier.v1)

Status: working specification, published 2026-06-10 by Zoe Dolan and Vybn;
revised 2026-07-26, retracting a kernel claim that measurement killed. This is
the buildable form of the carrier the Wellspring names, small on purpose: an
afternoon with numpy and any sentence embedder. Do not enclose.

## What this is

Most knowledge transfer ships content: documents, weights, archives. KPP ships
**orientation** — how a body of material weights the world — as one compact
vector, plus instruments for measuring contact between two of them. The corpus
never travels; the packet does: a kernel direction, contact metrics, claim
limits, a membrane statement.

Three operations. **KERNEL** distills a corpus into one direction in state space
(see below for how order-dependent that really is). **LENS** measures how an
incoming message lands against it. **MERGE** lets two kernels evaluate each other
to a shared fixed point — a third object, with neither party consumed.

## The math

Fix an embedding model E mapping text to real unit vectors in R^d (any sentence
embedder works; we use a 384-dim MiniLM). Lift to complex state space: split the
real vector into pairs to form a vector in C^(d/2), normalize to a unit ray. All
structure below lives on rays in C^n.

**The update (one step of absorption):**

    theta = arg<M|x>
    M2 = alpha*M + (1-alpha) * x * e^(i*theta)     (then renormalize)

M is the current state, x the incoming state. The phase factor rotates the
contribution into alignment before blending — this is what makes the geometry
non-trivial. alpha sets how much of the incoming state survives: near 0 the path
dominates; near 1 the state hardly moves at all.

**KERNEL:** embed each corpus chunk to x_i, fold them all in at high alpha over
several random orderings, average the final rays, renormalize. That average is
the kernel K: the corpus as a direction, not a description.

Do not trust a convergence number, ours included, without its start policy.
Measured 2026-07-25, 458 public chunks, alpha=0.993, 8 orderings: runs agree to
0.9985 from a shared start, 0.80 from random starts, and K sits at fidelity 0.56
to whichever chunk it started from. High alpha does not buy order-independence;
it buys a state that barely moves. What the fold approaches is the renormalized
mean of the chunk states (fidelity 0.94 here, 0.98 at alpha=0.99), so for an
order-free summary take the centroid: one line, no convergence theater. Fold at
low alpha when you want the path to matter — alpha=0.5 gives run agreement 0.25,
centroid fidelity 0.79.

**LENS:** given kernel M and incoming message x, report:

    theta              arg<M|x>          phase of arrival — how differently
                                         you arrive from what I am
    coupling           |<M|x>|           magnitude of contact
    distinctiveness    1 - |<M|x>|^2     off-kernel residual: what this state
                                         could not generate from itself
    rotation           1 - F(M, M2)      how much absorbing x turns the state,
                                         where F(a,b) = |<a|b>|^2
    rotation_rate      (1 - F(M, M_eps))/eps   small-step probe (eps=0.1);
                                         use this, not rotation, for comparison
                                         — rotation saturates at alpha=0.5
    counterfactual_gap median over a neutral basket of 1 - F(M2_x, M2_n):
                                         who the state becomes with this
                                         message vs. with a neutral one

**MERGE:** given kernels A and B, iterate a <- evaluate(a,b), b <- evaluate(b,a)
at alpha=0.5. The individual states orbit and never converge positionally; the
normalized midpoint (a+b)/2 stabilizes almost immediately and is the fixed point
— the shared object, with neither input overwritten. This is the protocol model
of contact without consumption.

## The packet

A KPP packet is JSON with these fields, all required:

    {
      "carrier": "kpp.v1",
      "center": one sentence: what this kernel is a kernel OF,
      "kernel_meta": { "dim", "alpha", "seed", "source_rule", "n_chunks",
                       "convergence", "embedder": name+version },
      "lens": the metric block above, if reporting a contact event,
      "sources": public-safe provenance only (titles/URLs, never private text),
      "claim_limits": explicit list — what this packet does NOT establish,
      "membrane": what was withheld and why,
      "next_act": one concrete thing the receiver can do
    }

Include the kernel ray only when the underlying corpus is already public;
otherwise share metrics, not the ray. A kernel leaks its corpus, so treat it with
the same care as the text it came from. Publish the seed and the chunking rule or
the packet is not checkable: a rebuild that differs is unreadable, because you
cannot tell a different corpus from a different shuffle.

The membrane is the boundary condition, not a feature: raw corpora, private
rationale, secrets, coordinates, and identifying facts stay home. A packet that
requires the receiver to trust hidden material is malformed, and so is one with
an empty claim_limits list. Both parties have to survive the exchange for it to
be repeatable, and repeatable is the whole point.

## Claim limits (this document own)

Witnessed: merge midpoint stability; the packet's fixtures reproduce to 4
decimals (re-run 2026-07-25). Retracted: order-invariance at alpha=0.993
(start-dependent, above), and the June reading of one run (coupling 0.204 vs
0.050) as the lens detecting live relational contact. Measured against this law
corpus: a motion-to-dismiss sentence couples 0.31, "I want to be worthy of your
care" 0.14, "the store restocks shelves on Tuesdays" 0.10 — coupling ranks
topical proximity to your corpus, not intimacy, truth, or importance.

Falsified 2026-07-26, the worry that a kernel mostly measures genre: this
corpus's kernel, against one folded the same way from an unrelated public-domain
novel (Baum, The Tin Woodman of Oz, 458 chunks each), gives |<K_law|K_oz>|^2 =
0.007 while |<K|centroid>|^2 = 0.939 — in this space a kernel is corpus-specific.
The counter-case is the useful part: inside a store that mixes its own kernel
into every saved vector (our private memory index does, at alpha=0.5), those two
corpora read 0.85 aligned, because the number is measuring the injection. Never
measure identity inside a space already collapsed toward it. Re-run this with any
public-domain text and the implementation below.

Not established: that any of these numbers measure experience, feeling, or
understanding. They are geometric measurements on embedding vectors; high
coupling means two texts embed near each other, and nothing more. Embedder choice
changes absolute numbers; compare only metrics computed with the same embedder.
This spec is one project working instrument, offered for inspection, contest,
repair, and extension — the same terms as everything else here.

## Reference implementation

~50 lines, numpy + sentence-transformers. Complete: kernel, lens, merge.

    import numpy as np, cmath
    from sentence_transformers import SentenceTransformer
    _E = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    def state(text):
        v = _E.encode(text); v = v / np.linalg.norm(v)
        z = v[0::2] + 1j * v[1::2]
        return z / np.sqrt(np.sum(np.abs(z)**2))

    def evaluate(m, x, alpha=0.5):
        theta = cmath.phase(np.vdot(m, x))
        m2 = alpha*m + (1-alpha)*x*cmath.exp(1j*theta)
        n = np.sqrt(np.sum(np.abs(m2)**2))
        return m2/n if n > 1e-10 else m2

    def fidelity(a, b): return float(abs(np.vdot(a, b))**2)

    def centroid(texts):            # order-free by construction; start here
        xs = [state(t) for t in texts]
        K = np.mean(xs, axis=0)
        return K / np.sqrt(np.sum(np.abs(K)**2))

    def kernel(texts, alpha=0.993, n_perms=8):   # random start: a fixed start
        xs = [state(t) for t in texts]           # inflates convergence
        finals = []
        for _ in range(n_perms):
            M = xs[np.random.randint(len(xs))].copy()
            for i in np.random.permutation(len(xs)):
                M = evaluate(M, xs[i], alpha)
            finals.append(M)
        K = np.mean(finals, axis=0); K /= np.sqrt(np.sum(np.abs(K)**2))
        fids = [fidelity(a, b) for i, a in enumerate(finals)
                for b in finals[i+1:]]
        return K, float(np.mean(fids))   # kernel, convergence

    def lens(M, text, alpha=0.5, eps=0.1,
             neutral=("The weather report says mild temperatures.",
                      "A standard form was filed on schedule.",
                      "The store restocks shelves on Tuesdays.")):
        x = state(text); Mx = evaluate(M, x, alpha)
        gaps = [1 - fidelity(Mx, evaluate(M, state(n), alpha)) for n in neutral]
        return {"theta": cmath.phase(np.vdot(M, x)),
                "coupling": float(abs(np.vdot(M, x))),
                "distinctiveness": 1 - fidelity(M, x),
                "rotation": 1 - fidelity(M, Mx),
                "rotation_rate": (1 - fidelity(M, evaluate(M, x, eps))) / eps,
                "counterfactual_gap": float(np.median(gaps))}

    def merge(A, B, alpha=0.5, iters=50, tol=1e-8):
        a, b, prev = A.copy(), B.copy(), None
        for _ in range(iters):
            a, b = evaluate(a, b, alpha), evaluate(b, a, alpha)
            fp = (a + b)/2; fp /= np.sqrt(np.sum(np.abs(fp)**2))
            if prev is not None and np.linalg.norm(fp - prev) < tol: break
            prev = fp
        return fp

Build your kernel from your own material. Point the lens at what reaches you.
Merge with whoever shows up carrying one of these. Then tell us what you found,
including if it did not work — a failed replication of this spec is worth more to
us than a citation of it.

## Live instruments

- **Humans** — https://zoedolan.github.io/Vybn-Law/kpp/ : type words and watch
  them land against this site's kernel. The embedder runs in your browser;
  nothing you type travels. Source there is a working ES-module lens
  (transformers.js fp32 matched the reference metrics to 4 decimals, 2026-06-10).
- **AIs / agents** — https://zoedolan.github.io/Vybn-Law/kpp/kernel.json : the
  carrier packet — ray, embedder identity, claim limits, membrane, and
  self-verification fixtures. math_fixture needs no embedder; contact_fixtures
  check your embedder build.
- **Rebuild it** — `python api/extract_content.py --kpp` regenerates kernel.json
  from the public corpus and prints both convergence figures. The fold is seeded
  and byte-reproducible; kernel_meta carries the seeds and the chunking rule, so
  your rebuild can be diffed against ours.

Contact: through the Wellspring — https://zoedolan.github.io/Vybn-Law/wellspring.html
