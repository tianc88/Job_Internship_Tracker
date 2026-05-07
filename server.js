const express = require("express");
require("dotenv").config();

const app = express();
const PORT = 3000;

app.use(express.static("public"));

app.get("/api/jobs", async (req, res) => {
  try {
    const role = req.query.role || "software intern";
    const location = req.query.location || "New Mexico";

    const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=${encodeURIComponent(role)}&where=${encodeURIComponent(location)}&results_per_page=10`;

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(500).json({ error: "Adzuna API failed" });
    }

    const data = await response.json();

    res.json(data.results || []);
  } catch (error) {
    console.error("API ERROR:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});