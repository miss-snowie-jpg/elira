import "dotenv/config";

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

// Database
import connectMongoDB from "./mongo.js";

// Routes
import authRoutes from "./Routes/authRoutes.js";
import aiRoutes from "./Routes/aiRoutes.js";
import gmailRoutes from "./Routes/gmailRoutes.js";

// ============================================================
// ENVIRONMENT CHECK
// ============================================================

console.log(
  "GMAIL CLIENT ID:",
  process.env.GOOGLE_GMAIL_CLIENT_ID
    ? "LOADED"
    : "MISSING"
);

console.log(
  "GMAIL CLIENT SECRET:",
  process.env.GOOGLE_GMAIL_CLIENT_SECRET
    ? "LOADED"
    : "MISSING"
);

console.log(
  "GMAIL REDIRECT URI:",
  process.env.GOOGLE_GMAIL_REDIRECT_URI || "MISSING"
);

// ============================================================
// APP
// ============================================================

const app = express();

const PORT = process.env.PORT || 5000;

// ============================================================
// CORS
// ============================================================

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ============================================================
// BODY PARSING
// ============================================================

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// ============================================================
// COOKIES
// ============================================================

app.use(cookieParser());
app.use(express.static("dist"))


// ============================================================
// ROUTES
// ============================================================

app.use("/api/auth", authRoutes);

app.use("/api/ai", aiRoutes);

app.use("/api/gmail", gmailRoutes);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ELIRA API is running 🚀",
  });
});

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found.",
    path: req.originalUrl,
  });
});

// ============================================================
// START SERVER
// ============================================================

const startServer = async () => {
  try {
    await connectMongoDB();

    app.listen(PORT, () => {
      console.log("----------------------------------------");
      console.log(`🚀 ELIRA API running on port ${PORT}`);
      console.log(`🌐 http://localhost:${PORT}`);
      console.log("----------------------------------------");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);

    process.exit(1);
  }
};

startServer();