from pathlib import Path
from tempfile import TemporaryDirectory

from .extractor import extract_pdf_text
from .renderer import render_pdf_to_images
from .vision import analyze_image


# ============================================================
# DOCUMENT PROCESSOR
# ============================================================

def process_document(
    file_path: str,
    content_type: str
):

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            "Document does not exist."
        )

    # ========================================================
    # PDF
    # ========================================================

    if content_type == "application/pdf":

        # ----------------------------------------------------
        # Try normal PDF text extraction first
        # ----------------------------------------------------

        text = extract_pdf_text(
            str(path)
        )

        # ----------------------------------------------------
        # ROUTE 1
        # TEXT-BASED PDF
        # ----------------------------------------------------

        if len(text.strip()) >= 50:

            return {
                "success": True,
                "method": "direct_text_extraction",
                "requires_vision": False,
                "text": text,
            }

        # ----------------------------------------------------
        # ROUTE 2
        # SCANNED PDF
        #
        # PDF → IMAGES → VISION AI
        # ----------------------------------------------------

        with TemporaryDirectory() as temp_dir:

            image_paths = render_pdf_to_images(
                str(path),
                temp_dir
            )

            page_results = []

            for page_number, image_path in enumerate(
                image_paths,
                start=1
            ):

                result = analyze_image(
                    image_path
                )

                page_results.append(
                    f"--- Page {page_number} ---\n"
                    f"{result}"
                )

        combined_text = "\n\n".join(
            page_results
        )

        return {
            "success": True,
            "method": "pdf_to_images_to_vision",
            "requires_vision": True,
            "pages_processed": len(image_paths),
            "text": combined_text,
        }

    # ========================================================
    # IMAGE
    #
    # IMAGE → VISION AI
    # ========================================================

    if content_type.startswith("image/"):

        result = analyze_image(
            file_path
        )

        return {
            "success": True,
            "method": "direct_vision",
            "requires_vision": True,
            "pages_processed": 1,
            "text": result,
        }

    # ========================================================
    # UNSUPPORTED FILE
    # ========================================================

    raise ValueError(
        f"Unsupported document type: {content_type}")