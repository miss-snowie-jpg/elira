import uuid

import psycopg
from psycopg.types.json import Jsonb

from config import DATABASE_URL


# ==================================================
# DATABASE CONNECTION
# ==================================================

def get_connection():
    return psycopg.connect(DATABASE_URL)


def test_connection():
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1;")
                result = cursor.fetchone()

        print("DATABASE CONNECTION SUCCESS:", result)
        return True

    except Exception as error:
        print("DATABASE CONNECTION ERROR:", error)
        return False


# ==================================================
# DATABASE INITIALIZATION
# ==================================================

def init_database():

    with get_connection() as conn:

        with conn.cursor() as cursor:

            # ------------------------------------------
            # CHATS
            # ------------------------------------------

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS chats (
                    id UUID PRIMARY KEY,
                    user_id VARCHAR(24) NOT NULL,
                    title TEXT NOT NULL DEFAULT 'New Chat',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_chats_user_id
                ON chats(user_id);
                """
            )

            # ------------------------------------------
            # MESSAGES
            # ------------------------------------------

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS messages (
                    id BIGSERIAL PRIMARY KEY,
                    chat_id UUID NOT NULL
                        REFERENCES chats(id)
                        ON DELETE CASCADE,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_messages_chat_id
                ON messages(chat_id);
                """
            )

            # ------------------------------------------
            # MEMORIES
            # ------------------------------------------

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS memories (
                    id BIGSERIAL PRIMARY KEY,
                    user_id VARCHAR(24) NOT NULL,
                    memory_key TEXT NOT NULL,
                    memory_value TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, memory_key)
                );
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_memories_user_id
                ON memories(user_id);
                """
            )

            # ------------------------------------------
            # DOCUMENTS / OCR
            # ------------------------------------------

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS documents (
                    id UUID PRIMARY KEY,
                    user_id VARCHAR(24) NOT NULL,

                    original_filename TEXT NOT NULL,
                    stored_file_path TEXT,

                    content_type TEXT,
                    file_size BIGINT,
                    file_hash TEXT,

                    source TEXT,
                    sender TEXT,

                    received_at TIMESTAMP,
                    imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                    processing_method TEXT,

                    extracted_text TEXT,

                    analysis JSONB,

                    business_related BOOLEAN NOT NULL DEFAULT FALSE,
                    business_category TEXT,
                    business_confidence REAL,

                    status TEXT NOT NULL DEFAULT 'processed'
                );
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_documents_user_id
                ON documents(user_id);
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_documents_business
                ON documents(business_related);
                """
            )

        conn.commit()

    print("ELIRA DATABASE INITIALIZED")


# ==================================================
# CHAT FUNCTIONS
# ==================================================

def create_chat(
    user_id,
    title="New Chat"
):
    """
    Create a new chat and return its UUID.
    """

    chat_id = uuid.uuid4()

    with get_connection() as conn:

        with conn.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO chats (
                    id,
                    user_id,
                    title
                )
                VALUES (
                    %s,
                    %s,
                    %s
                );
                """,
                (
                    chat_id,
                    user_id,
                    title
                )
            )

        conn.commit()

    return chat_id


def get_chat(chat_id, user_id=None):

    with get_connection() as conn:

        with conn.cursor() as cursor:

            if user_id is not None:

                cursor.execute(
                    """
                    SELECT
                        id,
                        user_id,
                        title,
                        created_at
                    FROM chats
                    WHERE id = %s
                    AND user_id = %s;
                    """,
                    (
                        chat_id,
                        user_id
                    )
                )

            else:

                cursor.execute(
                    """
                    SELECT
                        id,
                        user_id,
                        title,
                        created_at
                    FROM chats
                    WHERE id = %s;
                    """,
                    (chat_id,)
                )

            return cursor.fetchone()


def get_user_chats(user_id):

    with get_connection() as conn:

        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id,
                    user_id,
                    title,
                    created_at
                FROM chats
                WHERE user_id = %s
                ORDER BY created_at DESC;
                """,
                (user_id,)
            )

            return cursor.fetchall()


def add_message(
    chat_id,
    role,
    content
):

    with get_connection() as conn:

        with conn.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO messages (
                    chat_id,
                    role,
                    content
                )
                VALUES (
                    %s,
                    %s,
                    %s
                )
                RETURNING id;
                """,
                (
                    chat_id,
                    role,
                    content
                )
            )

            message_id = cursor.fetchone()[0]

        conn.commit()

    return message_id


def get_history(chat_id):

    with get_connection() as conn:

        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id,
                    chat_id,
                    role,
                    content,
                    created_at
                FROM messages
                WHERE chat_id = %s
                ORDER BY created_at ASC, id ASC;
                """,
                (chat_id,)
            )

            return cursor.fetchall()


def search_user_chats(
    user_id,
    query
):

    with get_connection() as conn:

        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT DISTINCT
                    c.id,
                    c.user_id,
                    c.title,
                    c.created_at
                FROM chats c
                JOIN messages m
                    ON m.chat_id = c.id
                WHERE c.user_id = %s
                AND (
                    c.title ILIKE %s
                    OR m.content ILIKE %s
                )
                ORDER BY c.created_at DESC;
                """,
                (
                    user_id,
                    f"%{query}%",
                    f"%{query}%"
                )
            )

            return cursor.fetchall()


# ==================================================
# MEMORY FUNCTIONS
# ==================================================

def save_memory(
    user_id,
    memory_key,
    memory_value
):

    with get_connection() as conn:

        with conn.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO memories (
                    user_id,
                    memory_key,
                    memory_value
                )
                VALUES (
                    %s,
                    %s,
                    %s
                )
                ON CONFLICT (
                    user_id,
                    memory_key
                )
                DO UPDATE SET
                    memory_value = EXCLUDED.memory_value,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id;
                """,
                (
                    user_id,
                    memory_key,
                    memory_value
                )
            )

            memory_id = cursor.fetchone()[0]

        conn.commit()

    return memory_id


def get_memories(user_id):

    with get_connection() as conn:

        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id,
                    user_id,
                    memory_key,
                    memory_value,
                    created_at,
                    updated_at
                FROM memories
                WHERE user_id = %s
                ORDER BY updated_at DESC;
                """,
                (user_id,)
            )

            return cursor.fetchall()


def delete_memory(
    user_id,
    memory_key
):

    with get_connection() as conn:

        with conn.cursor() as cursor:

            cursor.execute(
                """
                DELETE FROM memories
                WHERE user_id = %s
                AND memory_key = %s;
                """,
                (
                    user_id,
                    memory_key
                )
            )

            deleted = cursor.rowcount > 0

        conn.commit()

    return deleted


# ==================================================
# DOCUMENT / OCR FUNCTIONS
# ==================================================

def save_document(
    user_id,
    original_filename,
    stored_file_path=None,
    content_type=None,
    file_size=None,
    file_hash=None,
    source=None,
    sender=None,
    received_at=None,
    processing_method=None,
    extracted_text=None,
    analysis=None,
    business_related=False,
    business_category=None,
    business_confidence=None,
    status="processed"
):

    document_id = uuid.uuid4()

    with get_connection() as conn:

        with conn.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO documents (
                    id,
                    user_id,
                    original_filename,
                    stored_file_path,
                    content_type,
                    file_size,
                    file_hash,
                    source,
                    sender,
                    received_at,
                    processing_method,
                    extracted_text,
                    analysis,
                    business_related,
                    business_category,
                    business_confidence,
                    status
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                );
                """,
                (
                    document_id,
                    user_id,
                    original_filename,
                    stored_file_path,
                    content_type,
                    file_size,
                    file_hash,
                    source,
                    sender,
                    received_at,
                    processing_method,
                    extracted_text,
                    Jsonb(analysis) if analysis is not None else None,
                    business_related,
                    business_category,
                    business_confidence,
                    status
                )
            )

        conn.commit()

    return document_id


def update_document(
    document_id,
    extracted_text=None,
    analysis=None,
    business_related=None,
    business_category=None,
    business_confidence=None,
    status=None,
    processing_method=None
):

    updates = []
    values = []

    if extracted_text is not None:
        updates.append("extracted_text = %s")
        values.append(extracted_text)

    if analysis is not None:
        updates.append("analysis = %s")
        values.append(Jsonb(analysis))

    if business_related is not None:
        updates.append("business_related = %s")
        values.append(business_related)

    if business_category is not None:
        updates.append("business_category = %s")
        values.append(business_category)

    if business_confidence is not None:
        updates.append("business_confidence = %s")
        values.append(business_confidence)

    if status is not None:
        updates.append("status = %s")
        values.append(status)

    if processing_method is not None:
        updates.append("processing_method = %s")
        values.append(processing_method)

    if not updates:
        return False

    values.append(document_id)

    query = f"""
        UPDATE documents
        SET
            {", ".join(updates)}
        WHERE id = %s;
    """

    with get_connection() as conn:

        with conn.cursor() as cursor:

            cursor.execute(
                query,
                tuple(values)
            )

            updated = cursor.rowcount > 0

        conn.commit()

    return updated


def get_user_documents(user_id):

    with get_connection() as conn:

        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id,
                    user_id,
                    original_filename,
                    stored_file_path,
                    content_type,
                    file_size,
                    file_hash,
                    source,
                    sender,
                    received_at,
                    imported_at,
                    processing_method,
                    extracted_text,
                    analysis,
                    business_related,
                    business_category,
                    business_confidence,
                    status
                FROM documents
                WHERE user_id = %s
                ORDER BY imported_at DESC;
                """,
                (user_id,)
            )

            return cursor.fetchall()


def search_user_documents(
    user_id,
    query
):

    with get_connection() as conn:

        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id,
                    user_id,
                    original_filename,
                    stored_file_path,
                    content_type,
                    file_size,
                    file_hash,
                    source,
                    sender,
                    received_at,
                    imported_at,
                    processing_method,
                    extracted_text,
                    analysis,
                    business_related,
                    business_category,
                    business_confidence,
                    status
                FROM documents
                WHERE user_id = %s
                AND (
                    original_filename ILIKE %s
                    OR extracted_text ILIKE %s
                    OR business_category ILIKE %s
                )
                ORDER BY imported_at DESC;
                """,
                (
                    user_id,
                    f"%{query}%",
                    f"%{query}%",
                    f"%{query}%"
                )
            )

            return cursor.fetchall()


def get_recent_user_documents(
    user_id,
    limit=10
):

    with get_connection() as conn:

        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id,
                    user_id,
                    original_filename,
                    stored_file_path,
                    content_type,
                    file_size,
                    file_hash,
                    source,
                    sender,
                    received_at,
                    imported_at,
                    processing_method,
                    extracted_text,
                    analysis,
                    business_related,
                    business_category,
                    business_confidence,
                    status
                FROM documents
                WHERE user_id = %s
                ORDER BY imported_at DESC
                LIMIT %s;
                """,
                (
                    user_id,
                    limit
                )
            )

            return cursor.fetchall()


def get_documents_by_ids(
    user_id,
    document_ids
):

    if not document_ids:
        return []

    with get_connection() as conn:

        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id,
                    user_id,
                    original_filename,
                    stored_file_path,
                    content_type,
                    file_size,
                    file_hash,
                    source,
                    sender,
                    received_at,
                    imported_at,
                    processing_method,
                    extracted_text,
                    analysis,
                    business_related,
                    business_category,
                    business_confidence,
                    status
                FROM documents
                WHERE user_id = %s
                AND id = ANY(%s);
                """,
                (
                    user_id,
                    document_ids
                )
            )

            return cursor.fetchall()


def get_business_documents(user_id):

    with get_connection() as conn:

        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id,
                    user_id,
                    original_filename,
                    stored_file_path,
                    content_type,
                    file_size,
                    file_hash,
                    source,
                    sender,
                    received_at,
                    imported_at,
                    processing_method,
                    extracted_text,
                    analysis,
                    business_related,
                    business_category,
                    business_confidence,
                    status
                FROM documents
                WHERE user_id = %s
                AND business_related = TRUE
                ORDER BY imported_at DESC;
                """,
                (user_id,)
            )

            return cursor.fetchall()


def get_document(
    document_id,
    user_id=None
):

    with get_connection() as conn:

        with conn.cursor() as cursor:

            if user_id is not None:

                cursor.execute(
                    """
                    SELECT
                        id,
                        user_id,
                        original_filename,
                        stored_file_path,
                        content_type,
                        file_size,
                        file_hash,
                        source,
                        sender,
                        received_at,
                        imported_at,
                        processing_method,
                        extracted_text,
                        analysis,
                        business_related,
                        business_category,
                        business_confidence,
                        status
                    FROM documents
                    WHERE id = %s
                    AND user_id = %s;
                    """,
                    (
                        document_id,
                        user_id
                    )
                )

            else:

                cursor.execute(
                    """
                    SELECT
                        id,
                        user_id,
                        original_filename,
                        stored_file_path,
                        content_type,
                        file_size,
                        file_hash,
                        source,
                        sender,
                        received_at,
                        imported_at,
                        processing_method,
                        extracted_text,
                        analysis,
                        business_related,
                        business_category,
                        business_confidence,
                        status
                    FROM documents
                    WHERE id = %s;
                    """,
                    (document_id,)
                )

            return cursor.fetchone()