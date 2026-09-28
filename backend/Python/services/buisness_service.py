import uuid
from datetime import datetime, timezone


class BusinessService:

    async def create_application(self, data: dict):

        application_id = str(uuid.uuid4())

        application = {
            "application_id": application_id,

            "status": "pending_identity_verification",

            "business": {
                "name": data["business_name"],
                "type": data["business_type"],
                "category": data["business_category"],
            },

            "owner": {
                "name": data["owner_full_name"],
                "phone": data["phone"],
                "email": data.get("email"),
                "address": data["address"],
            },

            "identity": {
                "fayda_verified": data.get(
                    "fayda_verified",
                    False
                ),
                "fayda_vid": data.get(
                    "fayda_vid"
                ),
            },

            "created_at": datetime.now(
                timezone.utc
            ).isoformat(),
        }

        return {
            "success": True,
            "application": application
        }