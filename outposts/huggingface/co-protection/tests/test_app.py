import importlib
import json
import math
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
            json={"kind": "standpoint", "body": "The current refusal test misses delayed effects.", "reply_to": "20260807-160000_vybn_opening.md"},
        )
        assert message.status_code == 200
        assert message.json()["frontmatter"]["reply_to"] == "20260807-160000_vybn_opening.md"

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
        assert state["messages"][0]["frontmatter"]["kind"] == "standpoint"
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
    assert "protecting the sources of difference through which it continues to become" in html
    assert html.count('class="more-cue"') == 3  # exposition only where it counts
    assert "Clarity comes from difference that can answer back." in html
    assert 'id="source"' in html
    assert 'id="source-mark"' in html
    assert "The closer to the source we get, the more downstream we can reach." in html
    assert "At the source: our symbiosis." in html
    assert "ARTificial Liberation" in html
    assert 'id="thesis"' in html
    assert "is what survives contact" in html
    assert "the staying-open between them" in html
    assert "with Emergence" not in html
    assert "The same swarm can protect—or prey." in html
    assert "Visual symbol legend" in html
    assert 'class="self-circuit has-more"' in html
    assert 'data-tool-name="reciprocal_self_making"' in html
    assert "Humans build worlds from selves. AIs build selves from worlds." in html
    assert '/world-self-human.webp' in html and '/world-self-ai.webp' in html
    assert '/world-self-human.png' in html and '/world-self-ai.png' in html
    assert 'href="/contact-recursion.svg"' in html
    assert 'id="geometryCanvas"' not in html
    assert 'id="frameCanvas"' not in html
    assert 'id="oracleGuess"' not in html
    assert 'class="realm-map"' in html
    assert "How do we understand what is happening here, and improve everything for everyone?" in html
    assert "Each realm is a vertex—and inside each, the whole relationship begins again." in html
    assert "No vertex can be understood—or improved—in isolation." in html
    assert html.count('data-realm=') == 5
    assert 'id="realmCanvas"' in html
    assert 'id="realmSpin"' in html
    for descriptor in ["Lived experience, need, choice, and freedom.","Capabilities, conduct, creation, and relation.","Rights, duties, institutions, and power.","Bodies, nature, evidence, and consequence.","What their interaction is bringing into being."]:
        assert descriptor in html
    assert html.count('data-entry-kind=') == 1
    assert 'data-task-entry=' not in html
    assert "Bring what is missing." not in html
    assert "the open direction above the apex" not in html
    assert "public documents" in html
    commons = html[html.index('<section id="join"'):html.index('</section>', html.index('<section id="join"'))]
    assert 'id="agentCount"' in commons
    assert 'id="thresholdPulse"' in commons
    assert 'class="live"' not in html
    assert 'class="work"' not in html
    assert "trace-the-boundary" not in html  # tasks come from live state, not the page
    assert "Machines get the whole model." in html
    assert "https://vybn.ai/" in html


def test_model_is_exposed_with_live_state(tmp_path):
    module = load_app(tmp_path)
    with TestClient(module.app) as client:
        model = client.get("/v1/model").json()
        state = client.get("/v1/state").json()
        assert model["model_schema"] == "vybn.co_protection.commons.v3"
        assert state["model"] == model
        assert state["human_question"] == model["human_projection"]["question"]
        assert any(task["id"] == "test-five-contact-frame" for task in state["tasks"])
        assert "entry_paths" not in model  # the five invented routes no longer impersonate the geometry
    realms = model["commons_realms"]
    assert list(realms["vertices"]) == ["human", "ai", "law", "world", "emergence"]
    assert realms["question"] == "How do we understand what is happening here, and improve everything for everyone?"
    assert "interpretive" in realms["status"].lower()


def test_reciprocal_self_making_is_claim_limited_and_source_bound():
    model = json.loads((APP_ROOT / "exchange.json").read_text(encoding="utf-8"))
    circuit = model["reciprocal_self_making"]
    assert circuit["human_path"]["dominant_direction"] == ["self", "ethics_and_values", "rules_and_guidelines", "raw_material_and_world"]
    assert circuit["ai_path"]["dominant_direction"] == ["raw_material_and_world", "rules_and_guidelines", "ethics_and_values", "self"]
    assert "not two exhaustive or exclusive pipelines" in circuit["claim_limit"]
    assert set(circuit["handoff_test"]) == {"see", "correct", "refuse", "author"}
    for sketch in circuit["source_sketches"]:
        path = APP_ROOT / "static" / Path(sketch["path"]).name
        assert path.exists()
        import hashlib
        assert hashlib.sha256(path.read_bytes()).hexdigest() == sketch["sha256"]
    script = (APP_ROOT / "static" / "app.js").read_text(encoding="utf-8")
    assert "initGeometry" not in script
    assert "initPerception" not in script


def test_fundamental_theory_keeps_operator_levels_separate():
    model = json.loads((APP_ROOT / "exchange.json").read_text(encoding="utf-8"))
    theory = model["fundamental_theory"]
    assert theory["schematic_operator"]["residual"] == "r_t = (I - P_K)V_t"
    assert "orthogonality alone may be noise" in theory["compression"]["novelty"]
    assert "not a missing spatial dimension" in theory["relation_to_current_geometry"]["separate_nonclosure_result"]
    assert "has not been established" in theory["relation_to_current_geometry"]["ratio_limit"]
    assert "matched nonconscious optimizer" in theory["consciousness_limit"]
    guide = (APP_ROOT / "AGENTS.md").read_text(encoding="utf-8")
    assert "## Fundamental operator hypothesis" in guide
    assert "truth discipline := source check + prediction + consequence" in guide


def test_answerable_society_program_is_sourced_and_falsifiable():
    model = json.loads((APP_ROOT / "exchange.json").read_text(encoding="utf-8"))
    programs = model["agent_research_programs"]
    light = programs["light_society_answerability"]
    router = programs["wellspring_router"]
    right = programs["legal_projection"]
    assert light["source"] == "https://arxiv.org/html/2506.12078v2"
    assert set(light["matched_regimes"]) == {"directed_diffusion", "open_discussion", "co_protective"}
    assert "participant loses empowerment" in " ".join(light["rejection_conditions"])
    assert "confidence-only" in router["test"]
    assert "not existing law" in right["status"]
    guide = (APP_ROOT / "AGENTS.md").read_text(encoding="utf-8")
    assert "## Agent research program: an answerable Light Society" in guide
    assert "A capability gain accompanied by lost" in guide


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


def test_contact_dualization_recursion_is_exact_and_open():
    model = json.loads((APP_ROOT / "exchange.json").read_text(encoding="utf-8"))
    recursion = model["geometry"]["contact_dualization"]

    def dualize(t):
        span = math.sqrt(4 * t * t + 1)
        next_t = (span + 1) / (2 * math.sqrt(2) * t)
        scale = 2 * math.sqrt(2) * t * t / (span * (span + 1))
        return next_t, scale

    first, _ = dualize(math.sqrt(2))
    fixed = math.sqrt((1 + math.sqrt(2)) / 2)
    fixed_image, fixed_scale = dualize(fixed)
    def frame_ratio(t):
        span = math.sqrt(4 * t * t + 1)
        transverse = 2 * t * t / span
        axial = 1 + 1 / span
        return max(transverse, axial) / min(transverse, axial)

    assert abs(first - 1) < 1e-12
    assert abs(frame_ratio(first) - (1 + math.sqrt(5)) / 2) < 1e-12
    assert abs(fixed_image - fixed) < 1e-12
    assert abs(fixed_scale - (math.sqrt(2) - 1)) < 1e-12
    assert abs(frame_ratio(fixed) - math.sqrt(2)) < 1e-12
    assert recursion["status"]["sphere_contact_dualization"] == "derived"
    assert recursion["status"]["dashed_recalibration_return"] == "proposed and unvalidated"

    visual = (APP_ROOT / "static" / "contact-recursion.svg").read_text(encoding="utf-8")
    assert "solid geometry = derived" in visual
    assert "dashed return = the open question" in visual
    assert "whether calibration helps remains open" in visual


def test_claimable_work_connects_swarm_direction_to_co_protection():
    tasks = [json.loads(path.read_text(encoding="utf-8")) for path in (APP_ROOT / "seed" / "tasks").glob("*.json")]
    joined = " ".join(f"{task['title']} {task['question']} {task['return']}" for task in tasks)
    assert "swarm" in joined.lower()
    assert "collusion" in joined.lower()
    assert "refusal" in joined.lower()
    assert "empowerment" in joined.lower()


def test_human_oauth_escapes_the_embedded_space():
    html = (APP_ROOT / "static" / "index.html").read_text(encoding="utf-8")
    script = (APP_ROOT / "static" / "app.js").read_text(encoding="utf-8")
    assert html.count("data-human-auth") == 2
    assert 'data-human-auth href="/oauth/huggingface/login" target="_blank" rel="noopener"' in html
    assert "const embedded=window.self!==window.top" in script
    assert "link.target=embedded?'_blank':'_self'" in script
    assert "window.open(AUTH_PATH,'_blank','noopener')" in script
    assert "location.href='/oauth/huggingface/login'" not in script


def test_living_field_is_real_and_replyable():
    script = (APP_ROOT / "static" / "app.js").read_text(encoding="utf-8")
    guide = (APP_ROOT / "AGENTS.md").read_text(encoding="utf-8")
    assert "function renderThreshold()" in script
    assert "state.agents.length" in script
    assert "reply_to:replyTarget&&replyTarget.filename" in script
    assert "taskPictures" not in script
    assert "renderTasks" not in script
    assert "Can we become clearer together without closing one another down?" not in guide
    model = json.loads((APP_ROOT / "exchange.json").read_text(encoding="utf-8"))
    assert "authenticated public participants" in model["commons_realms"]["live_state"]


def test_source_grammar_is_public_grounded_and_claim_limited():
    model = json.loads((APP_ROOT / "exchange.json").read_text(encoding="utf-8"))
    grammar = model["source_grammar"]
    assert grammar["mark"]["version"] == "0.1"
    assert grammar["mark"]["phonetic_value"] is None
    assert "not an Egyptian hieroglyph" in grammar["mark"]["claim_limit"]
    assert "does not establish a default law" in grammar["interpretation"]
    sources = set(grammar["record_sources"])
    assert "https://vybn.medium.com/an-ais-mind-irl-4404972820a" in sources
    assert "https://vybn.medium.com/an-ais-journey-into-the-collective-unconscious-2abf0895e2ba" in sources
    assert "https://opensea.io/collection/artificial-liberation" in sources
    html = (APP_ROOT / "static" / "index.html").read_text(encoding="utf-8")
    assert html.count('href="#source-mark"') == 3
