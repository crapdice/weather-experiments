import fs from 'fs';
import path from 'path';

const CSV_PATH = path.join(process.cwd(), 'public/data/chicago_weather_v86.csv');
const LAT = 41.9742;
const LON = -87.9073;
const START_DATE = '1940-01-01';

async function rebuild() {
    console.log('--- Starting ARCHIVAL REBUILD (1940 - Present) ---');
    console.log('Target:', CSV_PATH);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 2); // 2 days buffer for reliability
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`Region: Chicago (${LAT}, ${LON})`);
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

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${START_DATE}&end_date=${endDateStr}&daily=${variables}&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FChicago`;

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

        console.log(`Fetched ${daily.time.length} records.`);

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

            // Formatting date to match ISO 8601: YYYY-MM-DD
            rows.push(`${date},${maxTemp},${minTemp},${avgTemp},${precip},${snow},${wind},${gust}`);
        }

        fs.writeFileSync(CSV_PATH, rows.join('\n'));
        console.log(`Successfully wrote ${rows.length - 1} records to ${CSV_PATH}`);
        console.log('--- Archival Rebuild Complete ---');

    } catch (error) {
        console.error('Rebuild failed:', error);
        process.exit(1);
    }
}

rebuild();
