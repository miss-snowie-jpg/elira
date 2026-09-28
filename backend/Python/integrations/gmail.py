import os
import httpx


EXPRESS_URL = os.getenv(
    "EXPRESS_BACKEND_URL",
    "http://localhost:5000"
)


async def send_email(
    user_id: str,
    to: str,
    subject: str,
    message: str,
):
    url = f"{EXPRESS_URL}/api/gmail/send"

    payload = {
        "userId": user_id,
        "to": to,
        "subject": subject,
        "message": message,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:

        response = await client.post(
            url,
            json=payload,
        )

    if response.status_code >= 400:
        raise RuntimeError(
            f"Gmail send failed: "
            f"{response.status_code} "
            f"{response.text}"
        )

    return response.json()