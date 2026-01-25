import fs from 'fs';
import path from 'path';

const CSV_PATH = path.join(process.cwd(), 'public/data/chicago_weather_v86.csv');
const LAT = 41.9742;
const LON = -87.9073;

async function sync() {
    console.log('--- Starting Enriched Weather Data Sync ---');

    // 1. Read existing data and find the last date
    if (!fs.existsSync(CSV_PATH)) {
        console.error('CSV file not found at:', CSV_PATH);
        process.exit(1);
    }

    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = content.trim().split('\n');
    const lastLine = lines[lines.length - 1];

    // Header is Date,Max Temp (°F),Min Temp (°F),Avg Temp (°F),Precipitation (in),Snowfall (in),Max Wind Speed (mph),Max Wind Gust (mph)
    const lastDateStr = lastLine.split(',')[0];
    const lastDate = new Date(lastDateStr);

    console.log(`Last record in CSV: ${lastDateStr}`);

    // 2. Fetch data from lastDate to today from Open-Meteo Archive
    const startDateStr = lastDate.toISOString().split('T')[0];
    const endDate = new Date();
    // Move end date back 2 days for stability
    endDate.setDate(endDate.getDate() - 2);
    const endDateStr = endDate.toISOString().split('T')[0];

    if (startDateStr >= endDateStr) {
        console.log('Data is already up to date.');
        return;
    }

    console.log(`Fetching enriched data from ${startDateStr} to ${endDateStr}...`);

    const variables = [
        'temperature_2m_max',
        'temperature_2m_min',
        'temperature_2m_mean',
        'precipitation_sum',
        'snowfall_sum',
        'wind_speed_10m_max',
        'wind_gusts_10m_max'
    ].join(',');

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${startDateStr}&end_date=${endDateStr}&daily=${variables}&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FChicago`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const json = await response.json();
        const daily = json.daily;

        if (!daily || !daily.time) {
            console.log('No new data found from API.');
            return;
        }

        // 3. Format and append new records
        let newLines = [];
        const existingDates = new Set(lines.map(l => l.split(',')[0].split(' ')[0]));

        for (let i = 0; i < daily.time.length; i++) {
            const date = daily.time[i];

            // Skip if we already have this date
            if (existingDates.has(date)) continue;

            const max = daily.temperature_2m_max[i];
            const min = daily.temperature_2m_min[i];
            const avg = daily.temperature_2m_mean[i];
            const precip = daily.precipitation_sum[i] ?? 0;
            const snow = daily.snowfall_sum[i] ?? 0;
            const wind = daily.wind_speed_10m_max[i] ?? 0;
            const gust = daily.wind_gusts_10m_max[i] ?? 0;

            if (max === null || min === null || avg === null) continue;

            // Format matches ISO 8601
            const row = `${date},${max},${min},${avg},${precip},${snow},${wind},${gust}`;
            newLines.push(row);
        }

        if (newLines.length > 0) {
            console.log(`Adding ${newLines.length} new records...`);
            fs.appendFileSync(CSV_PATH, '\n' + newLines.join('\n'));
            console.log('Sync complete.');
        } else {
            console.log('No new unique records to add.');
        }

    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
}

sync();
