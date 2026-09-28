import hashlib
import shutil
import uuid

from datetime import datetime
from pathlib import Path

from database import save_document


# ============================================================
# EVIDENCE STORAGE
# ============================================================

EVIDENCE_DIR = Path("storage/evidence")


def preserve_original(
    file_path: str,
    original_filename: str,
    user_id: str,
):
    """
    Preserve the original uploaded file.

    The original file is copied into a permanent
    user-specific evidence directory.
    """

    source = Path(file_path)

    if not source.exists():
        raise FileNotFoundError(
            "Original document does not exist."
        )

    user_directory = (
        EVIDENCE_DIR / user_id
    )

    user_directory.mkdir(
        parents=True,
        exist_ok=True
    )

    document_id = uuid.uuid4()

    safe_filename = (
        original_filename
        or "document"
    )

    destination = (
        user_directory
        / f"{document_id}_{safe_filename}"
    )

    shutil.copy2(
        source,
        destination
    )

    return (
        document_id,
        destination
    )


# ============================================================
# SHA-256
# ============================================================

def calculate_file_hash(
    file_path: str
):
    """
    Calculate SHA-256 hash of the preserved
    original file.
    """

    sha256 = hashlib.sha256()

    with open(
        file_path,
        "rb"
    ) as file:

        while True:

            chunk = file.read(
                1024 * 1024
            )

            if not chunk:
                break

            sha256.update(chunk)

    return sha256.hexdigest()


# ============================================================
# SAVE EVIDENCE RECORD
# ============================================================

def create_evidence_record(
    user_id: str,
    temporary_file_path: str,
    original_filename: str,
    content_type: str,
    file_size: int,
    source: str = "upload",
    sender: str | None = None,
    received_at: datetime | None = None,
    processing_method: str | None = None,
    extracted_text: str | None = None,
    analysis=None,
    business_related: bool = False,
    business_category: str | None = None,
    business_confidence: float | None = None,
    status: str = "processed",
):
    """
    Preserve the original file, calculate its hash,
    and create its PostgreSQL evidence record.
    """

    # --------------------------------------------------------
    # PRESERVE ORIGINAL
    # --------------------------------------------------------

    document_id, stored_path = preserve_original(
        temporary_file_path,
        original_filename,
        user_id
    )


    # --------------------------------------------------------
    # CALCULATE HASH
    # --------------------------------------------------------

    file_hash = calculate_file_hash(
        str(stored_path)
    )


    # --------------------------------------------------------
    # SAVE DATABASE RECORD
    # --------------------------------------------------------

    save_document(
        document_id=document_id,
        user_id=user_id,
        original_filename=original_filename,
        stored_file_path=str(stored_path),
        content_type=content_type,
        file_size=file_size,
        file_hash=file_hash,
        source=source,
        sender=sender,
        received_at=received_at,
        processing_method=processing_method,
        extracted_text=extracted_text,
        analysis=analysis,
        business_related=business_related,
        business_category=business_category,
        business_confidence=business_confidence,
        status=status,
    )


    return {
        "document_id": str(document_id),
        "stored_file_path": str(stored_path),
        "file_hash": file_hash,
        "original_filename": original_filename,
        "user_id": user_id,
        "business_related": business_related,
        "business_category": business_category,
        "business_confidence": business_confidence,
        "status": status,
    }

