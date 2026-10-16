const express = require("express");
const path = require("path");
const app = require("./backend/server");

app.use(express.static(path.join(__dirname, "public")));

const PORT = Number(process.env.PORT) || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Site e API disponíveis em http://localhost:${PORT}`);
  });
}

module.exports = app;