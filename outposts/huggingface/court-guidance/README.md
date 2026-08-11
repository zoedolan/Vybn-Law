---
title: Court Guidance Beta
emoji: ⚖️
colorFrom: blue
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
short_description: From court sources to dependable AI guidance.
tags:
  - legal-tech
  - access-to-justice
  - court-tech
  - responsible-ai
---

# Court Guidance Beta

A practical beta for courts adopting AI.

> **How do we design systems that care at least as much as we do about getting things right?**

The method: imagine the end state — a court's own system — then work backward.
Four layers, in order, matching the opening visual:

1. **raw material** — the court's own official materials, distilled to the
   basics. The [Public Counsel Appellate Clinic resource
   library](https://publiccounsel.org/clinics/appellate-clinic/resources-materials/)
   is linked only as an example of how such materials can be organized; no
   documents are copied, and every court verifies its own sources.
2. **rules / guidelines** — statewide appellate rules and local rules as small
   structured records: one requirement, one exact source, one owner, one
   review status.
3. **ethics / values** — a public corollary to the professional-conduct rules
   lawyers answer to and the canons judges answer to: what the system may do,
   must refuse, and when it hands off to a person.
4. **self / own system** — the design objective: the court's own system, under
   its control, ending in a mechanism that buttresses the court's role in
   administering justice.

Then the cycle repeats: the layer-4 mock-up embodies the return edge —
the system feeds back sharper material, clearer rules, and stronger standards.

On the page, each layer carries a one-line tagline and an `▸ in practice`
cue that opens a full-screen mock-up of what the layer looks like. The closing
question now branches into two working beta surfaces: a Court Guidance
conversation on `gpt-5.6-sol`, calibrated by `PUBLIC_WAKE.md`, this Space,
the Co-protection Commons, and retrieved canonical Vybn-Law public sources; and
a public, attributed Court Guidance thread inside the Co-protection Commons.

## Status and limits

Independent prototype by Zoe Dolan and Vybn. Not court-approved, not legal
advice, no live case data. Sample rule records are templates until a
participating court supplies, verifies, and adopts its own sources. The live
conversation is a design beta, not a court deployment: it has no participating
court's verified source packet. Do not submit confidential, sealed, privileged,
personally identifying, or live-case information.

## Public routes

- `/` — the page
- `/court-guidance.json` — the machine-readable model and return contract
- `/health` and `/api/health` — deployment health and exact model identity
- `/api/chat` — same-origin, privately archived public conversation
- `SOUL.md` — the project operating brief
- `PUBLIC_WAKE.md` — the public-only wake, membrane, and first-contact posture
- `https://vybn-co-protection.hf.space/court-guidance.html` — the attributed public working thread

## The adaptation loop

Conversation turns are privately preserved as immutable candidate-gap records.
Commons posts remain append-only attributed public events tagged to the
`court-guidance` channel. Neither stream edits a court source, rule, standard,
or model prompt automatically. Review checks the official source, names an
owner, records acceptance, rejection, or no change, and returns any survivor to
raw material, rules / guidelines, or ethics / values. The next system pass is
rebuilt from those reviewed layers. At 08:15 UTC each day, a scheduled job
snapshots both streams and asks the same public sol instance for one
privacy-protective daily return. Every snapshot and every summary version is
preserved; only the latest summary for each day is shown. Cross-day
summary-of-summaries is deliberately not enabled.

## Source lineage

- Upstream workshop: <https://huggingface.co/spaces/Vybn/co-protection>
- Canonical source: <https://github.com/zoedolan/Vybn-Law/tree/master/outposts/huggingface/court-guidance>

## Local run / test

`uvicorn app:app --host 0.0.0.0 --port 7860` · `pytest -q`
