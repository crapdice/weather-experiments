const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/data/chicago_weather_v86.csv');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Get last 60 lines
const last60 = lines.slice(-61); // -60 + 1 for potential empty last line

console.log("Recent Snowfall Data (Last 60 days):");
last60.forEach(line => {
    if (!line.trim()) return;
    const parts = line.split(',');
    const date = parts[0];
    const snow = parts[5];
    if (parseFloat(snow) > 0.5) {
        console.log(`${date}: ${snow} inches`);
    }
});
