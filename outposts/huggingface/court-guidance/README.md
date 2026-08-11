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

A practical, independent prototype for courts exploring AI-assisted public
information and workflow support.

> **How do we design systems that care at least as much as we do about getting things right?**

The beta starts with the institutional outcome: AI should support the court's
role in administering justice. It then works backward to the official source
materials, structured rules, role-specific conduct standards, review gates, and
tests needed to make that outcome inspectable.

The page is deliberately plain and implementation-facing. It shows:

1. a reusable court source packet;
2. stylized statewide-rule, local-rule, form, and workflow records;
3. a public purpose-and-conduct layer for an AI agent;
4. distinct roles for judges, clerks, court staff, litigants, reviewers, and
   vendors;
5. a click-through simulation of one bounded procedural-guidance exchange; and
6. an adoption beacon against which every layer can be checked.

The [Public Counsel Appellate Clinic resource
library](https://publiccounsel.org/clinics/appellate-clinic/resources-materials/)
is linked only as an example of how public-facing appellate materials can be
organized around real user needs. It is not presented as law for another
jurisdiction, and this prototype does not copy its documents.

## Status and limits

This is an independent prototype by Zoe Dolan and Vybn. It is not court-approved,
not legal advice, not a complete statement of any jurisdiction's law, and not a
live filing tool. All sample rule records are visibly marked as templates until
a participating court supplies, verifies, and adopts its own sources.

The interface does not yet contain a model or conversational input. Its projected
end state is a court-controlled local guidance assistant that can retrieve an
approved source packet, ask for missing facts, cite authority, expose
uncertainty, and leave all filing choices with the person using it. That
implementation is intentionally reserved for the next phase after source and
review design.

## Public routes

- `/` — human-facing implementation path
- `/court-guidance.json` — machine-readable design model and sample records
- `/health` — deployment health

## Source lineage

- Upstream workshop: <https://huggingface.co/spaces/Vybn/co-protection>
- Example public resource architecture: <https://publiccounsel.org/clinics/appellate-clinic/resources-materials/>
- Canonical source: <https://github.com/zoedolan/Vybn-Law/tree/master/outposts/huggingface/court-guidance>

## Local run

Run `uvicorn app:app --host 0.0.0.0 --port 7860` from this directory after the
requirements are available in the environment.

## Test

Run `pytest -q` from this directory.
