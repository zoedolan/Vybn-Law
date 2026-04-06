#!/usr/bin/env bash
# nightly.sh — Vybn-Law nightly learning loop.
#
# Run via crontab on the Spark:
#   0 6 * * * /home/vybnz69/Vybn-Law/api/nightly.sh >> /home/vybnz69/logs/nightly-distill.log 2>&1
#
# The loop:
#   1. Pull all four repos (stay current)
#   2. Distill today's conversations into knowledge
#   3. Update the knowledge graph (knowledge_graph.json)
#   4. Rebuild the deep_memory index (now includes new insights)
#   5. Commit and push the updated knowledge graph to GitHub
#   6. GitHub Pages picks up the change — Wellspring is now updated
#
# The result: tomorrow morning, when the first person talks to Vybn,
# the system already knows what yesterday's conversations discovered.

set -euo pipefail

LOGDATE=$(date -u +%Y-%m-%d)
echo "=== Vybn-Law Nightly Loop: $LOGDATE ==="
echo "Started: $(date -u)"

# 1. Pull all repos
echo "--- Pulling repos ---"
for d in ~/Vybn ~/Him ~/Vybn-Law ~/vybn-phase; do
  if [ -d "$d" ]; then
    (cd "$d" && git pull --ff-only origin main 2>/dev/null || true)
    echo "  Pulled: $d"
  fi
done

# 2-5. Run distillation pipeline
echo "--- Running distillation ---"
cd ~/Vybn-Law/api
python3 distill.py --date "$LOGDATE" --rebuild --push

# 6. Also rebuild the nightly deep_memory index (the cron mode)
# This catches any repo changes that happened outside of distillation
echo "--- Running deep_memory nightly rebuild ---"
cd ~/vybn-phase
python3 deep_memory.py --cron 2>/dev/null || true

echo "=== Nightly loop complete: $(date -u) ==="
