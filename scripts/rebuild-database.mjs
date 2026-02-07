import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

// Helper to extract city config from TS file without a heavy loader
function getCities() {
    const configPath = path.join(ROOT, 'src/utils/cityConfig.ts');
    const content = fs.readFileSync(configPath, 'utf8');
    const regex = /id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'[\s\S]*?file:\s*'([^']+)'[\s\S]*?lat:\s*([\d.-]+)[\s\S]*?lng:\s*([\d.-]+)/g;
    return [...content.matchAll(regex)].map(m => ({
        id: m[1],
        name: m[2],
        file: m[3],
        lat: parseFloat(m[4]),
        lng: parseFloat(m[5])
    }));
}

const START_DATE = '1940-01-01';

async function rebuildCity(city) {
    // Standardize file path
    const relativeFile = city.file.startsWith('/') ? city.file.slice(1) : city.file;
    const csvPath = path.join(ROOT, 'public', relativeFile);

    console.log(`\n--------------------------------------------------`);
    console.log(`ARCHIVAL REBUILD: ${city.name} (${city.id})`);
    console.log(`Target: ${csvPath}`);
    console.log(`Coords: ${city.lat}, ${city.lng}`);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 5); // 5 days buffer for definitive archival data
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`Timeline: ${START_DATE} to ${endDateStr}`);

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

    console.log('Requesting massive dataset from Open-Meteo...');

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`API Error: ${response.status} - ${errBody}`);
        }

        const json = await response.json();
        const daily = json.daily;

        if (!daily || !daily.time) {
            throw new Error('No data returned from API');
        }

        console.log(`Received ${daily.time.length.toLocaleString()} records.`);

        const header = 'Date,Max Temp (°F),Min Temp (°F),Avg Temp (°F),Precipitation (in),Snowfall (in),Max Wind Speed (mph),Max Wind Gust (mph)';
        const rows = [header];

        for (let i = 0; i < daily.time.length; i++) {
            const date = daily.time[i];
            const maxTemp = daily.temperature_2m_max[i] ?? '';
            const minTemp = daily.temperature_2m_min[i] ?? '';
            const avgTemp = daily.temperature_2m_mean[i] ?? '';
            const precip = daily.precipitation_sum[i] ?? '';
            const snow = daily.snowfall_sum[i] ?? '';
            const wind = daily.wind_speed_10m_max[i] ?? '';
            const gust = daily.wind_gusts_10m_max[i] ?? '';

            // Formatting: Removing nulls, keeping 0s
            rows.push(`${date},${maxTemp},${minTemp},${avgTemp},${precip},${snow},${wind},${gust}`);
        }

        fs.writeFileSync(csvPath, rows.join('\n'));
        console.log(`✅ SUCCESS: Wrote ${rows.length - 1} records to disk.`);

    } catch (error) {
        console.error(`❌ FAILED to rebuild ${city.name}:`, error.message);
    }
}

async function main() {
    console.log('--- GLOBAL HISTORY BACKFILL INITIATED ---');
    const cities = getCities();

    for (const city of cities) {
        // We skip Chicago (KORD) in this script because we want to preserve 
        // the high-fidelity NWS/ACIS data we already have for it.
        // If you want to nuke Chicago and use Open-Meteo only, remove this check.
        if (city.id === 'CHI') {
            console.log(`\nSkipping Chicago (KORD) to preserve Hybrid/NWS dataset.`);
            continue;
        }

        await rebuildCity(city);
        // Generous delay to absolutely ensure we don't hit the 429 rate limit again
        // Open-Meteo free tier is generous but we are pulling 80 years of data per call.
        console.log('Waiting 90s for API cooldown...');
        await new Promise(resolve => setTimeout(resolve, 90000));
    }
    console.log('\n--- GLOBAL BACKFILL COMPLETE ---');
}

main();
