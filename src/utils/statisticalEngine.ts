import { WeatherRecord } from './weatherData';
import * as d3 from 'd3';

export function calculateZScore(value: number, history: number[]): number {
    if (history.length < 2) return 0;
    const mean = d3.mean(history) || 0;
    const deviation = d3.deviation(history) || 1; // Avoid divide by zero
    return (value - mean) / deviation;
}

export function calculatePercentileRank(value: number, history: number[]): number {
    if (history.length === 0) return 50;
    const sorted = [...history].sort((a, b) => a - b);
    const countBelow = sorted.filter(v => v < value).length;
    return (countBelow / sorted.length) * 100;
}

export function findLongestRecentStreak(data: WeatherRecord[], predicate: (d: WeatherRecord) => boolean): { count: number, startDate: Date } {
    if (data.length === 0) return { count: 0, startDate: new Date() };

    // Sort descending by date to check "recent" streak
    // Assuming data passed in might be ascending, let's just work backwards
    // But data is usually ascending. Let's start from end.
    let count = 0;
    let startDate = data[data.length - 1].Date;

    for (let i = data.length - 1; i >= 0; i--) {
        if (predicate(data[i])) {
            count++;
            startDate = data[i].Date;
        } else {
            break;
        }
    }
    return { count, startDate };
}

export function findAnalogYear(recentData: WeatherRecord[], historicalData: WeatherRecord[]): { year: number, similarityScore: number } {
    if (recentData.length === 0 || historicalData.length === 0) return { year: 0, similarityScore: 0 };

    // Group history by year
    const historyByYear = d3.group(historicalData, d => d.Year);
    const recentDoYs = recentData.map(d => d.DayOfYear);

    let bestYear = 0;
    let lowestError = Infinity;

    historyByYear.forEach((records, year) => {
        // Skip current year if present in history to avoid self-match
        if (year === recentData[0].Year) return;

        // Must have complete data overlap
        // Create map for O(1) lookup
        const yearMap = new Map(records.map(r => [r.DayOfYear, r]));

        let valid = true;
        let sumSqDiff = 0;

        for (let i = 0; i < recentData.length; i++) {
            const r = recentData[i];
            const h = yearMap.get(r.DayOfYear);

            if (!h) {
                valid = false;
                break;
            }

            const diff = r['Avg Temp (°F)'] - h['Avg Temp (°F)'];
            sumSqDiff += diff * diff;
        }

        if (valid) {
            const matchError = sumSqDiff / recentData.length; // Mean Squared Error
            if (matchError < lowestError) {
                lowestError = matchError;
                bestYear = year;
            }
        }
    });

    // Score: Convert MSE to a 0-1 similarity score. 
    // Just returning 1 / (1 + error) for now, or just simple inversion logic.
    // Let's use 100 * e^(-MSE/scale) for a nice % score? 
    // Just keeping it simple for the test:
    const similarityScore = lowestError === 0 ? 1 : 1 / (1 + Math.sqrt(lowestError));

    return { year: bestYear, similarityScore };
}
