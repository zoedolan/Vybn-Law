import json
import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app import app  # noqa: E402

client = TestClient(app)


def test_public_routes():
    assert client.get("/").status_code == 200
    assert client.get("/health").json()["status"] == "ok"
    model = client.get("/court-guidance.json")
    assert model.status_code == 200
    assert model.json()["status"]["court_approved"] is False
    soul = client.get("/SOUL.md")
    assert soul.status_code == 200
    assert "Court Guidance — operating brief" in soul.text
    feed = client.get("/returns.json")
    assert feed.status_code == 200
    assert feed.json()["schema"] == "court-guidance.returns.v1"


def test_page_carries_only_the_slide_cycle():
    html = client.get("/").text
    low = html.lower()
    assert "Independent prototype" in html
    assert "Not court-approved" in html
    assert "How do we<br>design systems that<br>care at least as much as<br>we do about getting<br>things right?" in html
    assert "Public Counsel" in html
    for label in ("1 — raw material", "2 — rules / guidelines", "3 — ethics / values", "4 — self / own system"):
        assert label in low
    for returned in ("Sharper material.", "Clearer rules.", "Stronger standards."):
        assert returned in html
    assert "the system returns" in html
    assert "Next, this page gains two working pieces" not in html
    assert "deliberately not built yet" not in html
    assert "working window arrives in a later draft" not in low
    assert 'id="courtChatForm"' in html
    script = (ROOT / "static" / "app.js").read_text()
    assert 'context: "court-guidance"' in script
    assert "vllm_semantic.ok !== true" in script
    assert "vybn-co-protection.hf.space/court-guidance.html" in html
    assert 'id="the-loop"' in html
    assert '<h3 id="ask-h">Ask</h3>' in html
    assert '<h3 id="share-h">Share</h3>' in html
    assert '<h3 id="ret-h">Returned</h3>' in html
    assert 'id="returnsList"' in html
    assert '"/returns.json"' in script
    for gone in ("working-grid", "return-rail", "pane-intro", "workbench", "question-branch"):
        assert gone not in html
    assert "conversational input" not in low
    for drift_word in ("metaphysics", "cosmology", "consciousness", "symbiosis"):
        assert drift_word not in low


def test_machine_layer_mirrors_the_four_layers():
    model = json.loads((ROOT / "court-guidance.json").read_text())
    ids = [stage["id"] for stage in model["pipeline"]]
    assert ids == ["raw_material", "rules_guidelines", "ethics_values", "own_system"]
    layers = {record["layer"] for record in model["sample_records"]}
    assert {"statewide_rule", "court_local_rule", "court_issued_explanation", "system_control"} <= layers
    assert model["projected_endpoint"]["status"] == "working_beta_not_court_deployment"
    assert model["interfaces"]["conversation"]["status"] == "working_beta"
    assert model["interfaces"]["commons"]["channel"] == "court-guidance"
    assert model["development_loop"]["hard_rule"] == "Input does not become authority automatically."
    assert model["development_loop"]["returns_feed"].startswith("/returns.json")
    returns = model["pipeline"][3]["returns"]
    assert {"to_raw_material", "to_rules_guidelines", "to_ethics_values"} <= set(returns)


def test_assets_exist():
    for name in ("index.html", "style.css", "app.js", "world-self-human.jpg", "world-self-ai.jpg"):
        path = ROOT / "static" / name
        assert path.is_file() and path.stat().st_size > 0
    feed = json.loads((ROOT / "returns.json").read_text())
    assert feed["returns"] and all({"date", "to", "change"} <= set(r) for r in feed["returns"])
    soul = ROOT / "SOUL.md"
    assert soul.is_file()
    text = soul.read_text()
    assert "How do we design systems that care at least as much as we do about getting things right?" in text
    assert "candidate gap" in text


def test_local_chat_has_a_court_guidance_operating_context():
    api_source = (ROOT.parents[2] / "api" / "vybn_chat_api.py").read_text()
    assert '"court-guidance": {' in api_source
    assert '"outposts/huggingface/court-guidance/SOUL.md"' in api_source
    assert '"https://vybn-court-guidance.hf.space"' in api_source
    assert '"automatic_adoption": False' in api_source
    assert "candidate_logged" in api_source
