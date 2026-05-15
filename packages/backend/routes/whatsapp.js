const express = require("express");
const router = express.Router();
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const db = require("../db/init");

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

router.post("/webhook", express.json(), async (req, res) => {
  res.sendStatus(200);
  const parsed = parseIncoming(req.body);
  if (!parsed) return;

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
  }

  // Step 5 - save messages
  saveMessage(lead.id, parsed.text, "inbound");
  saveMessage(lead.id, reply, "outbound");

  // Step 6 - send reply
  await sendMessage(parsed.from, reply);
});

function parseIncoming(body) {
  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];
  if (!message) return null;

  return {
    from: message.from,            // phone number
    text: message.text?.body,      // text content
    timestamp: message.timestamp,
    messageId: message.id,
  };
}

const STATES = {
  GREETING: "greeting",
  AWAITING_NAME: "awaiting_name",
  AWAITING_EMAIL: "awaiting_email",
  AWAITING_INQUIRY: "awaiting_inquiry",
  DONE: "done",
};

const sessions = new Map(); // phone -> { state, data }

function handleMessage({ from, text, session: sessionFromDB  }) {
  let session = sessions.get(from) || sessionFromDB || { state: STATES.GREETING, data: {} };
  if (session.state === STATES.GREETING) {
    session.state = STATES.AWAITING_NAME;
    sessions.set(from, session);
    return "Karibu! What is your full name?";
  }
  if (session.state === STATES.AWAITING_NAME) {
    session.data.name = text;
    session.state = STATES.AWAITING_EMAIL;
    sessions.set(from, session);
    return `Asante ${text}. What is your email?`;
  }
  if (session.state === STATES.AWAITING_EMAIL) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(text)) {
        return "That doesn't look like a valid email. Please try again.";
  }
  session.data.email = text;
  session.state = STATES.AWAITING_INQUIRY;
  sessions.set(from, session);
  return "What are you interested in?";
}
  if (session.state === STATES.AWAITING_INQUIRY) {
    session.data.inquiry = text;
    session.state = STATES.DONE;
    sessions.set(from, session);
    // TODO: persist to DB tomorrow
    return "Thank you. An agent will be in touch shortly.";
  }
  return "You are all set. Dial again any time.";
}



async function sendMessage(to, text) {
  await axios.post(
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
}

function findOrCreateLead(phone) {
  let lead = db.prepare("SELECT * FROM leads WHERE wa_phone = ?").get(phone);
  if (!lead) {
    db.prepare("INSERT INTO leads (id, wa_phone) VALUES (?, ?)").run(uuidv4(), phone);
    lead = db.prepare("SELECT * FROM leads WHERE wa_phone = ?").get(phone);
  }
  return lead;
}

function loadConversation(leadId) {
  const convo = db.prepare("SELECT * FROM conversations WHERE lead_id = ?").get(leadId);
  if (!convo) {
    return { state: STATES.GREETING, data: {} };
  }
  return {
    state: convo.state,
    data: JSON.parse(convo.data || "{}"),
  };
}

function saveConversation(leadId, state, data) {
  const existing = db.prepare("SELECT * FROM conversations WHERE lead_id = ?").get(leadId);
    if (!existing) {
    db.prepare("INSERT INTO conversations (id, lead_id, state, data, updated_at) VALUES (?, ?, ?, ?, datetime('now'))").run(uuidv4(), leadId, state, JSON.stringify(data));
  } else {
    db.prepare("UPDATE conversations SET state = ?, data = ?, updated_at = datetime('now') WHERE lead_id = ?").run(state, JSON.stringify(data), leadId);
  }
}

function saveMessage(leadId, body, direction) {
  db.prepare("INSERT INTO messages (id, lead_id, direction, body, created_at) VALUES (?, ?, ?, ?, datetime('now'))").run(uuidv4(), leadId, direction, body);
}
module.exports = router;