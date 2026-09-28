import { google } from "googleapis";

const gmailOAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_GMAIL_CLIENT_ID,
  process.env.GOOGLE_GMAIL_CLIENT_SECRET,
  process.env.GOOGLE_GMAIL_REDIRECT_URI,
);

// ============================================================
// GOOGLE AUTHORIZATION URL
// ============================================================

export const getGmailAuthorizationUrl = (state) => {
  return gmailOAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,

    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
    ],

    state,
  });
};

// ============================================================
// EXCHANGE CODE FOR TOKENS
// ============================================================

export const exchangeGmailCode = async (code) => {
  const { tokens } = await gmailOAuth2Client.getToken(code);

  return tokens;
};

// ============================================================
// GET GMAIL CLIENT
// ============================================================

export const getGmailClient = (tokens) => {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_GMAIL_CLIENT_ID,
    process.env.GOOGLE_GMAIL_CLIENT_SECRET,
    process.env.GOOGLE_GMAIL_REDIRECT_URI,
  );

  client.setCredentials(tokens);

  return google.gmail({
    version: "v1",
    auth: client,
  });
};

// Refresh Login Helper

export const getValidGmailClient = async (gmailConnection) => {
  const FIVE_MINUTES = 5 * 60 * 1000;

  if (gmailConnection.expiryDate.getTime() - Date.now() > FIVE_MINUTES) {
    return getGmailClient({
      access_token: gmailConnection.accessToken,
      refresh_token: gmailConnection.refreshToken,
    });
  }

  // refresh token
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_GMAIL_CLIENT_ID,
    process.env.GOOGLE_GMAIL_CLIENT_SECRET,
    process.env.GOOGLE_GMAIL_REDIRECT_URI,
  );

  client.setCredentials({
    refresh_token: gmailConnection.refreshToken,
  });

  const { credentials } = await client.refreshAccessToken();

  // update connection
  gmailConnection.accessToken = credentials.access_token;
  gmailConnection.expiryDate = credentials.expiry_date
    ? new Date(credentials.expiry_date)
    : null;

  await gmailConnection.save();

  return getGmailClient({
    access_token: gmailConnection.accessToken,
    refresh_token: gmailConnection.refreshToken,
  });
};

// ============================================================
// GET GOOGLE ACCOUNT
// ============================================================

export const getGoogleAccount = async (tokens) => {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_GMAIL_CLIENT_ID,
    process.env.GOOGLE_GMAIL_CLIENT_SECRET,
    process.env.GOOGLE_GMAIL_REDIRECT_URI,
  );

  client.setCredentials(tokens);

  const oauth2 = google.oauth2({
    version: "v2",
    auth: client,
  });

  const { data } = await oauth2.userinfo.get();

  return data;
};

// ============================================================
// SEND GMAIL
// ============================================================

export const sendGmail = async ({
  gmailConnection,
  to,
  subject,
  message,
}) => {
  const gmail = await getValidGmailClient(gmailConnection);

  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    message,
  ].join("\r\n");

  const encodedMessage = Buffer.from(email)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await gmail.users.messages.send({
    userId: "me",

    requestBody: {
      raw: encodedMessage,
    },
  });

  return response.data;
};


// ============================================================
// GET INDIVIDUAL GMAIL MESSAGE
// ============================================================

export const getGmailMessage = async ({
  gmailConnection,
  messageId,
}) => {
  const gmail = await getValidGmailClient(gmailConnection);

  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const message = response.data;

  const headers = message.payload?.headers || [];

  const { text, html } = extractEmailBody(
    message.payload
  );

  return {
    id: message.id,
    threadId: message.threadId,

    from: getHeader(headers, "From"),
    to: getHeader(headers, "To"),
    cc: getHeader(headers, "Cc"),
    bcc: getHeader(headers, "Bcc"),

    subject: getHeader(headers, "Subject"),
    date: getHeader(headers, "Date"),
    messageId: getHeader(headers, "Message-ID"),

    snippet: message.snippet || "",

    text,
    html,

    labels: message.labelIds || [],

    internalDate: message.internalDate
      ? new Date(Number(message.internalDate))
      : null,
  };
};

// ============================================================
// GET GMAIL MESSAGES
// ============================================================

export const getGmailMessages = async ({
  gmailConnection,
  maxResults = 20,
  pageToken,
}) => {
  const gmail = await getValidGmailClient(gmailConnection);

  const response = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    pageToken,
    labelIds: ["INBOX"],
  });

  return response.data;
};

// ============================================================
// DECODE GMAIL BASE64URL DATA
// ============================================================

const decodeBase64Url = (data) => {
  if (!data) return "";

  return Buffer.from(
    data.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  ).toString("utf-8");
};

// ============================================================
// EXTRACT EMAIL BODY
// ============================================================

const extractEmailBody = (payload) => {
  if (!payload) {
    return {
      text: "",
      html: "",
    };
  }

  // ----------------------------------------------------------
  // DIRECT BODY
  // ----------------------------------------------------------

  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);

    if (payload.mimeType === "text/html") {
      return {
        text: "",
        html: decoded,
      };
    }

    if (payload.mimeType === "text/plain") {
      return {
        text: decoded,
        html: "",
      };
    }
  }

  // ----------------------------------------------------------
  // MULTIPART BODY
  // ----------------------------------------------------------

  let text = "";
  let html = "";

  if (payload.parts?.length) {
    for (const part of payload.parts) {
      const result = extractEmailBody(part);

      if (!text && result.text) {
        text = result.text;
      }

      if (!html && result.html) {
        html = result.html;
      }

      if (text && html) {
        break;
      }
    }
  }

  return {
    text,
    html,
  };
};

// ============================================================
// GET HEADER
// ============================================================

const getHeader = (headers, name) => {
  const header = headers?.find(
    (header) =>
      header.name.toLowerCase() === name.toLowerCase()
  );

  return header?.value || "";
};
// ============================================================
// GET GMAIL INBOX PREVIEW
// ============================================================

export const getGmailInboxPreview = async ({
  gmailConnection,
  maxResults = 5,
}) => {
  const gmail = await getValidGmailClient(gmailConnection);

  // ----------------------------------------------------------
  // GET ONLY MESSAGE IDS
  // ----------------------------------------------------------

  const listResponse = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    labelIds: ["INBOX"],
  });

  const messages = listResponse.data.messages || [];

  // ----------------------------------------------------------
  // IF INBOX IS EMPTY
  // ----------------------------------------------------------

  if (!messages.length) {
    return {
      emails: [],
      nextPageToken: null,
    };
  }

  // ----------------------------------------------------------
  // FETCH ONLY THE INFORMATION WE NEED
  // ----------------------------------------------------------

  const emails = await Promise.all(
    messages.map(async (message) => {
      try {
        const response = await gmail.users.messages.get({
          userId: "me",
          id: message.id,

          // IMPORTANT:
          // We don't need attachments or huge raw payloads
          // for an inbox preview.
          format: "metadata",

          metadataHeaders: [
            "From",
            "To",
            "Subject",
            "Date",
          ],
        });

        const data = response.data;

        const headers = data.payload?.headers || [];

        return {
          id: data.id,

          threadId: data.threadId,

          from: getHeader(
            headers,
            "From"
          ),

          to: getHeader(
            headers,
            "To"
          ),

          subject: getHeader(
            headers,
            "Subject"
          ),

          date: getHeader(
            headers,
            "Date"
          ),

          snippet: data.snippet || "",

          labels: data.labelIds || [],

          unread: (
            data.labelIds || []
          ).includes("UNREAD"),
        };

      } catch (error) {

        console.error(
          `FAILED TO READ GMAIL MESSAGE ${message.id}:`,
          error.message
        );

        return null;
      }
    })
  );

  return {
    emails: emails.filter(Boolean),

    nextPageToken:
      listResponse.data.nextPageToken || null,
  };
};