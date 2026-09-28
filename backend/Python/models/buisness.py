from typing import Optional

from pydantic import BaseModel, Field


class BusinessApplication(BaseModel):
    user_id: str

    business_name: str = Field(
        ...,
        min_length=2
    )

    business_type: str

    business_category: str

    owner_full_name: str

    phone: str

    email: Optional[str] = None

    address: str

    fayda_verified: bool = False

    fayda_vid: Optional[str] = None