import crypto from "crypto";

import GmailConnection from "../Models/GmailConnection.js";

import {
  getGmailAuthorizationUrl,
  exchangeGmailCode,
  getGoogleAccount,
  sendGmail as sendGmailService,
  getGmailMessage,
  getGmailMessages,
  getGmailInboxPreview,
} from "../Services/googleGmail.js";
// ============================================================
// SEND GMAIL
// ============================================================

export const sendGmail = async (req, res) => {
  try {
    const {
      userId,
      to,
      subject,
      message,
    } = req.body;

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required.",
      });
    }

    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "to, subject, and message are required.",
      });
    }

    // --------------------------------------------------------
    // FIND CONNECTED GMAIL ACCOUNT
    // --------------------------------------------------------

    const gmailConnection =
      await GmailConnection.findOne({
        userId,
      });

    if (!gmailConnection) {
      return res.status(404).json({
        success: false,
        message: "Gmail account is not connected.",
      });
    }

    // --------------------------------------------------------
    // SEND EMAIL
    // --------------------------------------------------------

    const sentEmail = await sendGmailService({
      gmailConnection,
      to,
      subject,
      message,
    });

    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Email sent successfully.",
      email: {
        id: sentEmail.id,
        threadId: sentEmail.threadId,
        labelIds: sentEmail.labelIds,
      },
    });

  } catch (error) {
    console.error("GMAIL SEND ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send email.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// START GMAIL CONNECTION
// ============================================================

export const connectGmail = async (req, res) => {
  try {
    // --------------------------------------------------------
    // GET AUTHENTICATED ELIRA USER
    // --------------------------------------------------------

    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required.",
      });
    }

    // --------------------------------------------------------
    // CREATE OAUTH STATE
    // --------------------------------------------------------

    const statePayload = {
      userId,
      nonce: crypto.randomBytes(32).toString("hex"),
    };

    const state = Buffer.from(
      JSON.stringify(statePayload)
    ).toString("base64url");

    // --------------------------------------------------------
    // CREATE GOOGLE AUTHORIZATION URL
    // --------------------------------------------------------

    const authUrl = getGmailAuthorizationUrl(state);

    // --------------------------------------------------------
    // STORE STATE IN HTTP-ONLY COOKIE
    // --------------------------------------------------------

    res.cookie("gmail_oauth_state", state, {
      httpOnly: true,

      secure: process.env.NODE_ENV === "production",

      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",

      maxAge: 10 * 60 * 1000,

      path: "/",
    });

    // --------------------------------------------------------
    // SEND URL TO FRONTEND
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      authorizationUrl: authUrl,
    });
  } catch (error) {
    console.error("GMAIL CONNECT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to start Gmail connection.",
    });
  }
};

// ============================================================
// GOOGLE CALLBACK
// ============================================================

export const gmailCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // --------------------------------------------------------
    // GOOGLE DENIED ACCESS
    // --------------------------------------------------------

    if (error) {
      console.error("GOOGLE OAUTH ERROR:", error);

      res.clearCookie("gmail_oauth_state");

      return res.status(400).json({
        success: false,
        message: "Google Gmail authorization was cancelled or denied.",
        error,
      });
    }

    // --------------------------------------------------------
    // GET SAVED STATE
    // --------------------------------------------------------

    const savedState = req.cookies.gmail_oauth_state;

    // --------------------------------------------------------
    // CHECK STATE
    // --------------------------------------------------------

    if (!state || !savedState || state !== savedState) {
      return res.status(400).json({
        success: false,
        message: "Invalid OAuth state.",
      });
    }

    // --------------------------------------------------------
    // DECODE STATE
    // --------------------------------------------------------

    let stateData;

    try {
      stateData = JSON.parse(
        Buffer.from(state, "base64url").toString("utf8")
      );
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid OAuth state.",
      });
    }

    // --------------------------------------------------------
    // GET ELIRA USER ID
    // --------------------------------------------------------

    const userId = stateData.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User identity missing from OAuth state.",
      });
    }

    // --------------------------------------------------------
    // CHECK AUTHORIZATION CODE
    // --------------------------------------------------------

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code missing.",
      });
    }

    // --------------------------------------------------------
    // EXCHANGE CODE FOR TOKENS
    // --------------------------------------------------------

    const tokens = await exchangeGmailCode(code);

    if (!tokens.access_token) {
      return res.status(400).json({
        success: false,
        message: "Google did not return an access token.",
      });
    }

    // --------------------------------------------------------
    // GET GOOGLE ACCOUNT
    // --------------------------------------------------------

    const googleAccount = await getGoogleAccount(tokens);

    if (!googleAccount?.email) {
      return res.status(400).json({
        success: false,
        message: "Unable to identify Google account.",
      });
    }

    // --------------------------------------------------------
    // FIND EXISTING GMAIL CONNECTION
    // --------------------------------------------------------

    const existingConnection =
      await GmailConnection.findOne({
        userId,
      });

    // ========================================================
    // UPDATE EXISTING CONNECTION
    // ========================================================

    if (existingConnection) {
      existingConnection.googleAccountId =
        googleAccount.id;

      existingConnection.email =
        googleAccount.email;

      existingConnection.accessToken =
        tokens.access_token;

      // Google may not send a new refresh token.
      // Keep the old one if it already exists.
      if (tokens.refresh_token) {
        existingConnection.refreshToken =
          tokens.refresh_token;
      }

      existingConnection.expiryDate =
        tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null;

      await existingConnection.save();
    }

    // ========================================================
    // CREATE NEW CONNECTION
    // ========================================================

    else {
      await GmailConnection.create({
        userId,

        googleAccountId:
          googleAccount.id,

        email:
          googleAccount.email,

        accessToken:
          tokens.access_token,

        refreshToken:
          tokens.refresh_token || null,

        expiryDate:
          tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : null,
      });
    }

    // --------------------------------------------------------
    // LOG SUCCESS
    // --------------------------------------------------------

    console.log(
      `GMAIL CONNECTED SUCCESSFULLY: ${googleAccount.email}`
    );

    console.log({
      userId,
      email: googleAccount.email,
      hasAccessToken: Boolean(tokens.access_token),
      hasRefreshToken: Boolean(tokens.refresh_token),
      expiryDate: tokens.expiry_date || null,
    });

    // --------------------------------------------------------
    // CLEAR OAUTH STATE COOKIE
    // --------------------------------------------------------

    res.clearCookie("gmail_oauth_state", {
      httpOnly: true,

      secure: process.env.NODE_ENV === "production",

      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",

      path: "/",
    });

    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,

      message: "Gmail authorization successful.",

      connected: true,

      email: googleAccount.email,
    });
  } catch (error) {
    console.error("GMAIL CALLBACK ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gmail authorization failed.",
    });
  }
};

// ============================================================
// GET INDIVIDUAL GMAIL MESSAGE
// ============================================================

export const getGmailMessageController = async (req, res) => {
  try {
    // --------------------------------------------------------
    // GET AUTHENTICATED ELIRA USER
    // --------------------------------------------------------

    const userId = req.user.id;

    // --------------------------------------------------------
    // GET MESSAGE ID
    // --------------------------------------------------------

    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: "Message ID is required.",
      });
    }

    // --------------------------------------------------------
    // FIND GMAIL CONNECTION
    // --------------------------------------------------------

    const gmailConnection = await GmailConnection.findOne({
      userId,
    });

    if (!gmailConnection) {
      return res.status(404).json({
        success: false,
        message: "Gmail account is not connected.",
      });
    }

    // --------------------------------------------------------
    // GET MESSAGE
    // --------------------------------------------------------

    const email = await getGmailMessage({
      gmailConnection,
      messageId,
    });

    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      email,
    });
  } catch (error) {
    console.error("GET GMAIL MESSAGE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve Gmail message.",
    });
  }
};

// ============================================================
// GET GMAIL MESSAGES
// ============================================================

export const getGmailMessagesController = async (req, res) => {
  try {
    const userId = req.user.id;

    const gmailConnection = await GmailConnection.findOne({
      userId,
    });

    if (!gmailConnection) {
      return res.status(404).json({
        success: false,
        message: "Gmail account is not connected.",
      });
    }

    const { maxResults, pageToken } = req.query;

    const data = await getGmailMessages({
      gmailConnection,
      maxResults: maxResults ? Number(maxResults) : 20,
      pageToken,
    });

    return res.status(200).json({
      success: true,
      messages: data.messages || [],
      nextPageToken: data.nextPageToken || null,
      resultSizeEstimate: data.resultSizeEstimate || 0,
    });
  } catch (error) {
    console.error("GET GMAIL MESSAGES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve Gmail messages.",
    });
  }
};
// ============================================================
// GET GMAIL INBOX PREVIEW
// ============================================================

export const getGmailInboxPreviewController = async (
  req,
  res
) => {
  try {

    // --------------------------------------------------------
    // GET AUTHENTICATED ELIRA USER
    // --------------------------------------------------------

    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required.",
      });
    }

    // --------------------------------------------------------
    // FIND GMAIL CONNECTION
    // --------------------------------------------------------

    const gmailConnection =
      await GmailConnection.findOne({
        userId,
      });

    if (!gmailConnection) {
      return res.status(404).json({
        success: false,
        message: "Gmail account is not connected.",
      });
    }

    // --------------------------------------------------------
    // LIMIT PREVIEW SIZE
    // --------------------------------------------------------

    let maxResults =
      Number(req.query.limit) || 5;

    // Never allow huge inbox requests.
    maxResults = Math.min(
      Math.max(maxResults, 1),
      10
    );

    // --------------------------------------------------------
    // GET COMPACT INBOX
    // --------------------------------------------------------

    const preview =
      await getGmailInboxPreview({
        gmailConnection,
        maxResults,
      });

    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,

      count:
        preview.emails.length,

      emails:
        preview.emails,

      nextPageToken:
        preview.nextPageToken,
    });

  } catch (error) {

    console.error(
      "GMAIL INBOX PREVIEW ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve Gmail inbox preview.",
    });
  }
};
// ============================================================
// READ LATEST GMAIL
// ============================================================

export const readLatestGmailController = async (req, res) => {
  try {
    // --------------------------------------------------------
    // GET AUTHENTICATED USER
    // --------------------------------------------------------

    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required.",
      });
    }

    // --------------------------------------------------------
    // FIND GMAIL CONNECTION
    // --------------------------------------------------------

    const gmailConnection = await GmailConnection.findOne({
      userId,
    });

    if (!gmailConnection) {
      return res.status(404).json({
        success: false,
        message: "Gmail account is not connected.",
      });
    }

    // --------------------------------------------------------
    // GET LATEST EMAIL
    // --------------------------------------------------------

    const messages = await getGmailMessages({
      gmailConnection,
      maxResults: 1,
    });

    const latestMessage = messages.messages?.[0];

    if (!latestMessage) {
      return res.status(404).json({
        success: false,
        message: "No emails were found in the inbox.",
      });
    }

    // --------------------------------------------------------
    // GET FULL EMAIL
    // --------------------------------------------------------

    const email = await getGmailMessage({
      gmailConnection,
      messageId: latestMessage.id,
    });

    // --------------------------------------------------------
    // CHOOSE READABLE BODY
    // --------------------------------------------------------

    let body = email.text || "";

    if (!body && email.html) {
      body = email.html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/\s+/g, " ")
        .trim();
    }

    // --------------------------------------------------------
    // RETURN EMAIL FOR ELIRA
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,

      email: {
        id: email.id,
        from: email.from,
        to: email.to,
        subject: email.subject,
        date: email.date,
        body,
      },
    });

  } catch (error) {
    console.error(
      "READ LATEST GMAIL ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to read latest Gmail message.",
    });
  }
};