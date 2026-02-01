import fs from 'fs';
import path from 'path';

const CSV_PATH = path.join(process.cwd(), 'public/data/chicago_weather_v86.csv');
const LAT = 41.9742;
const LON = -87.9073;
const STATION_ID = 'ORD'; // Chicago O'Hare International Airport

async function fetchACISData(sdate, edate) {
    console.log(`Fetching Official NWS data from ACIS (${sdate} to ${edate})...`);
    try {
        const res = await fetch('https://data.rcc-acis.org/StnData', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sid: STATION_ID,
                sdate,
                edate,
                elems: 'maxt,mint,avgt,pcpn,snow'
            })
        });

        if (!res.ok) return null;
        const json = await res.json();
        return json.data || null;
    } catch (e) {
        console.error("ACIS Fetch Failed:", e);
        return null;
    }
}

async function fetchOpenMeteoData(sdate, edate) {
    console.log(`Fetching Enriched Estimates from Open-Meteo (${sdate} to ${edate})...`);
    const variables = [
        'temperature_2m_max',
        'temperature_2m_min',
        'temperature_2m_mean',
        'precipitation_sum',
        'snowfall_sum',
        'wind_speed_10m_max',
        'wind_gusts_10m_max'
    ].join(',');

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${sdate}&end_date=${edate}&daily=${variables}&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FChicago`;

    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const json = await response.json();
        return json.daily || null;
    } catch (e) {
        console.error("Open-Meteo Fetch Failed:", e);
        return null;
    }
}

function parseACISValue(val) {
    if (val === 'T') return 0.001; // Trace
    if (val === 'M' || val === 'S') return null; // Missing/Subsequent
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
}

async function sync() {
    console.log('--- Starting HYBRID Weather Data Sync ---');
    console.log('Target:', CSV_PATH);

    if (!fs.existsSync(CSV_PATH)) {
        console.error('CSV file not found.');
        process.exit(1);
    }

    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = content.trim().split('\n');
    const header = lines[0];
    const dataRows = lines.slice(1);

    const lastDateStr = dataRows[dataRows.length - 1].split(',')[0];
    console.log(`Last record in CSV: ${lastDateStr}`);

    // Standard Range (Last Date to Yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // ACIS Lookback (Last 14 days to catch QC updates)
    const acisStart = new Date();
    acisStart.setDate(acisStart.getDate() - 14);
    const acisStartStr = acisStart.toISOString().split('T')[0];

    // FETCH DATA
    const omData = await fetchOpenMeteoData(lastDateStr, yesterdayStr);
    const acisData = await fetchACISData(acisStartStr, yesterdayStr);

    // Map existing records by date
    const recordMap = new Map();
    dataRows.forEach(row => {
        const cols = row.split(',');
        recordMap.set(cols[0], cols);
    });

    // 1. Process Open-Meteo (Gap Filling)
    if (omData && omData.time) {
        for (let i = 0; i < omData.time.length; i++) {
            const date = omData.time[i];
            if (!recordMap.has(date)) {
                // New record from Open-Meteo
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
    }

    // 2. Process ACIS (Overwriting with Ground Truth)
    let finalizedCount = 0;
    if (acisData) {
        acisData.forEach(row => {
            const [date, max, min, avg, pcpn, snow] = row;
            if (recordMap.has(date)) {
                const existing = recordMap.get(date);
                const pMax = parseACISValue(max);
                const pMin = parseACISValue(min);

                // Only overwrite if we have valid NWS temp data (indicates QC is likely done)
                if (pMax !== null && pMin !== null) {
                    const updated = [...existing];
                    updated[1] = pMax.toString();
                    updated[2] = pMin.toString();
                    updated[3] = parseACISValue(avg)?.toString() || updated[3];
                    updated[4] = parseACISValue(pcpn)?.toString() || updated[4];
                    updated[5] = parseACISValue(snow)?.toString() || updated[5];

                    // Keep existing wind data if ACIS doesn't provide it
                    recordMap.set(date, updated);
                    finalizedCount++;
                }
            }
        });
    }

    // 3. Rebuild CSV
    const sortedDates = Array.from(recordMap.keys()).sort();
    const outputRows = [header];
    sortedDates.forEach(d => {
        outputRows.push(recordMap.get(d).join(','));
    });

    fs.writeFileSync(CSV_PATH, outputRows.join('\n'));
    console.log(`Sync Complete.`);
    console.log(`Finalized ${finalizedCount} records with Official NWS data.`);
    console.log(`CSV now ends at ${sortedDates[sortedDates.length - 1]}`);
}

sync();
