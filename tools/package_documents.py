#!/usr/bin/env python3
"""Package the dated HMBR publication PDFs and refresh their checksums."""

from __future__ import annotations

import hashlib
from pathlib import Path

from pypdf import PdfReader, PdfWriter


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
DATE = "20260916"
BOOKS = [
    ("제1본 · 선언본", DOCS / f"HMBR_Book1_Seoneonbon_{DATE}.pdf"),
    ("제2본 · 해례본", DOCS / f"HMBR_Book2_Haeryebon_{DATE}.pdf"),
    ("제3본 · 전산본", DOCS / f"HMBR_Book3_Jeonsanbon_{DATE}.pdf"),
    ("제4본 · 구현본", DOCS / f"HMBR_Book4_Guhyeonbon_{DATE}.pdf"),
]
COMBINED = DOCS / f"HMBR_Books1-4_Combined_{DATE}.pdf"


def package() -> None:
    writer = PdfWriter()
    first_pages: list[tuple[str, int]] = []
    for title, path in BOOKS:
        reader = PdfReader(path)
        first_pages.append((title, len(writer.pages)))
        for page in reader.pages:
            writer.add_page(page)

    for title, page_number in first_pages:
        writer.add_outline_item(title, page_number)

    writer.add_metadata(
        {
            "/Title": "훈민바름 영어확장판 제1–4본 교정 합본",
            "/Author": "박일환",
            "/Subject": "2026-09-16 교정 출판본",
            "/Keywords": "훈민바름, 영어확장판, 선언본, 해례본, 전산본, 구현본",
        }
    )
    with COMBINED.open("wb") as output:
        writer.write(output)


def write_checksums() -> None:
    candidates = sorted(
        path
        for path in ROOT.rglob("*")
        if path.is_file()
        and ".git" not in path.parts
        and "tmp" not in path.parts
        and "dist" not in path.parts
        and "__pycache__" not in path.parts
        and path.suffix != ".pyc"
        and path.name != "SHA256SUMS.txt"
    )
    lines = []
    for path in candidates:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        lines.append(f"{digest}  {path.relative_to(ROOT).as_posix()}")
    (ROOT / "SHA256SUMS.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    package()
    write_checksums()
