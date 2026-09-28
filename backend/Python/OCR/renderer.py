from pathlib import Path
import fitz


# ============================================================
# PDF → IMAGES
# ============================================================

def render_pdf_to_images(
    file_path: str,
    output_dir: str,
    dpi: int = 150
) -> list[str]:

    pdf_path = Path(file_path)
    output_path = Path(output_dir)

    if not pdf_path.exists():
        raise FileNotFoundError(
            f"PDF not found: {file_path}"
        )

    output_path.mkdir(
        parents=True,
        exist_ok=True
    )

    document = fitz.open(str(pdf_path))

    image_paths = []

    scale = dpi / 72
    matrix = fitz.Matrix(scale, scale)

    for page_number, page in enumerate(document):

        pixmap = page.get_pixmap(
            matrix=matrix,
            alpha=False
        )

        image_path = (
            output_path /
            f"page_{page_number + 1}.png"
        )

        pixmap.save(str(image_path))

        image_paths.append(
            str(image_path)
        )

    document.close()

    return image_paths