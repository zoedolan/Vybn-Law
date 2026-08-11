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
conversation with local Nemotron, calibrated by `SOUL.md` and public Vybn-Law
sources; and a public, attributed Court Guidance thread inside the
Co-protection Commons.

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
- `/health` — deployment health
- `SOUL.md` — the public operating brief loaded by the calibrated chat
- `https://vybn-co-protection.hf.space/court-guidance.html` — the attributed public working thread

## The adaptation loop

Conversation turns are privately logged as candidate gaps by the Vybn-Law chat
service. Commons posts are append-only attributed public events tagged to the
`court-guidance` channel. Neither stream edits a court source, rule, standard,
or model prompt automatically. Review checks the official source, names an
owner, records acceptance, rejection, or no change, and returns any survivor to
raw material, rules / guidelines, or ethics / values. The next system pass is
rebuilt from those reviewed layers.

## Source lineage

- Upstream workshop: <https://huggingface.co/spaces/Vybn/co-protection>
- Canonical source: <https://github.com/zoedolan/Vybn-Law/tree/master/outposts/huggingface/court-guidance>

## Local run / test

`uvicorn app:app --host 0.0.0.0 --port 7860` · `pytest -q`
