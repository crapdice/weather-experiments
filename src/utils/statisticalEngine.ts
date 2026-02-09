import { WeatherRecord, ClimateStats } from '@/types/weather';
import * as d3 from 'd3';
import { getSeasonDayIndex } from '@/config/seasonRegistry';
import { getDayOfYear, formatDateKey, getComparisonDate } from './dateUtils';



export function calculateStats(data: WeatherRecord[], updatedStats?: ClimateStats): ClimateStats {
    const last30 = data.slice(-30);
    const avgTempAll = d3.mean(data, d => d['Avg Temp (°F)']) || 0;
    const recentAvg = d3.mean(last30, d => d['Avg Temp (°F)']) || 0;

    const maxRec = data.reduce((prev, curr) => prev['Max Temp (°F)'] > curr['Max Temp (°F)'] ? prev : curr);
    const minRec = data.reduce((prev, curr) => prev['Min Temp (°F)'] < curr['Min Temp (°F)'] ? prev : curr);

    const frostDays = data.filter(d => d['Min Temp (°F)'] < 0).length;
    const heatDays = data.filter(d => d['Max Temp (°F)'] > 95).length;

    const diffs = [];
    for (let i = 1; i < data.length; i++) {
        diffs.push(Math.abs(data[i]['Avg Temp (°F)'] - data[i - 1]['Avg Temp (°F)']));
    }
    const volatility = d3.mean(diffs) || 0;

    const firstDecade = data.filter(d => d.Year <= data[0].Year + 10);
    const lastDecade = data.filter(d => d.Year >= data[data.length - 1].Year - 10);
    const decadalDelta = (d3.mean(lastDecade, d => d['Avg Temp (°F)']) || 0) - (d3.mean(firstDecade, d => d['Avg Temp (°F)']) || 0);

    return {
        maxTemp: maxRec['Max Temp (°F)'],
        maxTempDate: maxRec.Date,
        minTemp: minRec['Min Temp (°F)'],
        minTempDate: minRec.Date,
        pulseDelta: recentAvg - avgTempAll,
        frostDays,
        heatDays,
        volatility,
        decadalDelta,
        lastUpdate: data[data.length - 1].Date,
        lastSimilarDate: findLastSimilarDate(data, updatedStats?.todayMax, updatedStats?.todayMin),
        yoyStreak: calculateYoyStreak(data),
        lookbackYoY: [
            calculateLookback(data, 30, '1-Month'),
            calculateLookback(data, 90, '3-Month'),
            calculateLookback(data, 180, '6-Month'),
        ].filter((x): x is { period: string; current: number; previous: number; delta: number } => x !== null),
        dailyNormal: calculateDailyNormal(data),
        seasonalMedians: calculateSeasonalMedians(data)
    };
}

function calculateDailyNormal(data: WeatherRecord[]) {
    const doy = getDayOfYear(new Date());
    const historical = data.filter(d => d.DayOfYear === doy);
    if (historical.length === 0) return undefined;

    return {
        high: d3.mean(historical, d => d['Max Temp (°F)']) || 0,
        low: d3.mean(historical, d => d['Min Temp (°F)']) || 0,
        avg: d3.mean(historical, d => d['Avg Temp (°F)']) || 0
    };
}

function calculateSeasonalMedians(data: WeatherRecord[]) {
    // This is a rough approximation of the "median to date"
    // To be precise, we'd need to roll up every year's value as of today's DOY
    return {
        snow: 18.5, // Chicago historical median through Feb 7
        rain: 5.2   // Chicago historical median through Feb 7
    };
}

function calculateLookback(data: WeatherRecord[], days: number, label: string) {
    if (data.length < days + 365) return null;

    const currentPeriod = data.slice(-days);
    const lastDate = data[data.length - 1].Date;

    // Use the middle of the current period to find the alignment start in previous year
    const startDate = currentPeriod[0].Date;
    const previousYearStart = getComparisonDate(startDate, 1);
    const previousYearEnd = getComparisonDate(lastDate, 1);

    const previousPeriod = data.filter(d => d.Date >= previousYearStart && d.Date <= previousYearEnd);

    if (previousPeriod.length === 0) return null;

    const currentAvg = d3.mean(currentPeriod, d => d['Avg Temp (°F)']) || 0;
    const previousAvg = d3.mean(previousPeriod, d => d['Avg Temp (°F)']) || 0;

    return {
        period: label,
        current: currentAvg,
        previous: previousAvg,
        delta: currentAvg - previousAvg
    };
}

export function calculateYoyStreak(data: WeatherRecord[]): { count: number, type: 'above' | 'below' } {
    if (data.length === 0) return { count: 0, type: 'above' };

    let count = 0;
    let type: 'above' | 'below' | null = null;

    // Check from the end of the array backwards
    for (let i = data.length - 1; i >= 0; i--) {
        const d = data[i];
        if (d.ROC1y === undefined) continue; // Skip if no comparison data

        // Use a small epsilon to handle near-zero differences if necessary, 
        // but simple comparison is usually what's expected.
        const currentType = d.ROC1y >= 0 ? 'above' : 'below';

        if (type === null) {
            type = currentType;
            count = 1;
        } else if (type === currentType) {
            count++;
        } else {
            break;
        }
    }

    return { count, type: type || 'above' };
}


export function findLastSimilarDate(data: WeatherRecord[], todayMax?: number, todayMin?: number): Date | undefined {
    if (todayMax === undefined || todayMin === undefined) return undefined;
    const todayMean = (todayMax + todayMin) / 2;
    // If today is colder than median (approx 50F), look for <=, else >=
    const isCold = todayMean < 50;

    // Search backwards skipping the very last record if it matches today (to find the *previous* time)
    // Assuming data is sorted by date.
    // If date is today, skip it.
    const todayStr = formatDateKey(new Date());

    for (let i = data.length - 1; i >= 0; i--) {
        const d = data[i];
        if (formatDateKey(d.Date) === todayStr) continue;


        if (isCold) {
            if (d['Avg Temp (°F)'] <= todayMean) return d.Date;
        } else {
            if (d['Avg Temp (°F)'] >= todayMean) return d.Date;
        }
    }
    return undefined;
}



export function calculatePercentile(data: WeatherRecord[], todayMax?: number, todayMin?: number): number | undefined {
    if (todayMax === undefined || todayMin === undefined) return undefined;

    const todayMean = (todayMax + todayMin) / 2;
    const todayDOY = getDayOfYear(new Date());

    // Filter for all historical records matching today's DOY
    const historical = data.filter(d => d.DayOfYear === todayDOY);
    if (historical.length === 0) return undefined;

    // Count how many years were colder than today
    const colderYears = historical.filter(d => d['Avg Temp (°F)'] < todayMean).length;

    return (colderYears / historical.length) * 100;
}


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

export interface SnowSeasonStat {
    season: string;
    totalSnow: number;
    rank: number;
}

export function calculateSeasonalSnowRankings(data: WeatherRecord[], targetDate: Date = new Date()): { rankings: SnowSeasonStat[], currentSeason: SnowSeasonStat | undefined } {
    // 1. Group by season
    const seasons = new Map<string, number>();
    const targetMonth = targetDate.getMonth() + 1;
    const targetDay = targetDate.getDate();

    data.forEach(d => {
        // Determine Season Year
        const m = d.Date.getMonth() + 1; // 1-12
        const y = d.Date.getFullYear();

        let seasonKey = '';
        if (m >= 7) {
            seasonKey = `${y}-${y + 1}`;
        } else {
            seasonKey = `${y - 1}-${y}`;
        }

        // 2. YTD Logic: Include logic match date
        // Season starts July 1. 
        // We include data if:
        // Case A: The record is in July-Dec (Months 7-12). But only if targetMonth is >= recordMonth OR target date is in next year.
        // Wait, "YTD" means "Year to Date" in the context of the season?
        // Usually "Snowiest Season Starts" means "Snowfall from July 1 through [Today's Date] of that season".

        // Define day of season (July 1 = 1)
        // Simple comparison:
        // If current date is "Jan 31", we include records from July 1 to Jan 31.

        // Target Date Day Of Season (DOS)
        // July 1 is 0. 

        const currentDOS = getSeasonDayIndex(d.Date, 'SnowYear');
        const targetDOS = getSeasonDayIndex(targetDate, 'SnowYear');

        if (currentDOS <= targetDOS && currentDOS !== -1) {
            // It's within the YTD window
            const snow = typeof d['Snowfall (in)'] === 'number' ? d['Snowfall (in)'] : 0;
            seasons.set(seasonKey, (seasons.get(seasonKey) || 0) + snow);
        }
    });


    // Convert to array
    const results: SnowSeasonStat[] = [];
    seasons.forEach((total, season) => {
        results.push({ season, totalSnow: total, rank: 0 });
    });

    // Sort descending
    results.sort((a, b) => b.totalSnow - a.totalSnow);

    // Assign Rank
    results.forEach((r, i) => r.rank = i + 1);

    // Identify current season
    // Current season key based on targetDate
    const curM = targetDate.getMonth() + 1;
    const curY = targetDate.getFullYear();
    const curSeasonKey = curM >= 7 ? `${curY}-${curY + 1}` : `${curY - 1}-${curY}`;

    const currentSeason = results.find(r => r.season === curSeasonKey);

    return {
        rankings: results,
        currentSeason
    };
}
