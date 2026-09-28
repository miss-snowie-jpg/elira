import os
import httpx


class MesobService:
    def __init__(self):
        self.base_url = os.getenv("MESOB_API_URL")
        self.client_id = os.getenv("MESOB_CLIENT_ID")
        self.client_secret = os.getenv("MESOB_CLIENT_SECRET")

    @property
    def configured(self):
        return bool(
            self.base_url
            and self.client_id
            and self.client_secret
        )

    async def submit_tin_application(self, data: dict):

        if not self.configured:
            return {
                "success": False,
                "status": "API_NOT_CONFIGURED",
                "message": "MESOB API is not connected yet."
            }

        # Official MESOB endpoint goes here.

        return {
            "success": False,
            "status": "NOT_IMPLEMENTED",
            "message": "MESOB integration is ready for API configuration."
        }

    async def get_tin_status(self, application_id: str):

        if not self.configured:
            return {
                "success": False,
                "status": "API_NOT_CONFIGURED"
            }

        # Official MESOB status endpoint goes here.

        return {
            "success": False,
            "status": "NOT_IMPLEMENTED"
        }