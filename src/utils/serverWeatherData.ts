import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { processAndEnrich } from './dataProcessor';
import { finalizeResults } from './weatherProcessor';
import { fetchCurrentWeather } from '@/api/weatherFetcher';
import { CityConfig } from '@/types/weather';
import { getAdminSettings } from './adminSettings';

export async function loadServerWeatherData(cityId: string, city: CityConfig) {
    if (cityId === 'CHI') {
        // Use static CSV optimization
        const filePath = path.join(process.cwd(), 'public', 'chicago_weather_v86.csv');
        const fileContent = await fs.readFile(filePath, 'utf-8');
        let rawDataCSV = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            cast: true
        });

        const lat = city?.lat ?? 41.9742;
        const lng = city?.lng ?? -87.9073;

        // Fetch current weather to stitch on
        const currentInfo = await fetchCurrentWeather(lat, lng);

        let mergedRawData = rawDataCSV;

        if (currentInfo && currentInfo.recentHistory) {
            const dataMap = new Map();
            rawDataCSV.forEach((d: any) => {
                const key = new Date(d.Date).toISOString().split('T')[0];
                dataMap.set(key, d);
            });

            currentInfo.recentHistory.forEach((rec: any) => {
                const key = rec.Date.toISOString().split('T')[0];
                if (!dataMap.has(key)) {
                    const csvRow = {
                        Date: key,
                        'Max Temp (°F)': rec['Max Temp (°F)'],
                        'Min Temp (°F)': rec['Min Temp (°F)'],
                        'Avg Temp (°F)': rec['Avg Temp (°F)'],
                        'Precipitation (in)': rec['Precipitation (in)'],
                        'Snowfall (in)': rec['Snowfall (in)'],
                        'Max Wind Speed (mph)': rec['Max Wind Speed (mph)'],
                        'Max Wind Gust (mph)': rec['Max Wind Gust (mph)'],
                        DayOfYear: 0,
                        Year: 0
                    };
                    dataMap.set(key, csvRow);
                }
            });
            mergedRawData = Array.from(dataMap.values()).sort((a: any, b: any) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
        }

        const { data, stats } = processAndEnrich(mergedRawData);
        return finalizeResults(data, stats, currentInfo);
    }

    // Non-static fallback (e.g. other cities via API or other means)
    return { data: [], stats: null };
}
