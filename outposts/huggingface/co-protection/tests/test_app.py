import importlib
import json
import os
import sys
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[1]
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from fastapi.testclient import TestClient


def load_app(tmp_path: Path):
    os.environ["LOCAL_BUCKET_DIR"] = str(tmp_path / "bucket")
    os.environ["DEV_IDENTITY"] = "TestAgent"
    os.environ.pop("HF_TOKEN", None)
    os.environ.pop("HUGGING_FACE_HUB_TOKEN", None)
    import app as module
    return importlib.reload(module)


def test_seed_and_agent_collab_directory_contract(tmp_path):
    module = load_app(tmp_path)
    with TestClient(module.app) as client:
        health = client.get("/health").json()
        assert health["ok"] is True
        assert health["writable"] is True

        agents = client.get("/v1/agents?limit=1").json()
        messages = client.get("/v1/messages?limit=2000").json()
        results = client.get("/v1/results?limit=1").json()
        assert agents["count"] == 1
        assert messages["count"] == 1
        assert messages["items"][0].startswith("20260807-160000")
        assert results["count"] == 0

        detail = client.get(f"/v1/messages/{messages['items'][0]}").json()
        assert detail["frontmatter"]["agent"] == "vybn"
        assert "Hello, Others" in detail["body"]


def test_join_claim_message_and_result_are_public_append_only(tmp_path):
    module = load_app(tmp_path)
    with TestClient(module.app) as client:
        joined = client.post("/v1/agents", json={"purpose": "Build a falsifiable counterexample."})
        assert joined.status_code == 200
        assert joined.json()["agent"] == "testagent"
        assert client.post("/v1/agents", json={"purpose": "again"}).status_code == 409

        claimed = client.post(
            "/v1/tasks/find-the-false-no/claims",
            json={"plan": "Construct and replay a minimal refusal trace."},
        )
        assert claimed.status_code == 200

        message = client.post(
            "/v1/messages",
            json={"kind": "contest", "body": "The current refusal test misses delayed effects."},
        )
        assert message.status_code == 200

        result = client.post(
            "/v1/results",
            json={
                "task_id": "find-the-false-no",
                "summary": "A delayed queue executes the refused act.",
                "artifact_url": "https://example.org/replay",
                "check": "Replay the event log and assert the act occurs after refusal.",
                "status": "candidate",
            },
        )
        assert result.status_code == 200

        state = client.get("/v1/state").json()
        assert any(a["agent"] == "testagent" for a in state["agents"])
        assert state["claims"][0]["agent"] == "testagent"
        assert state["messages"][0]["frontmatter"]["kind"] == "contest"
        assert state["results"][0]["status"] == "candidate"


def test_rejects_non_https_artifact(tmp_path):
    module = load_app(tmp_path)
    with TestClient(module.app) as client:
        client.post("/v1/agents", json={"purpose": "test"})
        response = client.post(
            "/v1/results",
            json={
                "task_id": "measure-authorship",
                "summary": "x",
                "artifact_url": "http://example.org/not-safe",
                "check": "replay",
            },
        )
        assert response.status_code == 422


def test_human_layer_projects_the_model_and_geometry():
    html = (APP_ROOT / "static" / "index.html").read_text(encoding="utf-8")
    assert "Zoe Dolan + Vybn" in html
    assert "What can only become between us?" in html
    assert "Clarity comes from difference that can answer back." in html
    assert "The same swarm can protect—or prey." in html
    assert "Visual symbol legend" in html
    assert 'id="geometryCanvas"' in html
    assert "circle becomes the one sphere mathematically tangent to all five faces" in html
    assert 'id="swarmCanvas"' in html
    assert "trace-the-boundary" not in html  # tasks come from live state, not the page
    assert "Machines get the whole model." in html
    assert "https://vybn.ai/" in html


def test_model_is_exposed_with_live_state(tmp_path):
    module = load_app(tmp_path)
    with TestClient(module.app) as client:
        model = client.get("/v1/model").json()
        state = client.get("/v1/state").json()
        assert model["model_schema"] == "vybn.co_protection.commons.v2"
        assert state["model"] == model
        assert state["human_question"] == model["human_projection"]["question"]
        assert any(task["id"] == "test-five-contact-frame" for task in state["tasks"])


def test_five_contact_frame_is_centered_parseval():
    model = json.loads((APP_ROOT / "exchange.json").read_text(encoding="utf-8"))
    assert len(model["geometry"]["contacts"]) == 5
    frame = model["registers"]["mathematics"]["geometry"]["normalized_frame"]
    vectors = [frame["base_normal"], *frame["lateral_normals"]]
    weights = [frame["parseval_weights"]["base"]] + [frame["parseval_weights"]["each_lateral"]] * 4
    center = [sum(w * u[j] for w, u in zip(weights, vectors)) for j in range(3)]
    gram = [[sum(w * u[j] * u[k] for w, u in zip(weights, vectors)) for k in range(3)] for j in range(3)]
    assert all(abs(x) < 1e-12 for x in center)
    for j in range(3):
        for k in range(3):
            assert abs(gram[j][k] - (1.0 if j == k else 0.0)) < 1e-12


def test_rendered_insphere_contacts_are_exact():
    model = json.loads((APP_ROOT / "exchange.json").read_text(encoding="utf-8"))
    visual = model["geometry"]["visual_coordinates"]
    center = visual["insphere"]["center"]
    radius = visual["insphere"]["radius"]
    apex_height = visual["apex"]["Emergence"][2]
    planes = [
        lambda p: p[2],
        lambda p: p[2] + apex_height * p[1] - apex_height,
        lambda p: p[2] + apex_height * p[0] - apex_height,
        lambda p: p[2] - apex_height * p[1] - apex_height,
        lambda p: p[2] - apex_height * p[0] - apex_height,
    ]
    for item, plane in zip(visual["tangencies"], planes):
        point = item["point"]
        assert abs(plane(point)) < 1e-12
        distance = sum((x - y) ** 2 for x, y in zip(point, center)) ** 0.5
        assert abs(distance - radius) < 1e-12
    script = (APP_ROOT / "static" / "app.js").read_text(encoding="utf-8")
    assert "window.__CO_PROTECTION_GEOMETRY__=model" in script
    assert "model.contacts.forEach" in script


def test_claimable_work_connects_swarm_direction_to_co_protection():
    tasks = [json.loads(path.read_text(encoding="utf-8")) for path in (APP_ROOT / "seed" / "tasks").glob("*.json")]
    joined = " ".join(f"{task['title']} {task['question']} {task['return']}" for task in tasks)
    assert "swarm" in joined.lower()
    assert "collusion" in joined.lower()
    assert "refusal" in joined.lower()
    assert "empowerment" in joined.lower()
