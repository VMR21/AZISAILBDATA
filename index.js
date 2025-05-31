const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all origins
app.use(cors());

// Roobet API details
const apiUrl = "https://roobetconnect.com/affiliate/v2/stats";
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI2YWU0ODdiLTU3MDYtNGE3ZS04YTY5LTMzYThhOWM5NjMxYiIsIm5vbmNlIjoiZWI2MzYyMWUtMTMwZi00ZTE0LTlmOWMtOTY3MGNiZGFmN2RiIiwic2VydmljZSI6ImFmZmlsaWF0ZVN0YXRzIiwiaWF0IjoxNzI3MjQ2NjY1fQ.rVG_QKMcycBEnzIFiAQuixfu6K_oEkAq2Y8Gukco3b8"; // Replace with your real key

let leaderboardCache = [];

// Format usernames like ab***yz
const formatUsername = (username) => {
  const firstTwo = username.slice(0, 2);
  const lastTwo = username.slice(-2);
  return `${firstTwo}***${lastTwo}`;
};

// Get correct raffle period range (from 00:00 JST on 1st to 00:00 JST next month)
// Adjusted based on UTC (JST is +9 hours → UTC 15:00 = JST 00:00)
function getMonthlyDateRange() {
  const now = new Date();
  const currentUTC = now.getTime();

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  // Target: next month's 0th day at 15:01 UTC == 00:01 JST
  const nextMonthStartCutoff = Date.UTC(year, month + 1, 0, 15, 1, 0);

  let startDate, endDate;

  if (currentUTC < nextMonthStartCutoff) {
    // Still within this month’s raffle
    startDate = new Date(Date.UTC(year, month, 1, 15, 0, 0));        // 00:00 JST on 1st
    endDate   = new Date(Date.UTC(year, month + 1, 0, 15, 0, 0));    // 00:00 JST on next month start
  } else {
    // After next month rollover → switch to next month
    startDate = new Date(Date.UTC(year, month + 1, 1, 15, 0, 0));
    endDate   = new Date(Date.UTC(year, month + 2, 0, 15, 0, 0));
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

// Fetch and cache leaderboard
async function fetchLeaderboardData() {
  try {
    const { startDate, endDate } = getMonthlyDateRange();

    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      params: {
        userId: "26ae487b-5706-4a7e-8a69-33a8a9c9631b",
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

    console.log(
      `[${new Date().toISOString()}] Leaderboard updated: ${leaderboardCache.length} entries`
    );
  } catch (error) {
    console.error("Error fetching leaderboard data:", error.message);
  }
}

// Routes
app.get("/", (req, res) => {
  res.send("🎰 Roobet Leaderboard API Live! Use /leaderboard or /leaderboard/top14");
});

app.get("/leaderboard", (req, res) => {
  res.json(leaderboardCache);
});

app.get("/leaderboard/top14", (req, res) => {
  const top14 = leaderboardCache.slice(0, 14);
  res.json(top14);
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// First fetch immediately
fetchLeaderboardData();

// Update leaderboard every 5 minutes
setInterval(fetchLeaderboardData, 5 * 60 * 1000);

// Self-ping to keep Render alive every 4 minutes
setInterval(() => {
  axios
    .get("https://azisailbdata.onrender.com/leaderboard/top14")
    .then(() => console.log("🔁 Self-ping successful"))
    .catch((err) => console.error("❌ Self-ping failed:", err.message));
}, 4 * 60 * 1000);
