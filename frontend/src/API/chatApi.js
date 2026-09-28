const API_URL = "http://127.0.0.1:8000";

export async function sendMessage({
  userId,
  chatId,
  message,
}) {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      user_id: userId,
      chat_id: chatId || null,
      message,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "ELIRA could not generate a response."
    );
  }

  return data;
}