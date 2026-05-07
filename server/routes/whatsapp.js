const express = require("express");
const router = express.Router();
const axios = require("axios");

const STATES = {
  GREETING: "greeting",
  AWAITING_NAME: "awaiting_name",
  AWAITING_EMAIL: "awaiting_email",
  AWAITING_INQUIRY: "awaiting_inquiry",
  DONE: "done",
};

const sessions = new Map();
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

function getSession(from){
    const session = session.get(from);
    if (!session) return {state: STATES.GREETING, data: {}};

    const now = Date.now();
    if (now - session.lastActivity > TIMEOUT_MS){
        session.delete(from);
        return { state: STATES.GREETING, data: {}};
    }
}

function handleMessage({ from, text }) {
  let session = getSession(from);

  if (text.toLowerCase() === "restart"){
    sessions.delete(from);
    return "Conversastion restarted. Karibu! What is your full name?";
  }

  if (session.state === STATES.GREETING) {
    session.state = STATES.AWAITING_NAME;
    session.lastActivity = Date.now();
    sessions.set(from, session);
    return "Karibu! What is your full name?";
  }
  if (session.state === STATES.AWAITING_NAME) {
    session.data.name = text;
    session.state = STATES.AWAITING_EMAIL;
    session.lastActivity = Date.now();
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
    session.lastActivity = Date.now();
    sessions.set(from, session);
    return "What are you interested in?";
  }
  if (session.state === STATES.AWAITING_INQUIRY) {
    session.data.inquiry = text;
    session.state = STATES.DONE;
    session.lastActivity = Date.now();
    sessions.set(from, session);
    return "Thank you. An agent will be in touch shortly.";
  }
  return "You are all set. Dial again any time.";
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

  const reply = handleMessage(parsed);
  try {
    await sendMessage(parsed.from, reply);
    console.log("Reply sent:", reply);
  } catch (err) {
    console.error("Send failed:", err.response?.data || err.message);
  }

  res.sendStatus(200);
});

module.exports = router;