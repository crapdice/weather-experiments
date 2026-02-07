import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

// Map city IDs to their private file names (must match API route)
const CITY_FILES = {
    'CHI': { name: 'Chicago', file: 'chicago_weather_v86.csv', lat: 41.9742, lng: -87.9073 },
    'NYC': { name: 'New York', file: 'nyc_weather.csv', lat: 40.7128, lng: -74.0060 },
    'MIA': { name: 'Miami', file: 'miami_weather.csv', lat: 25.7617, lng: -80.1918 },
    'LAX': { name: 'Los Angeles', file: 'la_weather.csv', lat: 34.0522, lng: -118.2437 },
    'DEN': { name: 'Denver', file: 'denver_weather.csv', lat: 39.7392, lng: -104.9903 },
    'PHX': { name: 'Phoenix', file: 'phoenix_weather.csv', lat: 33.4484, lng: -112.0740 },
    'PAR': { name: 'Parrish, FL', file: 'parrish_weather.csv', lat: 27.5815, lng: -82.4220 },
};

function getCities() {
    return Object.entries(CITY_FILES).map(([id, config]) => ({
        id,
        name: config.name,
        file: config.file,
        lat: config.lat,
        lng: config.lng
    }));
}

async function fetchACISData(stationId, sdate, edate) {
    console.log(`    -> NWS (ACIS) for ${stationId}...`);
    try {
        const res = await fetch('https://data.rcc-acis.org/StnData', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sid: stationId, sdate, edate, elems: 'maxt,mint,avgt,pcpn,snow' })
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data || null;
    } catch (e) {
        return null;
    }
}

async function fetchOpenMeteoData(lat, lon, sdate, edate) {
    console.log(`    -> Open-Meteo for ${lat}, ${lon}...`);
    const variables = ['temperature_2m_max', 'temperature_2m_min', 'temperature_2m_mean', 'precipitation_sum', 'snowfall_sum', 'wind_speed_10m_max', 'wind_gusts_10m_max'].join(',');
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${sdate}&end_date=${edate}&daily=${variables}&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`;
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const json = await response.json();
        return json.daily || null;
    } catch (e) {
        return null;
    }
}

function parseACISValue(val) {
    if (val === 'T') return 0.001;
    if (val === 'M' || val === 'S') return null;
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
}

async function syncCity(city) {
    // Use private_data directory
    const csvPath = path.join(ROOT, 'private_data', city.file);

    console.log(`\n[${city.id}] Syncing ${city.name}...`);

    if (!fs.existsSync(csvPath)) {
        console.warn(`    ! File not found: ${csvPath}. Skipping.`);
        return;
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');
    const header = lines[0];
    const dataRows = lines.slice(1);
    const lastDateStr = dataRows[dataRows.length - 1].split(',')[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDateStr >= yesterdayStr) {
        console.log(`    ✅ Already current (${lastDateStr})`);
        return;
    }

    // Only fetch from the day after the last record
    const fetchStart = new Date(lastDateStr);
    fetchStart.setDate(fetchStart.getDate() + 1);
    const fetchStartStr = fetchStart.toISOString().split('T')[0];

    console.log(`    Target Range: ${fetchStartStr} to ${yesterdayStr}`);

    const omData = await fetchOpenMeteoData(city.lat, city.lng, fetchStartStr, yesterdayStr);

    // ACIS is for high-precision station data (Chicago/KORD only)
    let acisData = null;
    if (city.id === 'CHI') {
        acisData = await fetchACISData('ORD', fetchStartStr, yesterdayStr);
    }

    const recordMap = new Map();
    dataRows.forEach(row => {
        const cols = row.split(',');
        recordMap.set(cols[0], cols);
    });

    if (omData && omData.time) {
        for (let i = 0; i < omData.time.length; i++) {
            const date = omData.time[i];
            recordMap.set(date, [
                date,
                omData.temperature_2m_max[i],
                omData.temperature_2m_min[i],
                omData.temperature_2m_mean[i],
                omData.precipitation_sum[i] ?? 0,
                omData.snowfall_sum[i] ?? 0,
                omData.wind_speed_10m_max[i] ?? 0,
                omData.wind_gusts_10m_max[i] ?? 0
            ].map(v => v?.toString() || '0'));
        }
    }

    if (acisData) {
        acisData.forEach(row => {
            const [date, max, min, avg, pcpn, snow] = row;
            if (recordMap.has(date)) {
                const existing = recordMap.get(date);
                const pMax = parseACISValue(max);
                const pMin = parseACISValue(min);
                if (pMax !== null && pMin !== null) {
                    const updated = [...existing];
                    updated[1] = pMax.toString();
                    updated[2] = pMin.toString();
                    updated[3] = parseACISValue(avg)?.toString() || updated[3];
                    updated[4] = parseACISValue(pcpn)?.toString() || updated[4];
                    updated[5] = parseACISValue(snow)?.toString() || updated[5];
                    recordMap.set(date, updated);
                }
            }
        });
    }

    const sortedDates = Array.from(recordMap.keys()).sort();
    const outputRows = [header, ...sortedDates.map(d => recordMap.get(d).join(','))];
    fs.writeFileSync(csvPath, outputRows.join('\n'));
    console.log(`    ✅ Update complete. Ends: ${sortedDates[sortedDates.length - 1]}`);
}

async function main() {
    console.log('--- KORD INTEL: GLOBAL DATA REFRESH ---');
    const cities = getCities();
    for (const city of cities) {
        await syncCity(city);
    }
    console.log('\n--- ALL SYSTEMS OPERATIONAL ---');
}

main();
