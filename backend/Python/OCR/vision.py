import os
import base64

from dotenv import load_dotenv
from huggingface_hub import InferenceClient


load_dotenv()


# ============================================================
# CONFIGURATION
# ============================================================

HF_TOKEN = os.getenv("HF_TOKEN")

VISION_MODEL = os.getenv(
    "VISION_MODEL",
    "Qwen/Qwen3-VL-30B-A3B-Instruct"
)

if not HF_TOKEN:
    raise RuntimeError(
        "HF_TOKEN is missing from .env"
    )


# ============================================================
# HUGGING FACE VISION CLIENT
# ============================================================

client = InferenceClient(
    provider="novita",
    api_key=HF_TOKEN
)


# ============================================================
# IMAGE → BASE64 DATA URL
# ============================================================

def image_to_data_url(
    image_path: str
) -> str:

    if not os.path.exists(image_path):
        raise FileNotFoundError(
            f"Image not found: {image_path}"
        )

    extension = os.path.splitext(
        image_path
    )[1].lower()

    mime_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp"
    }

    mime_type = mime_types.get(
        extension,
        "image/png"
    )

    with open(image_path, "rb") as image:

        encoded = base64.b64encode(
            image.read()
        ).decode("utf-8")

    return (
        f"data:{mime_type};base64,"
        f"{encoded}"
    )


# ============================================================
# VISION AI / DOCUMENT OCR
# ============================================================

def analyze_image(
    image_path: str,
    instruction: str | None = None
) -> str:

    image_url = image_to_data_url(
        image_path
    )

    prompt = instruction or """
You are ELIRA's Vision AI document processing system.

Read this document carefully.

Extract all visible text accurately.

Preserve the document structure where possible.

Identify and preserve:

- headings
- paragraphs
- names
- dates
- addresses
- phone numbers
- email addresses
- identification numbers
- amounts
- currencies
- tables
- labels
- form fields
- signatures or signature fields
- important document information

For tables, preserve the relationship between
rows and columns as clearly as possible.

Do NOT invent, guess, or hallucinate information.

If something is unclear or cannot be read,
write:

[UNREADABLE]

Return the document content as clean,
structured text.

Do NOT summarize the document.
Do NOT analyze it yet.

Your job at this stage is accurate visual
document extraction.
"""

    response = client.chat.completions.create(

        model=VISION_MODEL,

        messages=[
            {
                "role": "user",

                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url
                        }
                    }
                ]
            }
        ],

        max_tokens=4096
    )

    return response.choices[0].message.content

