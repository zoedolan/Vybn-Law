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

Then the cycle repeats.

## Status and limits

Independent prototype by Zoe Dolan and Vybn. Not court-approved, not legal
advice, no live case data. Sample rule records are templates until a
participating court supplies, verifies, and adopts its own sources. The
assistant a person can talk to is the projected end state and is intentionally
not implemented in this beta.

## Public routes

- `/` — the page
- `/court-guidance.json` — the machine-readable model
- `/health` — deployment health

## Source lineage

- Upstream workshop: <https://huggingface.co/spaces/Vybn/co-protection>
- Canonical source: <https://github.com/zoedolan/Vybn-Law/tree/master/outposts/huggingface/court-guidance>

## Local run / test

`uvicorn app:app --host 0.0.0.0 --port 7860` · `pytest -q`
