import os
from dotenv import load_dotenv

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")

HF_MODEL = os.getenv(
    "HF_MODEL",
    "openai/gpt-oss-120b"
)

DATABASE_URL = os.getenv("DATABASE_URL")


if not HF_TOKEN:
    raise RuntimeError(
        "HF_TOKEN is missing from .env"
    )


if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is missing from .env"
    )