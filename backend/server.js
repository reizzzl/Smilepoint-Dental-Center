
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Test backend connection
app.get("/", (req, res) => {
  res.json({
    message: "Smilepoint Dental Center Backend is running",
    status: "success",
  });
});

// Backend health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    system: "Smilepoint Dental Center",
  });
});

app.listen(PORT, () => {
  console.log(`Smilepoint backend running on http://localhost:${PORT}`);
});
