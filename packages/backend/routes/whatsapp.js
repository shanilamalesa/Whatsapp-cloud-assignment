const express = require("express");
const router = express.Router();

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

router.post("/webhook", express.json(), (req, res) => {
  console.log("Incoming WhatsApp update:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

module.exports = router;