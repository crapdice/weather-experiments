import { WeatherRecord, ClimateStats } from './weatherData';
import * as d3 from 'd3';

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
        lastSimilarDate: findLastSimilarDate(data, updatedStats?.todayMax, updatedStats?.todayMin)
    };
}

export function findLastSimilarDate(data: WeatherRecord[], todayMax?: number, todayMin?: number): Date | undefined {
    if (todayMax === undefined || todayMin === undefined) return undefined;
    const todayMean = (todayMax + todayMin) / 2;
    // If today is colder than median (approx 50F), look for <=, else >=
    const isCold = todayMean < 50;

    // Search backwards skipping the very last record if it matches today (to find the *previous* time)
    // Assuming data is sorted by date.
    // If date is today, skip it.
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = data.length - 1; i >= 0; i--) {
        const d = data[i];
        if (d.Date.toISOString().split('T')[0] === todayStr) continue;

        if (isCold) {
            if (d['Avg Temp (°F)'] <= todayMean) return d.Date;
        } else {
            if (d['Avg Temp (°F)'] >= todayMean) return d.Date;
        }
    }
    return undefined;
}

function getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
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

        const getSeasonDOS = (date: Date) => {
            const m = date.getMonth(); // 0-11
            // July (6) is start
            // If m >= 6: offset is m - 6
            // If m < 6: offset is (12 - 6) + m = 6 + m
            // This roughly orders months as: July, Aug, ... Dec, Jan, Feb...
            // Need accurate day count though?
            // Let's us string comparison "MM-DD". 
            // Better: offset from July 1st of the season start year.

            // Re-calc season start year for THIS date
            const y = date.getFullYear();
            const seasonStartYear = m >= 6 ? y : y - 1;
            const seasonStart = new Date(seasonStartYear, 6, 1); // July 1
            return (date.getTime() - seasonStart.getTime());
        };

        const cutoffDOS = getSeasonDOS(targetDate);
        const recordDOS = getSeasonDOS(d.Date);

        // However, we must compare "Time into season", ignoring the absolute year.
        // We can normalize the date to a reference year (e.g. 2000-2001) for comparison.

        const normalizeDate = (date: Date) => {
            const m = date.getMonth();
            const day = date.getDate();
            // If month >= 6 (July+), map to 2000. Else map to 2001.
            const y = m >= 6 ? 2000 : 2001;
            return new Date(y, m, day).getTime();
        };

        if (normalizeDate(d.Date) <= normalizeDate(targetDate)) {
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
