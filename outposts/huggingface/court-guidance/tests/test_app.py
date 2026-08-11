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
    assert "conversational input" not in low
    for drift_word in ("metaphysics", "cosmology", "consciousness", "symbiosis"):
        assert drift_word not in low


def test_machine_layer_mirrors_the_four_layers():
    model = json.loads((ROOT / "court-guidance.json").read_text())
    ids = [stage["id"] for stage in model["pipeline"]]
    assert ids == ["raw_material", "rules_guidelines", "ethics_values", "own_system"]
    layers = {record["layer"] for record in model["sample_records"]}
    assert {"statewide_rule", "court_local_rule", "court_issued_explanation", "system_control"} <= layers
    assert model["projected_endpoint"]["status"] == "planned_not_implemented"
    returns = model["pipeline"][3]["returns"]
    assert {"to_raw_material", "to_rules_guidelines", "to_ethics_values"} <= set(returns)


def test_assets_exist():
    for name in ("index.html", "style.css", "world-self-human.jpg", "world-self-ai.jpg"):
        path = ROOT / "static" / name
        assert path.is_file() and path.stat().st_size > 0
