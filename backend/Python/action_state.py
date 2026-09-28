import uuid
from datetime import datetime, timezone


_pending_actions = {}


def create_action(
    user_id: str,
    chat_id: str,
    original_message: str,
    action_type: str,
    payload: dict | None = None,
):
    action_id = str(uuid.uuid4())

    _pending_actions[action_id] = {
        "action_id": action_id,
        "user_id": user_id,
        "chat_id": chat_id,
        "original_message": original_message,
        "action_type": action_type,
        "payload": payload or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    return action_id
def get_action_state(action_id: str):
    return _pending_actions.get(action_id)


def get_action(action_id: str):
    return _pending_actions.get(action_id)


def delete_action(action_id: str):
    _pending_actions.pop(action_id, None)