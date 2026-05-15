const express = require("express");
const cors = require("cors");
require("dotenv").config();
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

const app = express();
const whatsappRoutes = require("./routes/whatsapp");
app.use(cors());

app.use("/whatsapp/webhook", express.json({ verify: verifySignature }));

app.use("/whatsapp", whatsappRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>{
  console.log(`Server running on port ${PORT}`);
});


