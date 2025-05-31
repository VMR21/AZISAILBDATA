const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

const apiUrl = "https://roobetconnect.com/affiliate/v2/stats";
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI2YWU0ODdiLTU3MDYtNGE3ZS04YTY5LTMzYThhOWM5NjMxYiIsIm5vbmNlIjoiZWI2MzYyMWUtMTMwZi00ZTE0LTlmOWMtOTY3MGNiZGFmN2RiIiwic2VydmljZSI6ImFmZmlsaWF0ZVN0YXRzIiwiaWF0IjoxNzI3MjQ2NjY1fQ.rVG_QKMcycBEnzIFiAQuixfu6K_oEkAq2Y8Gukco3b8"; // Replace this
const userId = "26ae487b-5706-4a7e-8a69-33a8a9c9631b"; // Replace if different

let leaderboardCache = [];

const formatUsername = (username) => {
  const firstTwo = username.slice(0, 2);
  const lastTwo = username.slice(-2);
  return `${firstTwo}***${lastTwo}`;
};

// JST-aware monthly raffle logic
function getMonthlyDateRange() {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth();

  const startDate = new Date(Date.UTC(year, month, 0, 15, 1, 0));   // Last day prev month 15:01 UTC
  const endDate = new Date(Date.UTC(year, month + 1, 0, 15, 0, 0)); // Last day curr month 15:00 UTC

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

async function fetchLeaderboardData() {
  try {
    const { startDate, endDate } = getMonthlyDateRange();

    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      params: {
        userId,
        startDate,
        endDate,
      },
    });

    const data = response.data;

    leaderboardCache = data
      .filter((player) => player.username !== "azisai205")
      .sort((a, b) => b.weightedWagered - a.weightedWagered)
      .slice(0, 100000)
      .map((player) => ({
        username: formatUsername(player.username),
        wagered: Math.round(player.weightedWagered),
        weightedWager: Math.round(player.weightedWagered),
      }));

    // 🔁 Swap 1st and 2nd
    if (leaderboardCache.length >= 2) {
      const temp = leaderboardCache[0];
      leaderboardCache[0] = leaderboardCache[1];
      leaderboardCache[1] = temp;
    }

    console.log(`[${new Date().toISOString()}] ✅ Leaderboard updated: ${leaderboardCache.length} entries`);
  } catch (error) {
    console.error("❌ Error fetching leaderboard data:", error.message);
  }
}

// API routes
app.get("/", (req, res) => {
  res.send("🎰 Roobet Leaderboard API Live! Use /leaderboard or /leaderboard/top14");
});

app.get("/leaderboard", (req, res) => {
  res.json(leaderboardCache);
});

app.get("/leaderboard/top14", (req, res) => {
  res.json(leaderboardCache.slice(0, 14));
});

app.get("/current-range", (req, res) => {
  const { startDate, endDate } = getMonthlyDateRange();
  res.json({ startDate, endDate });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// First fetch
fetchLeaderboardData();

// Update leaderboard every 5 minutes
setInterval(fetchLeaderboardData, 5 * 60 * 1000);

// Self-ping every 4 mins (Render)
setInterval(() => {
  axios
    .get("https://azisailbdata.onrender.com/leaderboard/top14")
    .then(() => console.log("🔁 Self-ping OK"))
    .catch((err) => console.error("❌ Self-ping failed:", err.message));
}, 4 * 60 * 1000);
