const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/data/chicago_weather_v86.csv');
const fileContent = fs.readFileSync(filePath, 'utf8');
const lines = fileContent.split('\n');

console.log("Checking specific blizzard dates:");

lines.forEach(line => {
    if (line.startsWith('1967-01-26') || line.startsWith('1967-01-27') ||
        line.startsWith('1979-01-13') || line.startsWith('1979-01-14')) {
        console.log(line);
    }
});
