import os
import httpx


async def get_username(user_id: str) -> str | None:

    express_url = os.getenv(
        "EXPRESS_INTERNAL_URL",
        "http://localhost:5000"
    )

    url = (
        f"{express_url}/api/auth/internal/users/{user_id}"
    )

    print("========================================")
    print("ELIRA USER LOOKUP")
    print("USER ID:", user_id)
    print("URL:", url)
    print("========================================")

    try:

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url)

        print("EXPRESS STATUS:", response.status_code)
        print("EXPRESS RESPONSE:", response.text)

        if response.status_code != 200:
            raise RuntimeError(
                f"Failed to get username: "
                f"{response.status_code} "
                f"{response.text}"
            )

        data = response.json()

        username = data.get("username")

        if not username:
            raise RuntimeError(
                "Express returned no username."
            )

        return username

    except Exception as error:

        print("USERNAME FETCH ERROR:", error)

        raise