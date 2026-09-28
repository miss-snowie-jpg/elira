import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import "./Documents.css";

const API_URL = "http://127.0.0.1:8000";

function Documents() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  // ============================================================
  // UPLOAD / CAMERA STATE
  // ============================================================

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // ============================================================
  // DOCUMENT LIBRARY
  // ============================================================

  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentLoading, setDocumentLoading] = useState(false);

  // ============================================================
  // RESULT / ERROR
  // ============================================================

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // ============================================================
  // CAMERA REFS
  // ============================================================

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // ============================================================
  // AUTH
  // ============================================================

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // ============================================================
  // LOAD DOCUMENT LIBRARY
  // ============================================================

  const loadDocuments = async () => {
    if (!user?.id) return;

    setDocumentsLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/documents/user/${user.id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not load your documents."
        );
      }

      setDocuments(Array.isArray(data.documents) ? data.documents : []);
    } catch (err) {
      console.error("DOCUMENT LIBRARY ERROR:", err);

      setError(
        err.message || "Could not load your documents."
      );
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Load documents when page opens
  useEffect(() => {
    if (user?.id) {
      loadDocuments();
    }
  }, [user?.id]);

  // ============================================================
  // FILE UPLOAD SELECTION
  // ============================================================

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);
    setSelectedDocument(null);
    setError("");

    if (selectedFile.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(selectedFile));
    } else {
      setPreview(null);
    }
  };

  // ============================================================
  // OPEN CAMERA
  // ============================================================

  const openCamera = async () => {
    setError("");
    setResult(null);
    setSelectedDocument(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera access is not supported by this browser."
      );
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: "environment",
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      setCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("CAMERA ERROR:", err);

      setError(
        "Camera access was denied or unavailable."
      );
    }
  };

  // ============================================================
  // CLOSE CAMERA
  // ============================================================

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    setCameraOpen(false);
  };

  // ============================================================
  // CAPTURE PHOTO
  // ============================================================

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setError("Camera is not ready yet.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Could not capture the photo.");
          return;
        }

        const capturedFile = new File(
          [blob],
          "camera-document.jpg",
          {
            type: "image/jpeg",
          }
        );

        setFile(capturedFile);

        setPreview(URL.createObjectURL(blob));

        closeCamera();
      },
      "image/jpeg",
      0.95
    );
  };

  // ============================================================
  // ANALYZE / UPLOAD DOCUMENT
  // ============================================================

  const analyzeDocument = async () => {
    if (!file) {
      setError(
        "Please upload or capture a document first."
      );
      return;
    }

    if (!user?.id) {
      setError("You must be logged in.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("user_id", user.id);

      console.log("Uploading document for user:", user.id);

      const response = await fetch(
        `${API_URL}/api/documents/ocr`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Document processing failed."
        );
      }

      console.log("DOCUMENT OCR RESULT:", data);

      setResult(data);

      // Refresh library so the new document appears
      await loadDocuments();
    } catch (err) {
      console.error(
        "DOCUMENT ANALYSIS ERROR:",
        err
      );

      setError(
        err.message ||
          "Something went wrong while analyzing the document."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // OPEN SAVED DOCUMENT
  // ============================================================

  const openDocument = async (documentId) => {
    if (!user?.id) return;

    setDocumentLoading(true);
    setError("");
    setSelectedDocument(null);

    try {
      const response = await fetch(
        `${API_URL}/api/documents/${documentId}?user_id=${user.id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Could not open this document."
        );
      }

      setSelectedDocument(data.document);
    } catch (err) {
      console.error(
        "OPEN DOCUMENT ERROR:",
        err
      );

      setError(
        err.message ||
          "Could not open this document."
      );
    } finally {
      setDocumentLoading(false);
    }
  };

  // ============================================================
  // CLOSE DOCUMENT
  // ============================================================

  const closeDocument = () => {
    setSelectedDocument(null);
  };

  // ============================================================
  // RESET UPLOAD
  // ============================================================

  const resetDocument = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
  };

  // ============================================================
  // SEARCH DOCUMENTS
  // ============================================================

  const filteredDocuments = documents.filter(
    (document) => {
      const query = search
        .toLowerCase()
        .trim();

      if (!query) return true;

      return (
        document.original_filename
          ?.toLowerCase()
          .includes(query) ||
        document.business_category
          ?.toLowerCase()
          .includes(query) ||
        document.status
          ?.toLowerCase()
          .includes(query)
      );
    }
  );

  // ============================================================
  // FORMAT FILE SIZE
  // ============================================================

  const formatFileSize = (bytes) => {
    if (!bytes) return "Unknown size";

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  };

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (date) => {
    if (!date) return "Unknown date";

    try {
      return new Date(date).toLocaleDateString(
        undefined,
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        }
      );
    } catch {
      return "Unknown date";
    }
  };

  // ============================================================
  // FILE ICON
  // ============================================================

  const getFileIcon = (contentType) => {
    if (contentType === "application/pdf") {
      return "📕";
    }

    if (
      contentType?.startsWith("image/")
    ) {
      return "🖼️";
    }

    return "📄";
  };

  // ============================================================
  // CAMERA CLEANUP
  // ============================================================

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }

      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="documents-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="documents-header">
        <div>
          <p className="documents-eyebrow">
            ELIRA DOCUMENT INTELLIGENCE
          </p>

          <h1>Documents</h1>

          <p className="documents-description">
            Upload, analyze, and manage your
            documents with ELIRA.
          </p>
        </div>
      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="document-error">
          {error}
        </div>
      )}

      {/* ======================================================
          CAMERA
      ====================================================== */}

      {cameraOpen && (
        <div className="camera-section">

          <div className="camera-view">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
            />
          </div>

          <div className="camera-controls">

            <button
              className="primary-button"
              onClick={capturePhoto}
            >
              Capture Document
            </button>

            <button
              className="secondary-button"
              onClick={closeCamera}
            >
              Cancel
            </button>

          </div>

        </div>
      )}

      <canvas
        ref={canvasRef}
        style={{ display: "none" }}
      />

      {/* ======================================================
          UPLOAD OPTIONS
      ====================================================== */}

      {!cameraOpen && !file && (
        <div className="document-options">

          <label className="document-card">

            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
              hidden
            />

            <div className="document-card-icon">
              📄
            </div>

            <h2>Upload Document</h2>

            <p>
              PDF, PNG, JPG or WebP
            </p>

            <span>
              Choose a file
            </span>

          </label>

          <button
            className="document-card camera-card"
            onClick={openCamera}
          >

            <div className="document-card-icon">
              📷
            </div>

            <h2>Use Camera</h2>

            <p>
              Capture a document directly
            </p>

            <span>
              Open camera
            </span>

          </button>

        </div>
      )}

      {/* ======================================================
          SELECTED FILE
      ====================================================== */}

      {file && !cameraOpen && (
        <div className="document-selected">

          <div className="selected-header">

            <div>
              <p className="documents-eyebrow">
                DOCUMENT READY
              </p>

              <h2>
                {file.name}
              </h2>
            </div>

          </div>

          {preview ? (
            <img
              src={preview}
              alt="Document preview"
              className="document-preview-image"
            />
          ) : (
            <div className="pdf-preview">

              <div>📄</div>

              <div>
                <strong>
                  PDF Document
                </strong>

                <p>
                  {file.name}
                </p>
              </div>

            </div>
          )}

          <div className="document-actions">

            <button
              className="primary-button"
              onClick={analyzeDocument}
              disabled={loading}
            >
              {loading
                ? "ELIRA is analyzing..."
                : "Analyze with ELIRA"}
            </button>

            <button
              className="secondary-button"
              onClick={resetDocument}
              disabled={loading}
            >
              Remove
            </button>

          </div>

        </div>
      )}

      {/* ======================================================
          NEW ANALYSIS RESULT
      ====================================================== */}

      {result && (
        <div className="analysis-result">

          <div className="analysis-result-header">

            <div>
              <p className="documents-eyebrow">
                ELIRA ANALYSIS
              </p>

              <h2>
                Document Analysis
              </h2>
            </div>

            <span className="complete-badge">
              ✓ Complete
            </span>

          </div>

          <div className="analysis-body">

            {result.analysis?.title && (
              <h3>
                {result.analysis.title}
              </h3>
            )}

            {result.analysis?.summary && (
              <p>
                {result.analysis.summary}
              </p>
            )}

            {result.analysis?.fields &&
              Object.entries(
                result.analysis.fields
              ).map(([key, value]) =>
                !value ? null : (
                  <div
                    className="field"
                    key={key}
                  >
                    <span className="key">
                      {key
                        .replace(
                          /(^\w|\s\w)/g,
                          (match) =>
                            match.toUpperCase()
                        )}
                      :
                    </span>

                    <span className="value">
                      {Array.isArray(value)
                        ? value.join(", ")
                        : String(value)}
                    </span>
                  </div>
                )
              )}

          </div>

        </div>
      )}

      {/* ======================================================
          DOCUMENT LIBRARY
      ====================================================== */}

      <div className="documents-library">

        <div className="documents-library-header">

          <div>
            <p className="documents-eyebrow">
              YOUR LIBRARY
            </p>

            <h2>
              Saved Documents
            </h2>
          </div>

          <button
            className="secondary-button"
            onClick={loadDocuments}
            disabled={documentsLoading}
          >
            {documentsLoading
              ? "Refreshing..."
              : "Refresh"}
          </button>

        </div>

        {/* SEARCH */}

        <div className="documents-search">

          <input
            type="text"
            placeholder="Search your documents..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

        </div>

        {/* LOADING */}

        {documentsLoading && (
          <div className="documents-empty">
            Loading your documents...
          </div>
        )}

        {/* EMPTY */}

        {!documentsLoading &&
          filteredDocuments.length === 0 && (
            <div className="documents-empty">

              <div className="document-card-icon">
                📂
              </div>

              <h3>
                {search
                  ? "No matching documents"
                  : "No documents yet"}
              </h3>

              <p>
                {search
                  ? "Try a different search."
                  : "Upload your first document and ELIRA will analyze it."}
              </p>

            </div>
          )}

        {/* DOCUMENT LIST */}

        {!documentsLoading &&
          filteredDocuments.length > 0 && (
            <div className="documents-grid">

              {filteredDocuments.map(
                (document) => (
                  <button
                    className="saved-document-card"
                    key={document.id}
                    onClick={() =>
                      openDocument(
                        document.id
                      )
                    }
                  >

                    <div className="saved-document-icon">
                      {getFileIcon(
                        document.content_type
                      )}
                    </div>

                    <div className="saved-document-info">

                      <h3>
                        {document.original_filename}
                      </h3>

                      <p>
                        {formatFileSize(
                          document.file_size
                        )}
                        {" • "}
                        {formatDate(
                          document.imported_at
                        )}
                      </p>

                      <div className="saved-document-meta">

                        {document.business_category && (
                          <span>
                            {document.business_category}
                          </span>
                        )}

                        <span>
                          {document.status}
                        </span>

                      </div>

                    </div>

                    <div className="saved-document-arrow">
                      →
                    </div>

                  </button>
                )
              )}

            </div>
          )}

      </div>

      {/* ======================================================
          DOCUMENT DETAILS MODAL
      ====================================================== */}

      {selectedDocument && (
        <div
          className="document-modal-overlay"
          onClick={closeDocument}
        >

          <div
            className="document-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="document-modal-header">

              <div>
                <p className="documents-eyebrow">
                  DOCUMENT
                </p>

                <h2>
                  {selectedDocument.original_filename}
                </h2>
              </div>

              <button
                className="secondary-button"
                onClick={closeDocument}
              >
                Close
              </button>

            </div>

            {documentLoading ? (
              <div className="documents-empty">
                Loading document...
              </div>
            ) : (
              <div className="document-modal-body">

                {/* METADATA */}

                <div className="document-details-grid">

                  <div>
                    <span>
                      File type
                    </span>

                    <strong>
                      {selectedDocument.content_type ||
                        "Unknown"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Size
                    </span>

                    <strong>
                      {formatFileSize(
                        selectedDocument.file_size
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Imported
                    </span>

                    <strong>
                      {formatDate(
                        selectedDocument.imported_at
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Status
                    </span>

                    <strong>
                      {selectedDocument.status ||
                        "Unknown"}
                    </strong>
                  </div>

                  {selectedDocument.business_category && (
                    <div>
                      <span>
                        Category
                      </span>

                      <strong>
                        {
                          selectedDocument.business_category
                        }
                      </strong>
                    </div>
                  )}

                </div>

                {/* AI ANALYSIS */}

                {selectedDocument.analysis && (
                  <div className="document-detail-section">

                    <p className="documents-eyebrow">
                      ELIRA ANALYSIS
                    </p>

                    {selectedDocument.analysis.title && (
                      <h3>
                        {
                          selectedDocument.analysis
                            .title
                        }
                      </h3>
                    )}

                    {selectedDocument.analysis.summary && (
                      <p>
                        {
                          selectedDocument.analysis
                            .summary
                        }
                      </p>
                    )}

                    {selectedDocument.analysis.fields &&
                      Object.entries(
                        selectedDocument.analysis.fields
                      ).map(
                        ([key, value]) =>
                          !value ? null : (
                            <div
                              className="field"
                              key={key}
                            >
                              <span className="key">
                                {key
                                  .replace(
                                    /(^\w|\s\w)/g,
                                    (match) =>
                                      match.toUpperCase()
                                  )}
                                :
                              </span>

                              <span className="value">
                                {Array.isArray(
                                  value
                                )
                                  ? value.join(
                                      ", "
                                    )
                                  : String(
                                      value
                                    )}
                              </span>
                            </div>
                          )
                      )}

                  </div>
                )}

                {/* EXTRACTED TEXT */}

                {selectedDocument.extracted_text && (
                  <div className="document-detail-section">

                    <p className="documents-eyebrow">
                      EXTRACTED TEXT
                    </p>

                    <div className="extracted-text">
                      {
                        selectedDocument.extracted_text
                      }
                    </div>

                  </div>
                )}

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}

export default Documents;
