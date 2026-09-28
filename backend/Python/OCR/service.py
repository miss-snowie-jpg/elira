from pathlib import Path

from .extractor import (
    extract_pdf_text,
    pdf_has_text,
)


# ============================================================
# DOCUMENT PROCESSOR
# ============================================================

def process_document(file_path: str, content_type: str):

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            "Document does not exist."
        )

    # --------------------------------------------------------
    # PDF
    # --------------------------------------------------------

    if content_type == "application/pdf":

        text = extract_pdf_text(
            str(path)
        )

        if text:

            return {
                "success": True,
                "method": "direct_text_extraction",
                "requires_vision": False,
                "text": text,
            }

        # No usable text means this is probably
        # a scanned/image-based PDF.

        return {
            "success": True,
            "method": "vision_required",
            "requires_vision": True,
            "text": "",
        }

    # --------------------------------------------------------
    # IMAGES
    # --------------------------------------------------------

    if content_type.startswith("image/"):

        return {
            "success": True,
            "method": "vision_required",
            "requires_vision": True,
            "text": "",
        }

    # --------------------------------------------------------
    # UNSUPPORTED
    # --------------------------------------------------------

    raise ValueError(
        f"Unsupported document type: {content_type}"
    )