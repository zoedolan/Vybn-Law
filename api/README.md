# Vybn Chat API + Learning Loop

Backend for the Vybn-Law chat interface. Runs on the DGX Spark, bridging the static GitHub Pages frontend to Nemotron 120B via vLLM with deep_memory RAG and a nightly learning loop that feeds conversations back into the knowledge base.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        THE LEARNING LOOP                        │
│                                                                 │
│  Browser (chat.html)                                           │
│      │                                                         │
│      ▼                                                         │
│  Chat API (Spark:3001)                                         │
│      ├─► deep_memory v9 search (RAG context)                   │
│      ├─► vLLM/Nemotron 120B (localhost:8000)                   │
│      ├─► Stream response to browser                            │
│      └─► Log conversation (~/logs/vybn-chat/*.jsonl)           │
│                                                                 │
│  Nightly (cron, 6 AM UTC):                                     │
│      ├─► distill.py reads day's conversation logs              │
│      ├─► Nemotron extracts insights (novel questions,          │
│      │   counterarguments, interest signals, new problems)     │
│      ├─► Updates knowledge_graph.json                          │
│      ├─► Commits + pushes to GitHub (→ GitHub Pages updates)   │
│      ├─► Rebuilds deep_memory index                            │
│      └─► Tomorrow's conversations are smarter                  │
│                                                                 │
│  Wellspring (wellspring.html):                                 │
│      └─► Loads knowledge_graph.json dynamically                │
│          (axiom status, case updates, conversation signals)    │
└─────────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `vybn_chat_api.py` | FastAPI server: chat streaming, RAG, conversation logging, KG serving |
| `distill.py` | Nightly distillation: reads logs, calls Nemotron, updates knowledge graph |
| `nightly.sh` | Cron orchestrator: pull repos → distill → rebuild index → push |
| `requirements.txt` | Python dependencies |

## Setup on Spark

```bash
cd ~/Vybn-Law/api
pip install -r requirements.txt

# Start the chat API
python3 vybn_chat_api.py --port 3001 --vllm-url http://localhost:8000

# Install the nightly cron
crontab -e
# Add: 0 6 * * * /home/vybnz69/Vybn-Law/api/nightly.sh >> /home/vybnz69/logs/nightly-distill.log 2>&1
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Streaming chat with RAG + conversation logging |
| GET | `/api/health` | Liveness, model status, KG version, conversation count |
| GET | `/api/identity` | Vybn identity for UI preamble |
| GET | `/api/knowledge-graph` | Full knowledge graph JSON |
| GET | `/api/distillations` | Recent distillation summaries |

## The Knowledge Graph

`knowledge_graph.json` in the repo root is the single source of truth. It contains:
- Six axioms with status, evidence, open questions, and conversation signals
- Case analyses with holdings, findings, and conversation signals
- Open problems (including those surfaced by conversations)
- Distillation log
- Conversation count and last distillation timestamp

The Wellspring page loads this dynamically. The chat API reads it for the system prompt. The distillation engine writes to it. The nightly cron commits and pushes it so GitHub Pages serves the latest version.

## Manual Distillation

```bash
# Distill today's conversations
python3 distill.py

# Distill a specific date
python3 distill.py --date 2026-04-05

# Skip index rebuild (faster, for testing)
python3 distill.py --no-rebuild --no-push
```

## Public exposure

The Spark is not directly public. The portal (port 8420) is exposed via the
named Cloudflare tunnel `vybn-api` (UUID `c7732a3e-f5aa-44a3-b994-f6661d6cd6f1`)
at the stable URL `https://api.vybn.ai`. The tunnel runs as a system service
(`cloudflared.service`) with config at `/etc/cloudflared/config.yml`.

Do NOT launch quick tunnels (`cloudflared tunnel --url ...`). Those URLs rotate
on every restart and the frontend rewrite pattern that used to compensate for
that is retired. The old `vybn-chat-tunnel.sh` is archived under
`~/Vybn/_archive/vybn-chat-tunnel.sh.RETIRED_2026-04-21`.

The internal chat API on `localhost:3001` (this file's subject) is reached
process-to-process inside the Spark. Frontends point at `https://api.vybn.ai`
via the env var `VYBN_API_BASE` (default set in each page).
