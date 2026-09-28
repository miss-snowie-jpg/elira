import uuid
import os
import tempfile
import hashlib

from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from OCR.processor import process_document

from database import (
    init_database,
    create_chat,
    get_chat,
    get_user_chats,
    add_message,
    get_history,
    search_user_chats,
    save_memory,
    get_memories,
    delete_memory,
    save_document,
    update_document,
    get_user_documents,
    search_user_documents,
    get_recent_user_documents,
    get_documents_by_ids,
    get_business_documents,
    get_document,
)

from ai import (
    generate_response,
    extract_memories,
    detect_email_request,
    generate_email,
    analyze_document,
)
from ai import extract_memories

from action_state import (
    get_action_state,
    set_action_state,
    clear_action_state,
)

from config import (
    get_gmail_status,
    get_gmail_messages,
    get_gmail_message,
    send_gmail_message,
)

from Taxation import TinService
from buisness import BusinessService

from analytics import (
    init_analytics_database,
    create_or_update_business_profile,
    get_business_profile,
    add_analytics_transaction,
    calculate_analytics,
)


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="ELIRA AI",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# SERVICES
# ============================================================

tin_service = TinService()
business_service = BusinessService()


# ============================================================
# UPLOAD DIRECTORY
# ============================================================

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
def startup():
    try:
        init_database()
        init_analytics_database()

        print("========================================")
        print("ELIRA DATABASE INITIALIZED")
        print("ELIRA ANALYTICS DATABASE INITIALIZED")
        print("========================================")

    except Exception as error:
        print("DATABASE INITIALIZATION ERROR:", error)


# ============================================================
# REQUEST MODELS
# ============================================================

class CreateChatRequest(BaseModel):
    user_id: str
    title: str | None = None


class ChatMessageRequest(BaseModel):
    user_id: str
    message: str
    chat_id: str | None = None


class TinApplicationRequest(BaseModel):
    user_id: str
    business_name: str
    business_type: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None


class PermissionResponseRequest(BaseModel):
    user_id: str
    approved: bool


class DocumentAnalysisRequest(BaseModel):
    user_id: str
    document_id: str


# ============================================================
# ANALYTICS REQUEST MODELS
# ============================================================

class AnalyticsProfileRequest(BaseModel):
    user_id: str
    business_name: str | None = None
    industry: str | None = None
    currency: str = "ETB"

    starting_revenue: float = 0
    starting_expenses: float = 0
    starting_customers: int = 0
    starting_employees: int = 0


class AnalyticsTransactionRequest(BaseModel):
    user_id: str
    transaction_type: str
    amount: float = 0

    description: str | None = None
    category: str | None = None

    customer_count: int = 0
    employee_count: int = 0

    transaction_date: datetime | None = None


# ============================================================
# HEALTH
# ============================================================

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "ELIRA AI",
        "version": "1.0.0",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "ELIRA AI",
    }


# ============================================================
# CHAT
# ============================================================

@app.post("/api/chat/create")
def create_new_chat(request: CreateChatRequest):

    chat_id = create_chat(
        user_id=request.user_id,
        title=request.title,
    )

    return {
        "success": True,
        "chat_id": str(chat_id),
    }


@app.get("/api/chat/{user_id}")
def get_chats(user_id: str):

    chats = get_user_chats(user_id)

    return {
        "success": True,
        "chats": chats,
    }


@app.get("/api/chat/{user_id}/{chat_id}")
def get_chat_details(
    user_id: str,
    chat_id: str,
):

    chat = get_chat(
        chat_id=chat_id,
        user_id=user_id,
    )

    if not chat:
        raise HTTPException(
            status_code=404,
            detail="Chat not found.",
        )

    history = get_history(chat_id)

    return {
        "success": True,
        "chat": chat,
        "messages": history,
    }


@app.post("/api/chat/message")
def send_chat_message(
    request: ChatMessageRequest,
):

    user_id = request.user_id
    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty.",
        )

    chat_id = request.chat_id

    # Create a new chat if necessary
    if not chat_id:

        chat_id = create_chat(
            user_id=user_id,
            title=message[:60],
        )

    # Save user message
    add_message(
        chat_id=chat_id,
        role="user",
        content=message,
    )

    # Get conversation history
    history = get_history(chat_id)

    # Get memories
    memories = get_memories(user_id)

    # AI response
    response = chat_with_ai(
        message=message,
        history=history,
        memories=memories,
    )

    if isinstance(response, dict):

        assistant_message = response.get(
            "response",
            response.get(
                "message",
                "",
            ),
        )

    else:

        assistant_message = str(response)

    # Save AI response
    add_message(
        chat_id=chat_id,
        role="assistant",
        content=assistant_message,
    )

    # Extract memories
    try:

        new_memories = extract_memories(
            message,
            user_id,
        )

        if new_memories:

            for memory in new_memories:

                if isinstance(memory, dict):

                    key = memory.get("memory_key")
                    value = memory.get("memory_value")

                    if key and value:

                        save_memory(
                            user_id=user_id,
                            memory_key=key,
                            memory_value=value,
                        )

    except Exception as memory_error:

        print(
            "MEMORY EXTRACTION ERROR:",
            memory_error,
        )

    return {
        "success": True,
        "chat_id": str(chat_id),
        "message": assistant_message,
    }


# ============================================================
# CHAT SEARCH
# ============================================================

@app.get("/api/chat/search/{user_id}")
def search_chats(
    user_id: str,
    q: str,
):

    results = search_user_chats(
        user_id=user_id,
        query=q,
    )

    return {
        "success": True,
        "results": results,
    }


# ============================================================
# MEMORY
# ============================================================

@app.get("/api/memory/{user_id}")
def get_user_memories(user_id: str):

    memories = get_memories(user_id)

    return {
        "success": True,
        "memories": memories,
    }


@app.delete("/api/memory/{user_id}/{memory_id}")
def remove_memory(
    user_id: str,
    memory_id: int,
):

    result = delete_memory(
        user_id=user_id,
        memory_id=memory_id,
    )

    return {
        "success": result,
    }


# ============================================================
# DOCUMENTS / OCR
# ============================================================

@app.post("/api/documents/process-and-analyze")
async def process_and_analyze_document(
    user_id: str,
    file: UploadFile = File(...),
):

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="File name is required.",
        )

    allowed_types = {
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
    }

    if file.content_type not in allowed_types:

        raise HTTPException(
            status_code=400,
            detail="Unsupported file type.",
        )

    file_bytes = await file.read()

    if not file_bytes:

        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    file_hash = hashlib.sha256(
        file_bytes
    ).hexdigest()

    extension = Path(
        file.filename
    ).suffix.lower()

    stored_name = (
        f"{uuid.uuid4()}{extension}"
    )

    stored_path = (
        UPLOAD_DIR / stored_name
    )

    with open(
        stored_path,
        "wb",
    ) as output_file:

        output_file.write(
            file_bytes
        )

    try:

        result = process_document(
            str(stored_path)
        )

        extracted_text = result.get(
            "text",
            "",
        )

        analysis = result.get(
            "analysis",
            {},
        )

        document_id = save_document(
            user_id=user_id,
            original_filename=file.filename,
            stored_file_path=str(
                stored_path
            ),
            content_type=file.content_type,
            file_size=len(file_bytes),
            file_hash=file_hash,
            source="upload",
            extracted_text=extracted_text,
            analysis=analysis,
            status="processed",
        )

        return {
            "success": True,
            "document_id": str(document_id),
            "filename": file.filename,
            "text": extracted_text,
            "analysis": analysis,
        }

    except Exception as error:

        print(
            "DOCUMENT PROCESSING ERROR:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@app.get("/api/documents/{user_id}")
def get_documents(user_id: str):

    documents = get_user_documents(
        user_id
    )

    return {
        "success": True,
        "documents": documents,
    }


@app.get("/api/documents/{user_id}/recent")
def get_recent_documents(
    user_id: str,
):

    documents = get_recent_user_documents(
        user_id
    )

    return {
        "success": True,
        "documents": documents,
    }


@app.get("/api/documents/{user_id}/search")
def search_documents(
    user_id: str,
    q: str,
):

    documents = search_user_documents(
        user_id=user_id,
        query=q,
    )

    return {
        "success": True,
        "documents": documents,
    }


@app.get("/api/documents/{user_id}/{document_id}")
def get_document_details(
    user_id: str,
    document_id: str,
):

    document = get_document(
        document_id=document_id,
        user_id=user_id,
    )

    if not document:

        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    return {
        "success": True,
        "document": document,
    }


# ============================================================
# GMAIL
# ============================================================

@app.get("/api/gmail/status/{user_id}")
def gmail_status(user_id: str):

    return get_gmail_status(
        user_id
    )


@app.get("/api/gmail/messages/{user_id}")
def gmail_messages(
    user_id: str,
    max_results: int = 20,
):

    return get_gmail_messages(
        user_id=user_id,
        max_results=max_results,
    )


@app.get("/api/gmail/message/{user_id}/{message_id}")
def gmail_message(
    user_id: str,
    message_id: str,
):

    return get_gmail_message(
        user_id=user_id,
        message_id=message_id,
    )


# ============================================================
# BUSINESS
# ============================================================

@app.get("/api/integrations/status/{user_id}")
def integrations_status(
    user_id: str,
):

    return {
        "success": True,
        "integrations": {
            "gmail": get_gmail_status(
                user_id
            ),
            "tin": True,
            "business": True,
        },
    }


@app.post("/api/business/register")
def register_business(
    request: dict,
):

    try:

        result = business_service.register_business(
            request
        )

        return {
            "success": True,
            "result": result,
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# TIN
# ============================================================

@app.post("/api/tin/apply")
def apply_for_tin(
    request: TinApplicationRequest,
):

    try:

        result = tin_service.apply(
            user_id=request.user_id,
            business_name=request.business_name,
            business_type=request.business_type,
            phone=request.phone,
            email=request.email,
            address=request.address,
        )

        return {
            "success": True,
            "result": result,
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@app.get("/api/tin/status/{user_id}/{application_id}")
def tin_status(
    user_id: str,
    application_id: str,
):

    try:

        result = tin_service.get_status(
            user_id=user_id,
            application_id=application_id,
        )

        return {
            "success": True,
            "result": result,
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# ANALYTICS
# ============================================================

@app.post("/api/analytics/profile")
def create_analytics_profile(
    request: AnalyticsProfileRequest,
):

    try:

        profile = create_or_update_business_profile(
            user_id=request.user_id,
            business_name=request.business_name,
            industry=request.industry,
            currency=request.currency,
            starting_revenue=request.starting_revenue,
            starting_expenses=request.starting_expenses,
            starting_customers=request.starting_customers,
            starting_employees=request.starting_employees,
        )

        analytics = calculate_analytics(
            request.user_id
        )

        return {
            "success": True,
            "profile": profile,
            "analytics": analytics,
        }

    except Exception as error:

        print(
            "ANALYTICS PROFILE ERROR:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@app.post("/api/analytics/transaction")
def create_analytics_transaction(
    request: AnalyticsTransactionRequest,
):

    try:

        transaction = add_analytics_transaction(
            user_id=request.user_id,
            transaction_type=request.transaction_type,
            amount=request.amount,
            description=request.description,
            category=request.category,
            customer_count=request.customer_count,
            employee_count=request.employee_count,
            transaction_date=request.transaction_date,
        )

        analytics = calculate_analytics(
            request.user_id
        )

        return {
            "success": True,
            "transaction": transaction,
            "analytics": analytics,
        }

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:

        print(
            "ANALYTICS TRANSACTION ERROR:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@app.get("/api/analytics/{user_id}")
def get_analytics(
    user_id: str,
):

    try:

        analytics = calculate_analytics(
            user_id
        )

        return {
            "success": True,
            "analytics": analytics,
        }

    except Exception as error:

        print(
            "ANALYTICS GET ERROR:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@app.get("/api/analytics/{user_id}/profile")
def get_analytics_profile(
    user_id: str,
):

    try:

        profile = get_business_profile(
            user_id
        )

        if not profile:

            raise HTTPException(
                status_code=404,
                detail="Analytics profile not found.",
            )

        return {
            "success": True,
            "profile": profile,
        }

    except HTTPException:
        raise

    except Exception as error:

        print(
            "ANALYTICS PROFILE GET ERROR:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# ANALYTICS QUICK ACTIONS
# ============================================================

@app.post("/api/analytics/{user_id}/revenue")
def add_revenue(
    user_id: str,
    amount: float,
    description: str | None = None,
    category: str | None = None,
):

    try:

        transaction = add_analytics_transaction(
            user_id=user_id,
            transaction_type="revenue",
            amount=amount,
            description=description,
            category=category,
        )

        analytics = calculate_analytics(
            user_id
        )

        return {
            "success": True,
            "transaction": transaction,
            "analytics": analytics,
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@app.post("/api/analytics/{user_id}/expense")
def add_expense(
    user_id: str,
    amount: float,
    description: str | None = None,
    category: str | None = None,
):

    try:

        transaction = add_analytics_transaction(
            user_id=user_id,
            transaction_type="expense",
            amount=amount,
            description=description,
            category=category,
        )

        analytics = calculate_analytics(
            user_id
        )

        return {
            "success": True,
            "transaction": transaction,
            "analytics": analytics,
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@app.post("/api/analytics/{user_id}/sale")
def add_sale(
    user_id: str,
    amount: float,
    description: str | None = None,
    category: str | None = None,
):

    try:

        transaction = add_analytics_transaction(
            user_id=user_id,
            transaction_type="sale",
            amount=amount,
            description=description,
            category=category,
        )

        analytics = calculate_analytics(
            user_id
        )

        return {
            "success": True,
            "transaction": transaction,
            "analytics": analytics,
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )