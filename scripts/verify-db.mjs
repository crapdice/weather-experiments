import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Utility to handle __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load City Configuration
// We'll read this directly to know what files SHOULD exist
const configPath = path.join(__dirname, '../src/utils/cityConfig.ts');
const configContent = fs.readFileSync(configPath, 'utf8');

// Simple regex to extract file paths from the TS config
const cityFiles = [...configContent.matchAll(/file:\s*'([^']+)'/g)].map(m => m[1]);

console.log(`\n🔍 --- DATABASE VERIFICATION IN PROGRESS ---`);
console.log(`Tracked Cities Found: ${cityFiles.length}`);

const today = new Date();
const dataDir = path.join(__dirname, '../public');

let hasErrors = false;

cityFiles.forEach(relPath => {
    const fullPath = path.join(dataDir, relPath);
    const fileName = path.basename(relPath);

    process.stdout.write(`Checking ${fileName}... `);

    // Check Existence
    if (!fs.existsSync(fullPath)) {
        console.log(`❌ NOT FOUND`);
        hasErrors = true;
        return;
    }

    // Check Integrity
    const content = fs.readFileSync(fullPath, 'utf8').trim();
    const lines = content.split('\n');

    if (lines.length < 2) {
        console.log(`❌ CORRUPT (No Data)`);
        hasErrors = true;
        return;
    }

    const lastLine = lines[lines.length - 1];
    const lastDateStr = lastLine.split(',')[0];
    const lastDate = new Date(lastDateStr);

    if (isNaN(lastDate.getTime())) {
        console.log(`❌ INVALID DATE FORMAT (${lastDateStr})`);
        hasErrors = true;
        return;
    }

    // Check Recency (within last 3 days)
    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays <= 3) {
        console.log(`✅ OK (Ends: ${lastDateStr})`);
    } else {
        console.log(`⚠️ STALE (${diffDays} days old)`);
        if (fileName.includes('chicago')) hasErrors = true; // Chicago MUST be fresh
    }
});

console.log(`\n--- VERIFICATION SUMMARY ---`);
if (hasErrors) {
    console.log(`❌ DATABASE ISSUES DETECTED. Action required.`);
    process.exit(1);
} else {
    console.log(`✅ DATABASE IS HEALTHY. All locations accounted for.`);
    process.exit(0);
}
