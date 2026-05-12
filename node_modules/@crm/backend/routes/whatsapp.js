const express = require("express");
const router = express.Router();
const axios = require("axios");
const db = require("../db/init");
const { v4: uuidv4 } = require("uuid");

const STATES = {
  GREETING: "greeting",
  AWAITING_NAME: "awaiting_name",
  AWAITING_EMAIL: "awaiting_email",
  AWAITING_INQUIRY: "awaiting_inquiry",
  DONE: "done",
};

const sessions = new Map();
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

function getSession(from) {
  const session = sessions.get(from);
  if (!session) return { state: STATES.GREETING, data: {} };

  const now = Date.now();
  if (now - session.lastActivity > TIMEOUT_MS) {
    sessions.delete(from);
    return { state: STATES.GREETING, data: {} };
  }

  return session;
}

function handleMessage({ from, text, session }) {
  let currentSession = session || getSession(from);

  if (text.toLowerCase() === "restart") {
    sessions.delete(from);
    const lead = findOrCreateLead(from);
    db.prepare("DELETE FROM conversations WHERE lead_id = ?").run(lead.id);
    return "Conversation restarted. Karibu! What is your full name?";
  }

  if (currentSession.state === STATES.GREETING) {
    currentSession.state = STATES.AWAITING_NAME;
    currentSession.lastActivity = Date.now();
    sessions.set(from, currentSession);
    return "Karibu! What is your full name?";
  }
  if (currentSession.state === STATES.AWAITING_NAME) {
    currentSession.data.name = text;
    currentSession.state = STATES.AWAITING_EMAIL;
    currentSession.lastActivity = Date.now();
    sessions.set(from, currentSession);
    return `Asante ${text}. What is your email?`;
  }
  if (currentSession.state === STATES.AWAITING_EMAIL) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(text)) {
      return "That doesn't look like a valid email. Please try again.";
    }
    currentSession.data.email = text;
    currentSession.state = STATES.AWAITING_INQUIRY;
    currentSession.lastActivity = Date.now();
    sessions.set(from, currentSession);
    return "What are you interested in?";
  }
  if (currentSession.state === STATES.AWAITING_INQUIRY) {
    currentSession.data.inquiry = text;
    currentSession.state = STATES.DONE;
    currentSession.lastActivity = Date.now();
    sessions.set(from, currentSession);
    return "Thank you. An agent will be in touch shortly.";
  }
  return "You are all set. Dial again any time.";
}

function findOrCreateLead(phone) {
  let lead = db.prepare(
    "SELECT * FROM leads WHERE wa_phone = ?"
  ).get(phone);

  if (!lead) {
    const id = uuidv4();
    db.prepare(
      "INSERT INTO leads (id, wa_phone) VALUES (?, ?)"
    ).run(id, phone);
    lead = db.prepare(
      "SELECT * FROM leads WHERE wa_phone = ?"
    ).get(phone);
  }

  return lead;
}

function loadConversation(leadId) {
  let conversation = db.prepare(
    "SELECT * FROM conversations WHERE lead_id = ?"
  ).get(leadId);

  if (!conversation) {
    return { state: STATES.GREETING, data: {} };
  }

  return {
    state: conversation.state,
    data: JSON.parse(conversation.data || "{}"),
  };
}

function saveConversation(leadId, state, data) {
  const existing = db.prepare(
    "SELECT * FROM conversations WHERE lead_id = ?"
  ).get(leadId);

  if (!existing) {
    db.prepare(
      "INSERT INTO conversations (id, lead_id, state, data, updated_at) VALUES (?, ?, ?, ?, datetime('now'))"
    ).run(uuidv4(), leadId, state, JSON.stringify(data));
  } else {
    db.prepare(
      "UPDATE conversations SET state = ?, data = ?, updated_at = datetime('now') WHERE lead_id = ?"
    ).run(state, JSON.stringify(data), leadId);
  }
}

function saveMessage(leadId, body, direction) {
  db.prepare(
    "INSERT INTO messages (id, lead_id, direction, body, created_at) VALUES (?, ?, ?, ?, datetime('now'))"
  ).run(uuidv4(), leadId, direction, body);
}

function updateLead(leadId, data) {
  if (data.name) {
    db.prepare("UPDATE leads SET name = ?, updated_at = datetime('now') WHERE id = ?")
      .run(data.name, leadId);
  }
  if (data.email) {
    db.prepare("UPDATE leads SET email = ?, updated_at = datetime('now') WHERE id = ?")
      .run(data.email, leadId);
  }
  if (data.inquiry) {
    db.prepare("UPDATE leads SET inquiry_type = ?, updated_at = datetime('now') WHERE id = ?")
      .run(data.inquiry, leadId);
  }
}

async function sendMessage(to, text) {
  console.log("Sending to:", to);
  console.log("Using Phone ID:", process.env.META_PHONE_NUMBER_ID);
  const response = await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      text: { body: text },
    },
    {
      headers: { Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}` },
    }
  );
  console.log("Meta response:", JSON.stringify(response.data));
}

router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

router.post("/webhook", async (req, res) => {
  const entry = req.body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];

  if (!message) return res.sendStatus(200);

  const parsed = {
    from: message.from,
    text: message.text?.body,
    timestamp: message.timestamp,
    messageId: message.id,
  };

  console.log("Parsed message:", parsed);

  // Step 1 - find or create lead
  const lead = findOrCreateLead(parsed.from);

  // Step 2 - load conversation state from DB
  const session = loadConversation(lead.id);

  // Step 3 - advance state machine
  const reply = handleMessage({ from: parsed.from, text: parsed.text, session });

  // Step 4 - save conversation back to DB
  const updatedSession = sessions.get(parsed.from);
  if (updatedSession) {
    saveConversation(lead.id, updatedSession.state, updatedSession.data);
    updateLead(lead.id, updatedSession.data);
  }

  // Step 5 - save messages to DB
  saveMessage(lead.id, parsed.text, "inbound");
  saveMessage(lead.id, reply, "outbound");

  try {
    await sendMessage(parsed.from, reply);
    console.log("Reply sent:", reply);
  } catch (err) {
    console.error("Send failed:", err.response?.data || err.message);
  }

  res.sendStatus(200);
});

module.exports = router;