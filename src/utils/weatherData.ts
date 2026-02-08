import * as d3 from 'd3';
import { calculateZScore, calculatePercentileRank, findLongestRecentStreak, findAnalogYear, calculateStats, findLastSimilarDate } from './statisticalEngine';
import { calculateSeasonalRank, calculateSeasonalComparisons } from './seasonalEngine';
import { processAndEnrich, getMoonPhase, getSunTimes } from './dataProcessor';
import { getDayOfYear } from './dateUtils';
import { SeasonType, SEASONS, getSeasonNameByDate } from './seasonRegistry';
import { WeatherRecord, ClimateStats, SeasonalRank, WeatherFetchResult, CityConfig } from '../types/weather';
import { fetchCurrentWeather } from '../api/weatherFetcher';
import { finalizeResults } from './weatherProcessor';

export async function loadWeatherData(url: string, city?: CityConfig): Promise<{ data: WeatherRecord[], stats: ClimateStats }> {
    const targetUrl = url.includes('chicago_weather_50years.csv') || url.includes('chicago_weather_enriched.csv')
        ? '/data/chicago_weather_v86.csv'
        : url;
    const lat = city?.lat ?? 41.9742;
    const lng = city?.lng ?? -87.9073;

    let mergedRawData: any[] = [];
    let rawDataCSV: any[] = [];

    try {
        if (targetUrl.endsWith('.csv')) {
            rawDataCSV = await d3.csv(targetUrl);
        } else {
            const res = await fetch(targetUrl);
            if (!res.ok) throw new Error(`Failed to fetch weather data: ${res.statusText}`);

            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                rawDataCSV = await res.json();
            } else {
                const text = await res.text();
                rawDataCSV = d3.csvParse(text);
            }
        }
    } catch (err) {
        console.error("Error loading weather data:", err);
        return { data: [], stats: {} as any };
    }

    const currentInfo = await fetchCurrentWeather(lat, lng);

    mergedRawData = rawDataCSV;

    if (currentInfo && currentInfo.recentHistory) {
        const dataMap = new Map();
        rawDataCSV.forEach(d => {
            const key = new Date(d.Date).toISOString().split('T')[0];
            dataMap.set(key, d);
        });

        currentInfo.recentHistory.forEach(rec => {
            const key = rec.Date.toISOString().split('T')[0];
            // ONLY add if not already in the archive
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

        mergedRawData = Array.from(dataMap.values()).sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
    }

    const { data, stats } = processAndEnrich(mergedRawData);
    return finalizeResults(data, stats, currentInfo);
}


export function getSeasonStartDate(date: Date, type: SeasonType = 'Winter'): Date {
    const def = SEASONS[type];
    const year = date.getFullYear();
    let startYear = year;
    if (def.isAcrossYear && date.getMonth() < def.startMonth) {
        startYear = year - 1;
    }

    return new Date(startYear, def.startMonth, def.startDay);
}

export function formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
}

export { getDayOfYear, getMoonPhase, getSunTimes };
