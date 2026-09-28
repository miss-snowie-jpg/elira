from integrations.fayda import FaydaService
from integrations.mesob import MesobService


class TinService:

    def __init__(self):
        self.fayda = FaydaService()
        self.mesob = MesobService()

    async def create_application(self, data: dict):

        # 1. Verify identity through Fayda
        identity = await self.fayda.verify_identity(
            data.get("identity", {})
        )

        if not identity["success"]:
            return {
                "success": False,
                "stage": "identity",
                "result": identity
            }

        # 2. Submit TIN application through MESOB
        application = await self.mesob.submit_tin_application(
            data
        )

        return {
            "success": application.get("success", False),
            "stage": "tin",
            "identity": identity,
            "application": application
        }

    async def get_status(self, application_id: str):

        return await self.mesob.get_tin_status(
            application_id
        )