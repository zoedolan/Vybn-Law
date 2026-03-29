const express = require("express");
const path = require("path");
const app = express();

app.use(express.static(".", { extensions: ["html"] }));

// Fallback to index.html for SPA-like routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(5000, "0.0.0.0", () => console.log("Vybn Law running on port 5000"));
