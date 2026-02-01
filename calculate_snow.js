const fs = require('fs');
const path = require('path');

const csvPath = path.join(process.cwd(), 'public', 'data', 'chicago_weather_v86.csv');
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n');
const headers = lines[0].split(',');

const dateIdx = headers.findIndex(h => h.includes('Date'));
const snowIdx = headers.findIndex(h => h.includes('Snowfall (in)'));

let totalSnow = 0;
let recordsInRange = 0;

// SNOW YEAR START: July 1st, 2025
const START_DATE = new Date('2025-07-01');

for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length <= Math.max(dateIdx, snowIdx)) continue;

    const dateStr = cols[dateIdx];
    const recordDate = new Date(dateStr);

    // Only count records from July 1, 2025 onwards
    if (recordDate >= START_DATE) {
        const snow = parseFloat(cols[snowIdx]);
        if (!isNaN(snow)) {
            totalSnow += snow;
            recordsInRange++;
        }
    }
}

console.log(`--- Canonical Snowfall Calculation ---`);
console.log(`Season: July 2025 - Present`);
console.log(`Total Snowfall: ${totalSnow.toFixed(2)} inches`);
console.log(`Computed from ${recordsInRange} days of data`);
