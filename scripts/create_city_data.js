const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'public/data/chicago_weather_v86.csv');
const data = fs.readFileSync(sourcePath, 'utf8');
const lines = data.split('\n');
const header = lines[0];
const records = lines.slice(1);

function transform(records, tempOffset, snowMultiplier, precipMultiplier) {
    return records.map(line => {
        if (!line.trim()) return line;
        const parts = line.split(',');
        // Date, Max, Min, Avg, Precip, Snow, Wind, WindGust
        const max = parseFloat(parts[1]);
        const min = parseFloat(parts[2]);
        const avg = parseFloat(parts[3]);
        const precip = parseFloat(parts[4]) || 0;
        const snow = parseFloat(parts[5]) || 0;

        if (isNaN(max)) return line;

        const newMax = (max + tempOffset).toFixed(1);
        const newMin = (min + tempOffset).toFixed(1);
        const newAvg = (avg + tempOffset).toFixed(1);
        const newPrecip = (precip * precipMultiplier).toFixed(3);
        const newSnow = (snow * snowMultiplier).toFixed(3);

        parts[1] = newMax;
        parts[2] = newMin;
        parts[3] = newAvg;
        parts[4] = newPrecip === '0.000' ? '' : newPrecip;
        parts[5] = newSnow === '0.000' ? '0' : newSnow; // Keep snow 0 if 0

        return parts.join(',');
    });
}

const cities = [
    { name: 'miami_weather.csv', temp: 30, snow: 0, precip: 1.5 }, // Hot, rainy, no snow
    { name: 'denver_weather.csv', temp: -2, snow: 2.0, precip: 0.8 }, // Colder, snowy
    { name: 'la_weather.csv', temp: 15, snow: 0, precip: 0.3 }, // Warm, dry
    { name: 'nyc_weather.csv', temp: 5, snow: 0.7, precip: 1.1 }, // Warmer Chicago
    { name: 'phoenix_weather.csv', temp: 35, snow: 0, precip: 0.2 }, // Very hot, very dry
];

cities.forEach(city => {
    const newRecords = transform(records, city.temp, city.snow, city.precip);
    const content = [header, ...newRecords].join('\n');
    fs.writeFileSync(path.join(__dirname, 'public/data', city.name), content);
    console.log(`Created ${city.name}`);
});
