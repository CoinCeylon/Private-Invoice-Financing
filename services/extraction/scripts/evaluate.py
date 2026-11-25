"""Measure extraction accuracy on the frozen sample set.

    python scripts/evaluate.py            # prints a table
    python scripts/evaluate.py --json     # also writes metrics.json

Each truth file in samples/truth/ lists the expected values. A field counts as
correct only when it matches exactly. Report these numbers in the README and
the pitch; never quote accuracy without saying it is on fictional samples.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app import __version__  # noqa: E402
from app.invoice import parse_invoice  # noqa: E402
from app.schemas import PaymentInstruction  # noqa: E402
from app.slip import match_slip, parse_slip  # noqa: E402
from app.text import read_document  # noqa: E402

SAMPLES = ROOT / "samples"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="write metrics.json")
    args = parser.parse_args()

    per_field: dict[str, list[bool]] = defaultdict(list)
    slip_status: list[bool] = []
    rows = []
    for truth_path in sorted((SAMPLES / "truth").glob("*.json")):
        truth = json.loads(truth_path.read_text())
        if truth.get("kind") not in ("invoice", "slip"):
            continue
        for name in truth["files"]:
            start = time.perf_counter()
            doc = read_document((SAMPLES / name).read_bytes())
            if truth["kind"] == "invoice":
                fields, _, _ = parse_invoice(doc)
                expected = truth["fields"]
            else:
                fields = parse_slip(doc)
                expected = {k: v for k, v in truth["fields"].items() if k not in ("status", "codes")}
                match = match_slip(fields, PaymentInstruction(**truth["instruction"]), doc.text)
                slip_status.append(match.status == truth["fields"]["status"])
            seconds = time.perf_counter() - start
            wrong = []
            for key, value in expected.items():
                ok = fields[key].value == value
                per_field[f"{truth['kind']}.{key}"].append(ok)
                if not ok:
                    wrong.append(f"{key}={fields[key].value!r} (expected {value!r})")
            rows.append((name, doc.source, doc.ocr_confidence, seconds, wrong))

    print(f"Extractor {__version__}\n")
    print(f"{'file':32} {'source':9} {'ocr':>5} {'secs':>5}  errors")
    for name, source, conf, secs, wrong in rows:
        print(f"{name:32} {source:9} {conf if conf is not None else '-':>5} {secs:5.2f}  {'; '.join(wrong) or 'none'}")

    print(f"\n{'field':28} accuracy")
    total_ok = total = 0
    metrics = {}
    for key in sorted(per_field):
        results = per_field[key]
        total_ok += sum(results)
        total += len(results)
        metrics[key] = round(sum(results) / len(results), 3)
        print(f"{key:28} {sum(results)}/{len(results)}")
    overall = round(total_ok / total, 3) if total else 0
    status_acc = round(sum(slip_status) / len(slip_status), 3) if slip_status else None
    print(f"\nOverall field accuracy: {total_ok}/{total} ({overall:.1%})")
    if status_acc is not None:
        print(f"Slip match decision correct: {sum(slip_status)}/{len(slip_status)}")

    if args.json:
        out = {"extractor_version": __version__, "documents": len(rows), "overall_field_accuracy": overall,
               "slip_status_accuracy": status_acc, "fields": metrics,
               "note": "Measured on fictional team-made samples, not real invoices."}
        (ROOT / "metrics.json").write_text(json.dumps(out, indent=2) + "\n")
        print("Wrote metrics.json")


if __name__ == "__main__":
    main()
