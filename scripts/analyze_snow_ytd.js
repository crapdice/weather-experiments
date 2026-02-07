const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/data/chicago_weather_v86.csv');
const fileContent = fs.readFileSync(filePath, 'utf8');
const lines = fileContent.split('\n');

const seasons = {};
const ytdSeasons = {}; // Through Jan 31

// Skip header
for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Columns: Date, Max, Min, Avg, Precip, Snow, ...
    const parts = line.split(',');
    const dateStr = parts[0];
    const snowStr = parts[5];

    if (!dateStr || !snowStr) continue;

    const date = new Date(dateStr);
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();
    const year = date.getFullYear();

    let seasonKey = '';
    if (month >= 7) {
        seasonKey = `${year}-${year + 1}`;
    } else {
        seasonKey = `${year - 1}-${year}`;
    }

    let snowVal = parseFloat(snowStr);
    if (isNaN(snowVal)) snowVal = 0;

    if (!seasons[seasonKey]) seasons[seasonKey] = 0;
    seasons[seasonKey] += snowVal;

    // YTD Calculation: Include only if date is before or on Jan 31 of the second year of season
    // i.e., Month >= 7 OR (Month == 1)
    // Actually, simpler: Determine 'day of season'. 
    // Jan 31 is roughly day 215 of the season (July 1 start).
    // Or just check Month/Day explicitly.
    // If month is 7,8,9,10,11,12 OR month is 1. 
    // Wait, Feb is NOT included for Jan 31 YTD.

    if (month >= 7 || month === 1) {
        if (!ytdSeasons[seasonKey]) ytdSeasons[seasonKey] = 0;
        ytdSeasons[seasonKey] += snowVal;
    }
}

const ytdArray = Object.keys(ytdSeasons).map(key => ({
    season: key,
    totalSnow: ytdSeasons[key]
}));

ytdArray.sort((a, b) => b.totalSnow - a.totalSnow);

console.log("Top 10 Snowiest Seasons Through Jan 31 (1940-2026):");
ytdArray.slice(0, 10).forEach((s, idx) => {
    console.log(`${idx + 1}. ${s.season}: ${s.totalSnow.toFixed(1)} inches`);
});

const currentSeason = '2025-2026';
const currentStats = ytdArray.find(s => s.season === currentSeason);
const currentRank = ytdArray.findIndex(s => s.season === currentSeason) + 1;

console.log(`\nCurrent Season (${currentSeason}) Through Jan 31:`);
if (currentStats) {
    console.log(`Total Snow: ${currentStats.totalSnow.toFixed(1)} inches`);
    console.log(`Rank: #${currentRank} out of ${ytdArray.length} recorded seasons`);
} else {
    console.log("No data for current season.");
}
