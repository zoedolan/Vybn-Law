"""Static court-guidance beta with a small machine-readable design route."""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"

app = FastAPI(
    title="Court Guidance Beta",
    description="A court-owned path from official source materials to dependable AI guidance.",
    version="0.2.0",
)
app.mount("/assets", StaticFiles(directory=STATIC), name="assets")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.2.0"}


@app.get("/court-guidance.json", response_class=JSONResponse)
def guidance_model() -> dict:
    return json.loads((ROOT / "court-guidance.json").read_text(encoding="utf-8"))


@app.get("/SOUL.md", response_class=PlainTextResponse)
def operating_brief() -> str:
    return (ROOT / "SOUL.md").read_text(encoding="utf-8")


@app.get("/returns.json", response_class=JSONResponse)
def returns_feed() -> dict:
    return json.loads((ROOT / "returns.json").read_text(encoding="utf-8"))


@app.get("/", response_class=FileResponse)
def index() -> FileResponse:
    return FileResponse(STATIC / "index.html")
