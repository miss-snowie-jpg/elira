from pathlib import Path

from pypdf import PdfReader
from pathlib import Path
from pypdf import PdfReader


# ============================================================
# PDF TEXT EXTRACTION
# ============================================================

def extract_pdf_text(file_path: str) -> str:
    """
    Extract text from a digitally-generated PDF.

    This does NOT perform OCR.
    Scanned/image-only PDFs may return little or no text.
    """

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    reader = PdfReader(str(path))

    pages = []

    for page in reader.pages:
        text = page.extract_text()

        if text:
            pages.append(text.strip())

    return "\n\n".join(pages).strip()


# ============================================================
# PDF TEXT CHECK
# ============================================================

def pdf_has_text(file_path: str) -> bool:
    text = extract_pdf_text(file_path)
    return bool(text.strip())

# ============================================================
# PDF TEXT EXTRACTION
# ============================================================

def extract_pdf_text(file_path: str) -> str:
    """
    Extract text from a digitally-generated PDF.

    This does NOT perform OCR.
    Scanned/image-only PDFs will return little or no text.
    """

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            f"File not found: {file_path}"
        )

    reader = PdfReader(str(path))

    pages = []

    for page in reader.pages:

        text = page.extract_text()

        if text:
            pages.append(text)

    return "\n\n".join(pages).strip()


# ============================================================
# DETECT WHETHER PDF CONTAINS TEXT
# ============================================================

def pdf_has_text(file_path: str) -> bool:
    """
    Returns True when the PDF contains extractable text.
    """

    text = extract_pdf_text(file_path)

    return bool(text.strip())