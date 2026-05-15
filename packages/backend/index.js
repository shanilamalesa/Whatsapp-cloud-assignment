const express = require("express");
const cors = require("cors");
require("dotenv").config();

console.log("VERIFY TOKEN:", process.env.META_VERIFY_TOKEN);
const app = express();
const whatsappRoutes = require("./routes/whatsapp");
app.use(cors());
app.use("/whatsapp", whatsappRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>{
  console.log(`Server running on port ${PORT}`);
});