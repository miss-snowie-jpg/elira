import { useEffect, useRef, useState } from "react";
import "./Chat.css";
import useMarkdown from "../hooks/useMarkdown";
import Engine from "../utils/engine";
import loadingAnimationShader from "../components/animations/shaders/loading";

/**
 * Chat Page
 * @param {Engine} engine Engine instance for managing shaders and rendering
 */
function Chat({engine}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chatId, setChatId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Email waiting for user confirmation
  const [pendingPermission, setPendingPermission] = useState(null);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const loadingRef = useRef(null);

  const [attachedFile, setAttachedFile] = useState(null);

  // ============================================================
  // GET CURRENT USER
  // ============================================================

  const markdown = useMarkdown();

  useEffect(() => {
    if (loading) {
      const canvas = loadingRef.current;
      engine.addShader(loadingAnimationShader, canvas);
    } else {
      engine.removeShader(loadingAnimationShader);
    }
  }, [loading]);

  const getCurrentUser = () => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      console.error("ELIRA: No user found in localStorage.");
      return null;
    }

    try {
      const user = JSON.parse(storedUser);

      const userId = user.id || user._id;

      if (!userId) {
        console.error("ELIRA: User object has no id:", user);

        return null;
      }

      return {
        ...user,
        id: userId,
      };
    } catch (error) {
      console.error("ELIRA: Failed to parse stored user:", error);

      return null;
    }
  };

  const handleUseImage = () => {
    setShowAttachMenu(false);
    imageInputRef.current?.click();
  };

  const handleUploadDocument = () => {
    setShowAttachMenu(false);
    fileInputRef.current?.click();
  };

  const handleDocumentList = () => {
    setShowAttachMenu(false);
    navigate("/documents");
  };

  const handleImageSelected = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setAttachedFile(selectedFile);

    // Allow selecting the same file again later
    event.target.value = "";
  };

  const handleDocumentSelected = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setAttachedFile(selectedFile);
    console.log(selectedFile);

    event.target.value = "";
  };

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const sendMessage = async () => {
    const message = input.trim();

    if (!message || loading) {
      return;
    }

    const user = getCurrentUser();

    if (!user?.id) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Please log in before using ELIRA.",
        },
      ]);

      return;
    }

    setInput("");

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: message,
      },
    ]);

    setLoading(true);

    let documentContext = null;

    if (attachedFile) {
      try {
        documentContext = await uploadChatFile(attachedFile);
      } catch (error) {
        console.error("ATTACHMENT ERROR:", error);
        setError(error.message);
        return;
      }
    }
    setAttachedFile(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          user_id: user.id,
          chat_id: chatId,
          message: documentContext
            ? `${message}\n\n[Attached document]\n${JSON.stringify(
                documentContext,
              )}`
            : message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to send message");
      }

      // ========================================================
      // SAVE CHAT ID
      // ========================================================

      setChatId(data.chat_id);

      // ========================================================
      // EMAIL PREVIEW
      // ========================================================

      if (data.status === "email_preview") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
          },
        ]);

        setPendingPermission({
          action_id: data.permission.action_id,

          email: {
            to: data.email.to,
            subject: data.email.subject,
            body: data.email.body,
          },
        });

        return;
      }

      // ========================================================
      // LEGACY PERMISSION RESPONSE
      // ========================================================

      if (data.status === "permission_required") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
          },
        ]);

        setPendingPermission({
          action_id: data.permission.action_id,

          email: null,
        });

        return;
      }

      // ========================================================
      // NORMAL AI RESPONSE
      // ========================================================

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
        },
      ]);
    } catch (error) {
      console.error("CHAT ERROR:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't connect to ELIRA right now.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HANDLE EMAIL PERMISSION
  // ============================================================

  const handlePermission = async (allowed) => {
    if (!pendingPermission) {
      return;
    }

    const user = getCurrentUser();

    if (!user?.id) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/chat/permission", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          user_id: user.id,

          action_id: pendingPermission.action_id,

          allowed: allowed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Permission request failed");
      }

      // ========================================================
      // REMOVE PREVIEW
      // ========================================================

      setPendingPermission(null);

      // ========================================================
      // SHOW RESULT
      // ========================================================

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
        },
      ]);
    } catch (error) {
      console.error("PERMISSION ERROR:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong while processing the email.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ENTER KEY
  // ============================================================

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      sendMessage();
    }
  };

  const uploadChatFile = async (file) => {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("user_id", getCurrentUser().id);

    const response = await fetch("http://127.0.0.1:8000/api/documents/ocr", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to process the attachment.");
    }

    return data;
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="chat-page">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleImageSelected}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
        hidden
        onChange={handleDocumentSelected}
      />

      {/* ======================================================
          CHAT HEADER
      ====================================================== */}

      <div className="chat-header">
        <div>
          <h1>ELIRA</h1>

          <span>AI Assistant</span>
        </div>
      </div>

      {/* ======================================================
          MESSAGES
      ====================================================== */}

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <div className="chat-logo">✦</div>

            <h2>How can I help you?</h2>

            <p>
              Ask ELIRA anything about your business, technology, strategy, or
              ideas.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`chat-message ${message.role}`}>
            <div className="message-content">
              {markdown.render(message.content)}
            </div>
          </div>
        ))}

        {/* ====================================================
            EMAIL PREVIEW
        ==================================================== */}

        {pendingPermission && pendingPermission.email && (
          <div className="email-preview">
            {/* HEADER */}

            <div className="email-preview-header">
              <div>
                <span className="email-preview-label">EMAIL PREVIEW</span>

                <h3>Review before sending</h3>
              </div>
            </div>

            {/* TO */}

            <div className="email-preview-field">
              <span className="email-preview-field-label">To</span>

              <span className="email-preview-value">
                {pendingPermission.email.to}
              </span>
            </div>

            {/* SUBJECT */}

            <div className="email-preview-field">
              <span className="email-preview-field-label">Subject</span>

              <span className="email-preview-value">
                {pendingPermission.email.subject}
              </span>
            </div>

            {/* BODY */}

            <div className="email-preview-body">
              {pendingPermission.email.body}
            </div>

            {/* ACTIONS */}

            <div className="email-preview-actions">
              <button
                type="button"
                className="email-cancel-button"
                onClick={() => handlePermission(false)}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="email-send-button"
                onClick={() => handlePermission(true)}
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        )}

        {/* ====================================================
            THINKING
        ==================================================== */}

        {loading && !pendingPermission && (
          <div className="chat-message assistant">
            <canvas ref={loadingRef}></canvas>
          </div>
        )}
      </div>

      {/* ======================================================
          COMPOSER
      ====================================================== */}

      <div className="chat-composer">
        <div className="add-files">
          <button
            className="secondary"
            onClick={() => setShowAttachMenu((prev) => !prev)}
          >
            <span>+</span>
          </button>

          <nav className={`attach-menu ${showAttachMenu ? "active" : ""}`}>
            <button onClick={handleUseImage}>Use Image</button>

            <button onClick={handleUploadDocument}>Upload Document</button>

            <button onClick={handleDocumentList}>Document List</button>
          </nav>
        </div>

        <div class="input">
          {attachedFile && (
            <div className="attached-file">
              <div className="attached-file-info">
                <span className="attached-file-icon">📎</span>
                <div className="attached-file-details">
                  <span className="attached-file-name">
                    {attachedFile.name}
                  </span>
                  <span className="attached-file-size">
                    {(attachedFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="attached-file-remove"
                onClick={() => setAttachedFile(null)}
              >
                ×
              </button>
            </div>
          )}
          <textarea
            value={input}
            onChange={(event) => {
              event.target.style.height = "auto";
              event.target.style.height = `${event.target.scrollHeight}px`;
              setInput(event.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message ELIRA..."
            rows={1}
            disabled={loading || Boolean(pendingPermission)}
          ></textarea>
        </div>

        <button
          type="button"
          onClick={sendMessage}
          disabled={!input.trim() || loading || Boolean(pendingPermission)}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

export default Chat;
