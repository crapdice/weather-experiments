const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/data/chicago_weather_v86.csv');
const fileContent = fs.readFileSync(filePath, 'utf8');
const lines = fileContent.split('\n');

const seasons = {};

// Skip header
for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Columns: Date, Max, Min, Avg, Precip, Snow, ...
    // Snow is index 5
    const parts = line.split(',');
    const dateStr = parts[0];
    const snowStr = parts[5];

    if (!dateStr || !snowStr) continue;

    const date = new Date(dateStr);
    const month = date.getMonth() + 1; // 1-12
    const year = date.getFullYear();

    let seasonKey = '';
    // Season definitions: 
    // July 1st of Year X to June 30th of Year X+1 is "Season X-X+1"
    // E.g. Dec 2025 is in Season 2025-2026
    // E.g. Jan 2026 is in Season 2025-2026

    if (month >= 7) {
        seasonKey = `${year}-${year + 1}`;
    } else {
        seasonKey = `${year - 1}-${year}`;
    }

    let snowVal = parseFloat(snowStr);
    if (isNaN(snowVal)) {
        // Handle Trace or empty? Usually trace is T, empty is ,
        // The file shows 0 for no snow, so we assume numeric.
        // If 'T' or similar, strict parseFloat is needed or just treat as 0.
        // For 'T', let's assume 0 for accumulation stats.
        snowVal = 0;
    }

    if (!seasons[seasonKey]) {
        seasons[seasonKey] = 0;
    }
    seasons[seasonKey] += snowVal;
}

const seasonArray = Object.keys(seasons).map(key => ({
    season: key,
    totalSnow: seasons[key]
}));

// Sort by total snow descending
seasonArray.sort((a, b) => b.totalSnow - a.totalSnow);

console.log("Top 10 Snowiest Seasons in Chicago (1940-2026):");
seasonArray.slice(0, 10).forEach((s, idx) => {
    console.log(`${idx + 1}. ${s.season}: ${s.totalSnow.toFixed(1)} inches`);
});

// Find current season rank
const currentSeason = '2025-2026';
const currentStats = seasonArray.find(s => s.season === currentSeason);
const currentRank = seasonArray.findIndex(s => s.season === currentSeason) + 1;

console.log(`\nCurrent Season (${currentSeason}) So Far:`);
if (currentStats) {
    console.log(`Total Snow: ${currentStats.totalSnow.toFixed(1)} inches`);
    console.log(`Rank: #${currentRank} out of ${seasonArray.length} recorded seasons`);
} else {
    console.log("No data for current season.");
}
