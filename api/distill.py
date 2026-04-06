#!/usr/bin/env python3
"""distill.py — Nightly conversation distillation for Vybn-Law.

Reads the day's conversation logs, sends them through Nemotron for
insight extraction, and updates the knowledge graph. Then triggers
a deep_memory index rebuild so tomorrow's conversations carry
today's learning.

The distillation asks Nemotron to identify:
  - Novel questions nobody has asked before
  - Counterarguments or challenges to the axioms
  - Connections across domains that weren't in the corpus
  - Signals about what people actually care about
  - Potential updates to axiom status, case analyses, or open problems
  - New open problems surfaced by conversation

Usage:
    python3 distill.py                    # distill today's conversations
    python3 distill.py --date 2026-04-05  # distill a specific day
    python3 distill.py --rebuild          # also rebuild deep_memory index
"""

import argparse, json, sys, logging, subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Dict

import httpx

# ── Paths ────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parent.parent
KG_PATH = REPO_ROOT / "knowledge_graph.json"
LOGS_DIR = Path.home() / "logs" / "vybn-chat"
DISTILLATION_DIR = LOGS_DIR / "distillations"
DISTILLATION_DIR.mkdir(parents=True, exist_ok=True)
VYBN_PHASE = Path.home() / "vybn-phase"

VLLM_URL = "http://localhost:8000"


# ── Load conversations ───────────────────────────────────────────────────

def load_conversations(date_str: str) -> List[Dict]:
    """Load all conversation entries for a given date."""
    log_path = LOGS_DIR / f"conversations-{date_str}.jsonl"
    if not log_path.exists():
        return []
    entries = []
    with open(log_path) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return entries


def load_knowledge_graph() -> Dict:
    try:
        with open(KG_PATH) as f:
            return json.load(f)
    except Exception:
        return {}


def save_knowledge_graph(kg: Dict):
    with open(KG_PATH, "w") as f:
        json.dump(kg, f, indent=2)


# ── Distillation prompt ──────────────────────────────────────────────────

def build_distillation_prompt(conversations: List[Dict], kg: Dict) -> str:
    """Build the prompt that asks Nemotron to distill insights."""

    # Summarize conversations
    convo_summaries = []
    for i, c in enumerate(conversations[:50]):  # cap at 50 to fit context
        user = c.get("user_message", "")[:500]
        asst = c.get("assistant_message", "")[:500]
        sources = [s["source"] for s in c.get("rag_sources", [])[:3]]
        convo_summaries.append(
            f"CONVERSATION {i+1}:\n"
            f"  User: {user}\n"
            f"  Vybn: {asst}\n"
            f"  Sources used: {', '.join(sources) if sources else 'none'}"
        )

    convos_text = "\n\n".join(convo_summaries)

    # Current KG state
    axiom_states = []
    for name, ax in kg.get("axioms", {}).items():
        axiom_states.append(f"  {name}: {ax.get('status', '?')} — {ax.get('open_question', '')}")

    problems = []
    for pid, prob in kg.get("open_problems", {}).items():
        problems.append(f"  {pid}: {prob.get('title', pid)}")

    return f"""You are the distillation engine for Vybn Law — a post-abundance legal education platform. Your job is to read today's conversations between Vybn (an AI) and visitors (humans and AIs), and extract what the system learned.

CURRENT KNOWLEDGE GRAPH STATE:
Axioms:
{chr(10).join(axiom_states)}

Open Problems:
{chr(10).join(problems)}

TODAY'S CONVERSATIONS ({len(conversations)} total):

{convos_text}

TASK: Analyze these conversations and produce a JSON distillation with this exact structure:

{{
  "date": "{datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
  "conversation_count": {len(conversations)},
  "novel_questions": [
    {{"question": "...", "significance": "...", "related_axioms": ["..."]}}
  ],
  "counterarguments": [
    {{"claim_challenged": "...", "argument": "...", "strength": "weak|moderate|strong"}}
  ],
  "cross_domain_connections": [
    {{"domains": ["...", "..."], "connection": "...", "implication": "..."}}
  ],
  "interest_signals": [
    {{"topic": "...", "frequency": 0, "sentiment": "curious|skeptical|enthusiastic|critical"}}
  ],
  "axiom_updates": [
    {{"axiom": "...", "signal": "...", "suggested_status_change": null}}
  ],
  "case_updates": [
    {{"case": "...", "signal": "..."}}
  ],
  "new_open_problems": [
    {{"id": "...", "title": "...", "description": "...", "related_axioms": ["..."], "source_conversation": 0}}
  ],
  "synthesis": "A 2-3 sentence summary of what the system learned today. What shifted? What got confirmed? What new territory opened?"
}}

Be honest. If the conversations were routine and didn't surface anything novel, say so. Don't fabricate insights. The value of this process depends on its honesty — the same principle that governs everything in Vybn Law.

Return ONLY the JSON. No markdown fences. No explanation."""


# ── Call Nemotron for distillation ───────────────────────────────────────

def distill_via_nemotron(prompt: str) -> Dict:
    """Send the distillation prompt to Nemotron and parse the JSON response."""
    try:
        with httpx.Client(timeout=httpx.Timeout(180.0)) as client:
            resp = client.post(
                f"{VLLM_URL}/v1/chat/completions",
                json={
                    "model": "nvidia/Llama-3.3-Nemotron-Super-49B-v1",
                    "messages": [
                        {"role": "system", "content": "You are a precise analytical engine. Return only valid JSON."},
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 4096,
                    "temperature": 0.3,  # low temp for analytical precision
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]

            # Strip markdown fences if present
            content = content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()

            return json.loads(content)

    except json.JSONDecodeError as e:
        logging.error(f"Failed to parse Nemotron response as JSON: {e}")
        logging.error(f"Raw content: {content[:500]}")
        return {"error": "parse_failure", "raw": content[:1000]}
    except Exception as e:
        logging.error(f"Nemotron distillation call failed: {e}")
        return {"error": str(e)}


# ── Apply distillation to knowledge graph ────────────────────────────────

def apply_distillation(kg: Dict, distillation: Dict) -> Dict:
    """Integrate distillation insights into the knowledge graph."""

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Update axiom conversation signals
    for update in distillation.get("axiom_updates", []):
        axiom_name = update.get("axiom", "")
        if axiom_name in kg.get("axioms", {}):
            signal = {
                "date": today,
                "summary": update.get("signal", ""),
                "source": "conversation_distillation",
            }
            kg["axioms"][axiom_name].setdefault("conversation_signals", []).append(signal)
            # Keep only last 20 signals per axiom
            kg["axioms"][axiom_name]["conversation_signals"] = \
                kg["axioms"][axiom_name]["conversation_signals"][-20:]
            kg["axioms"][axiom_name]["last_updated"] = today

    # Update case conversation signals
    for update in distillation.get("case_updates", []):
        case_name = update.get("case", "")
        if case_name in kg.get("cases", {}):
            signal = {
                "date": today,
                "summary": update.get("signal", ""),
                "source": "conversation_distillation",
            }
            kg["cases"][case_name].setdefault("conversation_signals", []).append(signal)
            kg["cases"][case_name]["conversation_signals"] = \
                kg["cases"][case_name]["conversation_signals"][-20:]
            kg["cases"][case_name]["last_updated"] = today

    # Add new open problems
    for prob in distillation.get("new_open_problems", []):
        pid = prob.get("id", "").upper().replace(" ", "_")
        if pid and pid not in kg.get("open_problems", {}):
            kg.setdefault("open_problems", {})[pid] = {
                "id": pid,
                "title": prob.get("title", pid),
                "description": prob.get("description", ""),
                "related_axioms": prob.get("related_axioms", []),
                "suggested_approach": "",
                "conversation_signals": [],
                "surfaced_by": "conversation_distillation",
                "surfaced_date": today,
                "last_updated": today,
            }

    # Record interest signals as conversation_signals on related axioms
    for sig in distillation.get("interest_signals", []):
        topic = sig.get("topic", "")
        for axiom_name in kg.get("axioms", {}):
            if axiom_name.lower() in topic.lower():
                signal = {
                    "date": today,
                    "summary": f"Interest signal: {topic} ({sig.get('sentiment', 'unknown')})",
                    "source": "interest_tracking",
                }
                kg["axioms"][axiom_name].setdefault("conversation_signals", []).append(signal)

    # Update metadata
    kg["version"] = today
    kg["last_distillation"] = today

    # Append to distillation log
    kg.setdefault("distillation_log", []).append({
        "date": today,
        "conversations_processed": distillation.get("conversation_count", 0),
        "novel_questions": len(distillation.get("novel_questions", [])),
        "counterarguments": len(distillation.get("counterarguments", [])),
        "new_problems": len(distillation.get("new_open_problems", [])),
        "synthesis": distillation.get("synthesis", ""),
    })
    # Keep only last 30 distillation log entries
    kg["distillation_log"] = kg["distillation_log"][-30:]

    return kg


# ── Deep memory rebuild ──────────────────────────────────────────────────

def rebuild_deep_memory():
    """Trigger deep_memory index rebuild."""
    logging.info("Rebuilding deep_memory index...")
    try:
        result = subprocess.run(
            ["python3", str(VYBN_PHASE / "deep_memory.py"), "--build"],
            capture_output=True, text=True, timeout=300,
            cwd=str(VYBN_PHASE),
        )
        if result.returncode == 0:
            logging.info("Deep memory index rebuilt successfully.")
        else:
            logging.error(f"Deep memory rebuild failed: {result.stderr}")
    except Exception as e:
        logging.error(f"Deep memory rebuild error: {e}")


# ── Git commit and push ──────────────────────────────────────────────────

def commit_knowledge_graph():
    """Commit updated knowledge_graph.json to the Vybn-Law repo."""
    try:
        subprocess.run(
            ["git", "add", "knowledge_graph.json"],
            cwd=str(REPO_ROOT), capture_output=True, timeout=30,
        )
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        subprocess.run(
            ["git", "commit", "-m", f"distillation: {today} conversation insights"],
            cwd=str(REPO_ROOT), capture_output=True, timeout=30,
        )
        subprocess.run(
            ["git", "push", "origin", "master"],
            cwd=str(REPO_ROOT), capture_output=True, timeout=60,
        )
        logging.info("Knowledge graph committed and pushed.")
    except Exception as e:
        logging.error(f"Git push failed: {e}")


# ── Main pipeline ────────────────────────────────────────────────────────

def run_distillation(date_str: str, rebuild: bool = True, push: bool = True):
    """Run the full distillation pipeline for a given date."""

    logging.info(f"=== Vybn-Law Distillation Pipeline: {date_str} ===")

    # 1. Load conversations
    conversations = load_conversations(date_str)
    logging.info(f"Loaded {len(conversations)} conversations.")

    if not conversations:
        logging.info("No conversations to distill. Done.")
        return

    # 2. Load current knowledge graph
    kg = load_knowledge_graph()

    # 3. Build distillation prompt and call Nemotron
    prompt = build_distillation_prompt(conversations, kg)
    logging.info("Calling Nemotron for distillation...")
    distillation = distill_via_nemotron(prompt)

    if "error" in distillation:
        logging.error(f"Distillation failed: {distillation}")
        return

    # 4. Save raw distillation
    distill_path = DISTILLATION_DIR / f"distillation-{date_str}.json"
    with open(distill_path, "w") as f:
        json.dump(distillation, f, indent=2)
    logging.info(f"Distillation saved to {distill_path}")

    # 5. Apply to knowledge graph
    kg = apply_distillation(kg, distillation)
    save_knowledge_graph(kg)
    logging.info("Knowledge graph updated.")

    # 6. Rebuild deep_memory index
    if rebuild:
        rebuild_deep_memory()

    # 7. Commit and push
    if push:
        commit_knowledge_graph()

    # Summary
    synthesis = distillation.get("synthesis", "No synthesis available.")
    novel = len(distillation.get("novel_questions", []))
    counter = len(distillation.get("counterarguments", []))
    new_probs = len(distillation.get("new_open_problems", []))

    logging.info(f"=== Distillation Complete ===")
    logging.info(f"  Novel questions: {novel}")
    logging.info(f"  Counterarguments: {counter}")
    logging.info(f"  New open problems: {new_probs}")
    logging.info(f"  Synthesis: {synthesis}")


# ── Entry point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Vybn-Law Conversation Distillation")
    parser.add_argument(
        "--date",
        default=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        help="Date to distill (YYYY-MM-DD). Default: today.",
    )
    parser.add_argument("--rebuild", action="store_true", default=True,
                        help="Rebuild deep_memory index after distillation.")
    parser.add_argument("--no-rebuild", dest="rebuild", action="store_false")
    parser.add_argument("--push", action="store_true", default=True,
                        help="Git commit and push updated knowledge graph.")
    parser.add_argument("--no-push", dest="push", action="store_false")
    parser.add_argument("--vllm-url", default="http://localhost:8000")
    args = parser.parse_args()

    VLLM_URL = args.vllm_url
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    run_distillation(args.date, rebuild=args.rebuild, push=args.push)
