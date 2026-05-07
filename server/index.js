// const whatsappRoutes = require("./routes/whatsapp");
// app.use("/whatsapp", whatsappRoutes);

require("dotenv").config();
const express = require("express");
const app = express();
const crypto = require("crypto");

function verifySignature(req, res, buf) {
  const signature = req.headers["x-hub-signature-256"];
  if (!signature) {
    throw new Error("No signature");
  }
  const expected = "sha256=" + crypto
    .createHmac("sha256", process.env.META_APP_SECRET)
    .update(buf)
    .digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid signature");
  }
}

const whatsappRoutes = require("./routes/whatsapp");

app.use("/whatsapp/webhook", (req, res, next) => {
  if (req.method === "POST") {
    express.json({ verify: verifySignature })(req, res, next);
  } else {
    next();
  }
});

app.use("/whatsapp", whatsappRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});