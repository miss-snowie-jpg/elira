import express from "express";

import {
  connectGmail,
  gmailCallback,
  sendGmail,
  getGmailMessageController,
  getGmailMessagesController,
  getGmailInboxPreviewController,
  readLatestGmailController,
} from "../Controllers/gmailController.js";

import authMiddleware from "../Middleware/authMiddleware.js";

const router = express.Router();


// ============================================================
// CONNECT GMAIL
// ============================================================

router.get(
  "/connect",
  authMiddleware,
  connectGmail
);


// ============================================================
// GMAIL CALLBACK
// ============================================================

router.get(
  "/callback",
  gmailCallback
);


// ============================================================
// SEND GMAIL
// ============================================================

router.post(
  "/send",
  sendGmail
);


// ============================================================
// GET GMAIL MESSAGES
// ============================================================

router.get(
  "/messages",
  authMiddleware,
  getGmailMessagesController
);


// ============================================================
// GET INDIVIDUAL GMAIL MESSAGE
// ============================================================

router.get(
  "/messages/:messageId",
  authMiddleware,
  getGmailMessageController
);
// ============================================================
// READ LATEST EMAIL
// ============================================================

router.get(
  "/read/latest",
  authMiddleware,
  readLatestGmailController
);


// ============================================================
// GMAIL INBOX PREVIEW
// ============================================================

router.get(
  "/preview",
  authMiddleware,
  getGmailInboxPreviewController
);


export default router;