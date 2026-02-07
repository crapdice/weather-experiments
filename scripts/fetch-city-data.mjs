
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchOpenMeteoData(lat, lon, sdate, edate) {
    console.log(`Fetching data for ${lat}, ${lon} from ${sdate} to ${edate}...`);
    const variables = ['temperature_2m_max', 'temperature_2m_min', 'temperature_2m_mean', 'precipitation_sum', 'snowfall_sum', 'wind_speed_10m_max', 'wind_gusts_10m_max'].join(',');
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${sdate}&end_date=${edate}&daily=${variables}&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Error fetching data: ${response.statusText}`);
            return null;
        }
        const json = await response.json();
        return json.daily || null;
    } catch (e) {
        console.error('Fetch failed:', e);
        return null;
    }
}

async function main() {
    const lat = process.argv[2];
    const lng = process.argv[3];
    const filename = process.argv[4];
    const startYear = process.argv[5] || '1940';

    if (!lat || !lng || !filename) {
        console.error('Usage: node fetch-city-data.mjs <lat> <lng> <filename> [startYear]');
        process.exit(1);
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    const endStr = endDate.toISOString().split('T')[0];
    const startStr = `${startYear}-01-01`;

    const data = await fetchOpenMeteoData(lat, lng, startStr, endStr);

    if (!data) {
        console.error('No data returned.');
        process.exit(1);
    }

    const header = 'Date,Max Temp (°F),Min Temp (°F),Avg Temp (°F),Precipitation (in),Snowfall (in),Max Wind Speed (mph),Max Wind Gust (mph)';
    const rows = [header];

    for (let i = 0; i < data.time.length; i++) {
        const date = data.time[i];
        const max = data.temperature_2m_max[i] ?? '';
        const min = data.temperature_2m_min[i] ?? '';
        const avg = data.temperature_2m_mean[i] ?? '';
        const precip = data.precipitation_sum[i] ?? 0;
        const snow = data.snowfall_sum[i] ?? 0;
        const wind = data.wind_speed_10m_max[i] ?? 0;
        const gust = data.wind_gusts_10m_max[i] ?? 0;

        rows.push(`${date},${max},${min},${avg},${precip},${snow},${wind},${gust}`);
    }

    const outputPath = path.join(__dirname, '../private_data', filename);
    fs.writeFileSync(outputPath, rows.join('\n'));
    console.log(`Successfully wrote ${rows.length - 1} records to ${outputPath}`);
}

main();
