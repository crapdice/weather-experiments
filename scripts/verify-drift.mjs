import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..'); // project root

const CHICAGO_FILE = path.join(ROOT, 'public/data/chicago_weather_v86.csv');

function parseDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function verifyTenYearTrend() {
    console.log('--- VERIFYING 10-YEAR THERMAL DRIFT (CHICAGO) ---');

    const content = fs.readFileSync(CHICAGO_FILE, 'utf-8');
    const lines = content.trim().split('\n').slice(1); // skip header
    const data = lines.map(line => {
        const cols = line.split(',');
        return {
            dateStr: cols[0],
            date: new Date(cols[0]), // Let simpler parser handle it first
            avg: parseFloat(cols[3])
        };
    }).filter(d => !isNaN(d.avg));

    // Define the "Current View" Range: Last 10 Years
    // Let's assume "Today" is Feb 6, 2026.
    // 10 Years back = Feb 6, 2016.
    const endDate = new Date(2026, 1, 6); // Feb 6, 2026
    const startDate = new Date(2016, 1, 6); // Feb 6, 2016

    console.log(`View Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // --- ROBUST DATE LOGIC (Mirrors src/utils/dateUtils.ts) ---
    function getComparisonDate(date, yearsBack) {
        const targetYear = date.getFullYear() - yearsBack;
        // Match Month/Day
        const targetDate = new Date(targetYear, date.getMonth(), date.getDate());

        // If we rolled over (Feb 29 -> Mar 1), fallback to Feb 28
        if (targetDate.getMonth() !== date.getMonth()) {
            targetDate.setDate(0);
        }
        return targetDate;
    }

    function formatDateKey(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // 1. Build Lookup Map
    const dateValueMap = new Map();
    data.forEach(d => {
        // d.date is already a Date object
        dateValueMap.set(formatDateKey(d.date), d.avg);
    });

    let cumDrift = 0;
    let days = 0;

    // 2. Iterate and Compare
    data.forEach(d => {
        if (d.date >= startDate && d.date <= endDate) {
            const lastYearDate = getComparisonDate(d.date, 1);
            const key = formatDateKey(lastYearDate);

            if (dateValueMap.has(key)) {
                const currentVal = d.avg;
                const pastVal = dateValueMap.get(key);
                const diff = currentVal - pastVal;
                cumDrift += diff;
                days++;
            }
        }
    });

    console.log(`\n--- RESULTS ---`);
    console.log(`Days Processed: ${days}`);
    console.log(`Cumulative Drift (Sum): ${cumDrift.toFixed(2)}°F`);
    console.log(`Average Daily Drift: ${(cumDrift / days).toFixed(4)}°F`);

    console.log(`\nInterpretation:`);
    if (Math.abs(cumDrift) < 50) {
        console.log(`The cumulative drift is negligible. This confirms that over this specific 10-year window,`);
        console.log(`the net warming/cooling vs the previous year averaged out to almost zero.`);
    } else {
        console.log(`Significant drift detected.`);
    }
}

verifyTenYearTrend();
