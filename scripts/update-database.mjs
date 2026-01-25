import fs from 'fs';
import path from 'path';

const csvPath = 'public/data/chicago_weather_50years.csv';

async function updateDatabase() {
    console.log('Reading database...');
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    const lastDateStr = lastLine.split(',')[0].split(' ')[0];
    const lastDate = new Date(lastDateStr);

    console.log(`Last date in database: ${lastDateStr}`);

    const today = new Date();
    const startDate = new Date(lastDate);
    startDate.setDate(startDate.getDate() + 1);

    if (startDate > today) {
        console.log('Database is already up to date.');
        return;
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];

    console.log(`Fetching data from ${startDateStr} to ${endDateStr}...`);

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=41.9742&longitude=-87.9073&start_date=${startDateStr}&end_date=${endDateStr}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean&temperature_unit=fahrenheit&timezone=America%2FChicago`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.daily || !data.daily.time) {
            console.log('No new data found.');
            return;
        }

        let newLines = '';
        for (let i = 0; i < data.daily.time.length; i++) {
            const date = data.daily.time[i];
            const max = data.daily.temperature_2m_max[i];
            const min = data.daily.temperature_2m_min[i];
            const avg = data.daily.temperature_2m_mean[i];

            if (max === null || min === null || avg === null) continue;

            // Format: YYYY-MM-DD 06:00:00,Max,Min,Avg
            newLines += `\n${date} 06:00:00,${max},${min},${avg}`;
        }

        if (newLines) {
            console.log(`Appending new data:\n${newLines.trim()}`);
            fs.appendFileSync(csvPath, newLines);
            console.log('Database updated successfully.');
        } else {
            console.log('No complete records found to append.');
        }

    } catch (error) {
        console.error('Error updating database:', error);
    }
}

updateDatabase();
