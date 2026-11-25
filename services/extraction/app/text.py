"""Turn an uploaded PDF or image into text.

Digital PDFs use their text layer. Scanned PDFs and images go through
Tesseract OCR, and the mean word confidence is reported so low-quality scans
can be flagged for review.
"""
from __future__ import annotations

import io
from dataclasses import dataclass
from typing import Literal

import numpy as np
import pdfplumber
import pytesseract
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_PAGES = 5
MIN_TEXT_CHARS = 30  # a PDF page with less text than this is treated as a scan


class UnsupportedDocument(Exception):
    """The file is not a PDF or an image we can read."""


@dataclass
class DocumentText:
    text: str
    source: Literal["pdf_text", "ocr", "mixed"]
    pages: int
    ocr_confidence: float | None  # mean Tesseract word confidence, 0-100


def _normalize(text: str) -> str:
    return (
        text.replace(" ", " ")
        .replace("–", "-")
        .replace("—", "-")
        .replace("’", "'")
    )


def _skew_angle(image: Image.Image, max_angle: float = 6.0, step: float = 0.5) -> float:
    """Estimate how far a scan is tilted, using the projection-profile method:
    text lines are sharpest (row sums vary most) when the page is straight."""
    small = image.copy()
    small.thumbnail((800, 800))
    ink = ImageOps.invert(small).point(lambda v: 255 if v > 100 else 0)
    best_angle, best_score = 0.0, -1.0
    angle = -max_angle
    while angle <= max_angle + 1e-9:
        rows = np.asarray(ink.rotate(angle, fillcolor=0), dtype=np.float32).sum(axis=1)
        score = float(np.var(np.diff(rows)))
        if score > best_score:
            best_angle, best_score = angle, score
        angle += step
    return best_angle


def _prepare(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image).convert("L")
    if image.width < 1600:  # small images OCR badly; upscale
        scale = 1600 / image.width
        image = image.resize((1600, int(image.height * scale)), Image.Resampling.LANCZOS)
    image = ImageOps.autocontrast(image)
    angle = _skew_angle(image)
    if abs(angle) >= 0.5:  # straighten tilted phone photos and scans
        image = image.rotate(angle, expand=True, fillcolor=255, resample=Image.Resampling.BICUBIC)
    return image


def ocr_image(image: Image.Image) -> tuple[str, float | None]:
    """OCR one image. Returns text with original line breaks and mean confidence."""
    data = pytesseract.image_to_data(
        _prepare(image), config="--psm 4", output_type=pytesseract.Output.DICT
    )
    lines: dict[tuple[int, int, int], list[str]] = {}
    confidences: list[float] = []
    for i, word in enumerate(data["text"]):
        if not word.strip():
            continue
        key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
        lines.setdefault(key, []).append(word)
        conf = float(data["conf"][i])
        if conf >= 0:
            confidences.append(conf)
    text = "\n".join(" ".join(words) for _, words in sorted(lines.items()))
    mean = round(sum(confidences) / len(confidences), 1) if confidences else None
    return text, mean


def read_document(data: bytes) -> DocumentText:
    if data[:5] == b"%PDF-":
        return _read_pdf(data)
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise UnsupportedDocument("Upload a PDF, PNG or JPEG file.") from exc
    text, conf = ocr_image(image)
    return DocumentText(_normalize(text), "ocr", 1, conf)


def _read_pdf(data: bytes) -> DocumentText:
    texts: list[str] = []
    confidences: list[float] = []
    used_text_layer = used_ocr = False
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        pages = pdf.pages[:MAX_PAGES]
        for page in pages:
            page_text = page.extract_text() or ""
            if len(page_text.strip()) >= MIN_TEXT_CHARS:
                texts.append(page_text)
                used_text_layer = True
            else:
                text, conf = ocr_image(page.to_image(resolution=300).original)
                texts.append(text)
                used_ocr = True
                if conf is not None:
                    confidences.append(conf)
        page_count = len(pages)
    source = "mixed" if used_text_layer and used_ocr else ("ocr" if used_ocr else "pdf_text")
    conf = round(sum(confidences) / len(confidences), 1) if confidences else None
    return DocumentText(_normalize("\n".join(texts)), source, page_count, conf)
