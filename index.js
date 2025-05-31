const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

const apiUrl = "https://roobetconnect.com/affiliate/v2/stats";
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI2YWU0ODdiLTU3MDYtNGE3ZS04YTY5LTMzYThhOWM5NjMxYiIsIm5vbmNlIjoiZWI2MzYyMWUtMTMwZi00ZTE0LTlmOWMtOTY3MGNiZGFmN2RiIiwic2VydmljZSI6ImFmZmlsaWF0ZVN0YXRzIiwiaWF0IjoxNzI3MjQ2NjY1fQ.rVG_QKMcycBEnzIFiAQuixfu6K_oEkAq2Y8Gukco3b8"; // your real key

let leaderboardCache = [];

// Format usernames
const formatUsername = (username) => {
  const firstTwo = username.slice(0, 2);
  const lastTwo = username.slice(-2);
  return `${firstTwo}***${lastTwo}`;
};

// Get monthly date range in UTC (start of month to last day at 15:00 UTC = 00:00 JST next day)
// Smart monthly range: if past this month's end, shift to next month
function getMonthlyDateRange() {
  const now = new Date();
  const currentUTC = now.getTime();

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  // End of this month at 15:00 UTC (00:00 JST on next month)
  const thisMonthEnd = Date.UTC(year, month + 1, 0, 15, 0, 0);

  let startDate, endDate;

  if (currentUTC < thisMonthEnd) {
    // We’re still inside this month’s window
    startDate = new Date(Date.UTC(year, month, 1, 15, 0, 0));  // 00:00 JST on 1st
    endDate = new Date(thisMonthEnd);                          // 15:00 UTC on last day
  } else {
    // We've passed this month’s period → shift to next month
    startDate = new Date(Date.UTC(year, month + 1, 1, 15, 0, 0));  // 00:00 JST on 1st of next month
    endDate = new Date(Date.UTC(year, month + 2, 0, 15, 0, 0));    // 15:00 UTC on last day of next month
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}


// Fetch leaderboard data
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

    console.log("Leaderboard updated:", leaderboardCache.length, "entries");
  } catch (error) {
    console.error("Error fetching leaderboard data:", error.message);
  }
}

// Routes
app.get("/", (req, res) => {
  res.send("Welcome to the Leaderboard API. Access /leaderboard or /leaderboard/top14");
});

app.get("/leaderboard", (req, res) => {
  res.json(leaderboardCache);
});

app.get("/leaderboard/top14", (req, res) => {
  const top14 = leaderboardCache.slice(0, 10);
  res.json(top14);
});

// Initial fetch + update every 5 mins
fetchLeaderboardData();
setInterval(fetchLeaderboardData, 5 * 60 * 1000);

// Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// Self-ping every 4 minutes (keep Render alive)
setInterval(() => {
  axios.get("https://azisailbdata.onrender.com/leaderboard/top14")
    .then(() => console.log("Self-ping successful."))
    .catch((err) => console.error("Self-ping failed:", err.message));
}, 4 * 60 * 1000);
