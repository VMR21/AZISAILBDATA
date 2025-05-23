const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 5000;

// Use CORS middleware
app.use(cors());

// API details
const apiUrl = "https://roobetconnect.com/affiliate/v2/stats";
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI2YWU0ODdiLTU3MDYtNGE3ZS04YTY5LTMzYThhOWM5NjMxYiIsIm5vbmNlIjoiZWI2MzYyMWUtMTMwZi00ZTE0LTlmOWMtOTY3MGNiZGFmN2RiIiwic2VydmljZSI6ImFmZmlsaWF0ZVN0YXRzIiwiaWF0IjoxNzI3MjQ2NjY1fQ.rVG_QKMcycBEnzIFiAQuixfu6K_oEkAq2Y8Gukco3b8"; // Replace with your actual API key

let leaderboardCache = [];

// Function to format usernames
const formatUsername = (username) => {
    const firstTwo = username.slice(0, 2);
    const lastTwo = username.slice(-2);
    return `${firstTwo}***${lastTwo}`;
};

// Function to fetch and process leaderboard data
async function fetchLeaderboardData() {
    try {
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            params: {
                userId: "26ae487b-5706-4a7e-8a69-33a8a9c9631b", // Replace with your
                startDate: "2025-04-30T15:00:00Z",
                endDate: "2025-05-31T15:00:00",
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

        console.log("Leaderboard updated:", leaderboardCache);
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



// Fetch leaderboard data initially and every 5 minutes
fetchLeaderboardData();
setInterval(fetchLeaderboardData, 5 * 60 * 1000);

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// Self-ping every 4 minutes
setInterval(() => {
    axios.get("https://azisailbdata.onrender.com/leaderboard/top14") // Replace this with your actual deployed URL after uploading
        .then(() => console.log("Self-ping successful."))
        .catch((err) => console.error("Self-ping failed:", err.message));
}, 4 * 60 * 1000);
