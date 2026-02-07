import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const CITIES_TO_FIX = [
    { id: 'PHX', name: 'Phoenix', file: 'data/phoenix_weather.csv', lat: 33.4484, lng: -112.0740 },
    { id: 'DEN', name: 'Denver', file: 'data/denver_weather.csv', lat: 39.7392, lng: -104.9903 },
    { id: 'MIA', name: 'Miami', file: 'data/miami_weather.csv', lat: 25.7617, lng: -80.1918 },
    { id: 'LAX', name: 'Los Angeles', file: 'data/la_weather.csv', lat: 34.0522, lng: -118.2437 }
];

const START_DATE = '1940-01-01';

async function rebuildCity(city) {
    const csvPath = path.join(ROOT, 'public', city.file);
    console.log(`\nRebuilding ${city.name}...`);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 2);
    const endDateStr = endDate.toISOString().split('T')[0];

    const variables = [
        'temperature_2m_max',
        'temperature_2m_min',
        'temperature_2m_mean',
        'precipitation_sum',
        'snowfall_sum',
        'wind_speed_10m_max',
        'wind_gusts_10m_max'
    ].join(',');

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${city.lat}&longitude=${city.lng}&start_date=${START_DATE}&end_date=${endDateStr}&daily=${variables}&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(response.statusText);
        const json = await response.json();

        if (!json.daily) throw new Error("No daily data found");

        const header = 'Date,Max Temp (°F),Min Temp (°F),Avg Temp (°F),Precipitation (in),Snowfall (in),Max Wind Speed (mph),Max Wind Gust (mph)';
        const rows = [header];

        for (let i = 0; i < json.daily.time.length; i++) {
            rows.push([
                json.daily.time[i],
                json.daily.temperature_2m_max[i] ?? '',
                json.daily.temperature_2m_min[i] ?? '',
                json.daily.temperature_2m_mean[i] ?? '',
                json.daily.precipitation_sum[i] ?? '',
                json.daily.snowfall_sum[i] ?? '',
                json.daily.wind_speed_10m_max[i] ?? '',
                json.daily.wind_gusts_10m_max[i] ?? ''
            ].join(','));
        }

        fs.writeFileSync(csvPath, rows.join('\n'));
        console.log(`✅ Success: ${rows.length} records.`);

    } catch (error) {
        console.error(`❌ Failed: ${error.message}`);
    }
}

async function main() {
    for (const city of CITIES_TO_FIX) {
        await rebuildCity(city);
        console.log('Cooling down for 60s...');
        await new Promise(r => setTimeout(r, 60000));
    }
}

main();
