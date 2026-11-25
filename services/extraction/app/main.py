"""invoice-veil extraction service (P5).

Called only by the Express API, never by browsers.

  GET  /health            service and Tesseract status
  POST /extract/invoice   PDF or image -> invoice fields with confidence
  POST /check/invoice     confirmed fields (+ PO, receipt) -> discrepancies
  POST /extract/slip      bank slip (+ optional payment instruction) -> fields and match
"""
from __future__ import annotations

import json
import shutil

import pytesseract
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import ValidationError

from . import __version__
from .checks import check_invoice
from .invoice import parse_invoice
from .schemas import (
    CheckRequest, CheckResult, DocumentInfo, InvoiceExtraction, PaymentInstruction, SlipExtraction,
)
from .slip import match_slip, parse_slip
from .text import DocumentText, UnsupportedDocument, read_document

MAX_BYTES = 10 * 1024 * 1024

app = FastAPI(title="invoice-veil extraction", version=__version__)


def _tesseract_version() -> str:
    if shutil.which("tesseract") is None:
        return "not installed"
    return str(pytesseract.get_tesseract_version())


async def _read_upload(file: UploadFile) -> DocumentText:
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "File is larger than 10 MB.")
    if not data:
        raise HTTPException(400, "The file is empty.")
    try:
        doc = read_document(data)
    except UnsupportedDocument as exc:
        raise HTTPException(415, str(exc)) from exc
    if len(doc.text.strip()) < 10:
        raise HTTPException(422, "No readable text found. Upload a clearer scan or enter the fields manually.")
    return doc


def _info(doc: DocumentText) -> DocumentInfo:
    return DocumentInfo(source=doc.source, pages=doc.pages, ocr_confidence=doc.ocr_confidence)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__, "tesseract": _tesseract_version()}


@app.post("/extract/invoice", response_model=InvoiceExtraction)
async def extract_invoice(file: UploadFile = File(...)) -> InvoiceExtraction:
    doc = await _read_upload(file)
    fields, items, reasons = parse_invoice(doc)
    return InvoiceExtraction(
        extractor_version=__version__, document=_info(doc), fields=fields, line_items=items, review_reasons=reasons
    )


@app.post("/check/invoice", response_model=CheckResult)
def check(req: CheckRequest) -> CheckResult:
    return check_invoice(req)


@app.post("/extract/slip", response_model=SlipExtraction)
async def extract_slip(file: UploadFile = File(...), instruction: str | None = Form(None)) -> SlipExtraction:
    expected = None
    if instruction:
        try:
            expected = PaymentInstruction.model_validate(json.loads(instruction))
        except (json.JSONDecodeError, ValidationError) as exc:
            raise HTTPException(422, f"Invalid payment instruction: {exc}") from exc
    doc = await _read_upload(file)
    fields = parse_slip(doc)
    match = match_slip(fields, expected, doc.text) if expected else None
    return SlipExtraction(extractor_version=__version__, document=_info(doc), fields=fields, match=match)
