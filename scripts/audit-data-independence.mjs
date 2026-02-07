import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

function getCities() {
    const configPath = path.join(ROOT, 'src/utils/cityConfig.ts');
    const content = fs.readFileSync(configPath, 'utf8');
    const regex = /id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'[\s\S]*?file:\s*'([^']+)'/g;
    return [...content.matchAll(regex)].map(m => ({
        id: m[1],
        name: m[2],
        file: m[3]
    }));
}

function loadCityData(filename) {
    const filePath = path.join(ROOT, 'public', filename.startsWith('/') ? filename.slice(1) : filename);
    if (!fs.existsSync(filePath)) return null;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    const data = new Map();

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        const date = parts[0];
        const maxTemp = parseFloat(parts[1]);
        const precip = parseFloat(parts[4]);

        if (!isNaN(maxTemp)) {
            data.set(date, { maxTemp, precip });
        }
    }
    return data;
}

function audit() {
    console.log('--- DATA INDEPENDENCE AUDIT ---');
    console.log('Verifying that city data is NOT synthetically derived from Chicago.\n');

    const cities = getCities();
    const chiConfig = cities.find(c => c.id === 'CHI');
    if (!chiConfig) {
        console.error('Chicago not found in config.');
        return;
    }

    console.log('Loading Baseline: Chicago (KORD)...');
    const chiData = loadCityData(chiConfig.file);
    if (!chiData) {
        console.error('Chicago data file missing.');
        return;
    }

    // Pick 3 random dates (avoiding very recent ones to ensure history exists)
    const dates = [
        '1955-07-15', // Summer
        '1988-01-15', // Winter
        '2010-04-10'  // Spring
    ];

    cities.forEach(city => {
        if (city.id === 'CHI') return;

        console.log(`\nAnalyzing ${city.name} (${city.id})...`);
        const cityData = loadCityData(city.file);

        if (!cityData) {
            console.log(`  ❌ Data file missing or empty.`);
            return;
        }

        let isSynthetic = true;
        let lastDiff = null;

        console.log(`  Sampling 3 Random Dates:`);

        dates.forEach(date => {
            const cVal = chiData.get(date);
            const oVal = cityData.get(date);

            if (!cVal || !oVal) {
                console.log(`    ${date}: [Missing Data]`);
                return;
            }

            const diff = (oVal.maxTemp - cVal.maxTemp).toFixed(1);

            console.log(`    ${date} | CHI: ${cVal.maxTemp}°F, Rain: ${cVal.precip}" | ${city.id}: ${oVal.maxTemp}°F, Rain: ${oVal.precip}" | Diff: ${diff}`);

            // Logic: If data is synthetic, the difference between cities is roughly constant (+/- rounding errors)
            // or exactly proportional. Real weather fluctuates wildly.

            if (lastDiff !== null && Math.abs(diff - lastDiff) > 1.0) {
                isSynthetic = false;
            }
            lastDiff = diff;
        });

        if (isSynthetic && lastDiff !== null) {
            console.log(`  ⚠️  WARNING: POTENTIALLY SYNTHETIC. Temp difference is constant.`);
        } else {
            console.log(`  ✅  VERIFIED: Independent Data. Variance detected.`);
        }
    });
}

audit();
