"""End-to-end tests through the HTTP API on the generated sample files."""
import json
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app

SAMPLES = Path(__file__).resolve().parent.parent / "samples"
client = TestClient(app)
needs_tesseract = pytest.mark.skipif(shutil.which("tesseract") is None, reason="Tesseract not installed")


def truth_files(kind: str):
    for path in sorted((SAMPLES / "truth").glob("*.json")):
        data = json.loads(path.read_text())
        if data.get("kind") == kind:
            for name in data["files"]:
                yield pytest.param(name, data, id=name)


def test_health():
    body = client.get("/health").json()
    assert body["status"] == "ok"


@needs_tesseract
@pytest.mark.parametrize("name,truth", list(truth_files("invoice")))
def test_invoice_samples(name, truth):
    with open(SAMPLES / name, "rb") as f:
        res = client.post("/extract/invoice", files={"file": (name, f)})
    assert res.status_code == 200, res.text
    fields = res.json()["fields"]
    for key, expected in truth["fields"].items():
        assert fields[key]["value"] == expected, f"{key}: {fields[key]}"


@needs_tesseract
@pytest.mark.parametrize("name,truth", list(truth_files("slip")))
def test_slip_samples(name, truth):
    with open(SAMPLES / name, "rb") as f:
        res = client.post("/extract/slip", files={"file": (name, f)},
                          data={"instruction": json.dumps(truth["instruction"])})
    assert res.status_code == 200, res.text
    body = res.json()
    expected = truth["fields"]
    for key in ("amount_minor", "currency", "transfer_date"):
        assert body["fields"][key]["value"] == expected[key], key
    assert body["match"]["status"] == expected["status"]
    assert sorted(r["code"] for r in body["match"]["reasons"]) == sorted(expected["codes"])


def test_rejects_unsupported_file():
    res = client.post("/extract/invoice", files={"file": ("notes.txt", b"hello world, not a document")})
    assert res.status_code == 415


def test_rejects_bad_instruction():
    res = client.post("/extract/slip", files={"file": ("x.png", b"x")}, data={"instruction": "{not json"})
    assert res.status_code == 422
