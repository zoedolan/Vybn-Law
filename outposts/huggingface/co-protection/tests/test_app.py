import importlib
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
