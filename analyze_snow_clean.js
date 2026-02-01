const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/data/chicago_weather_v86.csv');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');
const ytdSeasons = {};

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    const dateStr = parts[0];
    const snowStr = parts[5];
    if (!dateStr || !snowStr) continue;
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    let seasonKey = month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    let snowVal = parseFloat(snowStr) || 0;
    if (month >= 7 || month === 1) { // Up to End of Jan
        if (!ytdSeasons[seasonKey]) ytdSeasons[seasonKey] = 0;
        ytdSeasons[seasonKey] += snowVal;
    }
}

const ytdArray = Object.keys(ytdSeasons).map(key => ({ season: key, totalSnow: ytdSeasons[key] }));
ytdArray.sort((a, b) => b.totalSnow - a.totalSnow);

console.log("RANK | SEASON | SNOW (in)");
ytdArray.slice(0, 15).forEach((s, idx) => {
    console.log(`#${idx + 1} | ${s.season} | ${s.totalSnow.toFixed(1)}`);
});

const current = ytdArray.find(s => s.season === '2025-2026');
const rank = ytdArray.findIndex(s => s.season === '2025-2026') + 1;
console.log(`\nCurrent: #${rank} | 2025-2026 | ${current ? current.totalSnow.toFixed(1) : 0}`);
