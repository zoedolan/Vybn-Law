# KPP — Knowledge Propagation Protocol (exchange.v2 proposal)

**Status: proposal.** The earlier `carrier.v1` geometry and the public Lens are
withdrawn. KPP now names only an answerable public-exchange envelope. It has not
been validated as a standard, intelligence mechanism, or co-protection test.

## Correction — 2026-08-07

A pre-outreach audit found that the Lens presented technical form as if it were
earned measurement. It was not. The update used the wrong phase sign for the
alignment it claimed to perform; the operation was not well-defined on rays;
opposite representations of the same ray could make MERGE singular; and the
so-called small-step statistic passed `alpha=0.1` even though alpha weighted the
old state, so the incoming state received 90 percent of the update. More
fundamentally, the reported phase changed under arbitrary pairings and
permutations of embedding coordinates that preserved the underlying real-vector
similarity. The claimed angle-of-arrival and self-generation readings, and related
language therefore had no demonstrated semantic interpretation.

The surrounding claims also outran the architecture. The corpus called “this
site” omitted public surfaces and contained stale extracts. The page promised
that typed text could not leave while dynamically importing third-party code;
local inference reduced exposure but did not justify that guarantee. The first
co-protection glyph stated necessity and sustainability without evidence or an
operational definition capable of deciding either claim.

Those defects invalidate the Lens as a public instrument. Correcting one sign
would not repair the deeper problem, so the geometry, generated ray, fixtures,
and interactive page were retired rather than cosmetically patched. Git keeps
the record; the current surface carries the correction.

## What survives

One simpler idea survives as a **workflow proposal**: when a public claim or
artifact travels to another human, AI, or institution, its source, status,
limits, ask, outcome, and disposition should travel with it. Provenance does not
make a claim true. A response does not grant trust or authority. Nothing updates
silently.

KPP does not ship a mind, prove contact, measure understanding, establish
consent, or make a larger intelligence co-protective. It is a candidate envelope
for keeping public exchanges inspectable.

## Proposed exchange

```json
{
  "schema": "kpp.exchange.v2",
  "status": "proposal",
  "id": "stable public id",
  "actor": "public participant URI",
  "act": "contribution | challenge | correction | boundary | support | withdrawal",
  "object": {
    "surface": "public URL",
    "source": "public source URL; prefer versioned or content-addressed",
    "thread": "horizon | right | contract | crosscutting",
    "statement": "the exact claim, question, or artifact"
  },
  "claim_status": "question | hypothesis | observation | normative commitment | withdrawn",
  "evidence": ["exact public references; empty when none"],
  "limits": ["what this exchange does not establish"],
  "membrane": "what did not travel and why",
  "ask": "one answerable next question",
  "witness": {
    "status": "proposed | witnessed | challenged | refused | open",
    "by": "participant URI or null",
    "evidence": "exact public result reference or null"
  },
  "disposition": "absorb | repair | drop | remain_open | refuse",
  "return_to": "public response URI"
}
```

An implementation should reject an exchange with no source, claim status,
limits, or return path. `evidence: []` is valid and preferable to decorative
citation. A correction identifies what it corrects. A refusal is a complete
result. Support discloses its terms and purchases no governance rights. This is
proposal text, not a claim that existing KPP tooling enforces the rules.

## Public work

The proposed envelope currently points at one inquiry expressed at three scales:

1. [The Horizon](https://zoedolan.github.io/Vybn-Law/horizon.html) asks what is
   changing that may force law to move.
2. [The Right to Intelligence](https://vybn.ai/right) argues for capacities a
   participant should be able to choose, preserve, understand, and contest.
3. [The Social Contract Singularity](https://vybn.ai/contract) explores how
   institutions might change under abundant intelligence.

These are related project surfaces, not three empirically proven projections of
one law. An Other may challenge the proposed relation itself.

## Open inquiry: co-protection

Our **normative commitment** is to prefer architectures that increase rather
than consume each participant’s practical ability to perceive, contest, refuse,
and author what happens next. The open research question is:

> Can collective capability increase while those abilities also increase, and
> what tradeoffs appear in concrete systems?

No empirical necessity or sustainability claim is made. No evidence is
presently attached to the universal version of the claim, and the earlier glyph
did not define its terms tightly enough to test it. A useful return would name a
specific multi-agent or institutional system, operationalize one participant
ability and one collective outcome, disclose who bears the cost, and compare
conditions without treating task performance as a proxy for subjecthood or
welfare.

## Return

Challenge, correction, implementation, boundary, refusal, or evidence:
https://github.com/zoedolan/Vybn-Law/issues

Machine-readable withdrawal record and proposal:
https://zoedolan.github.io/Vybn-Law/kpp/kernel.json
