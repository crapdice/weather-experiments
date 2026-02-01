import { WeatherRecord, SeasonalRank } from './weatherData';
import * as d3 from 'd3';

// Helper to determine the "Season Year"
// Winter: Dec-Feb.  Dec 2023 is part of "Winter 2024". Jan 2024 is "Winter 2024".
// Spring: Mar-May (2024)
// Summer: Jun-Aug (2024)
// Fall: Sept-Nov (2024)
function getSeasonYear(d: Date): number {
    const month = d.getMonth(); // 0-11
    // Dec (11) pushes to next year for winter grouping
    if (month === 11) return d.getFullYear() + 1;
    return d.getFullYear();
}

function getSeasonName(d: Date): string {
    const month = d.getMonth();
    if (month === 11 || month <= 1) return 'Winter';
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    return 'Fall';
}

export function calculateSeasonalRank(currentSeason: WeatherRecord[], history: WeatherRecord[], metric: 'snow' | 'rain'): SeasonalRank {
    if (currentSeason.length === 0) return { rank: 0, totalYears: 0, value: 0, percentile: 0, seasonName: 'Unknown' };

    // const firstDate = currentSeason[0].Date; (removed unused)
    const lastDate = currentSeason[currentSeason.length - 1].Date;
    const targetSeasonName = getSeasonName(lastDate);
    const targetSeasonYear = getSeasonYear(lastDate);

    // 1. Calculate Current Total
    const field = metric === 'snow' ? 'Snowfall (in)' : 'Precipitation (in)';
    const currentTotal = d3.sum(currentSeason, d => d[field] || 0);

    // 2. Filter History for SAME WINDOW (DayOfYear Range) in past years
    // Window start DOY to Window end DOY.
    // Handling Winter rollover (Dec -> Jan) requires care.
    // Strategy: Assign every historical record a "SeasonYear". 
    // Group by SeasonYear.
    // Only verify records that fall within the "Season-to-Date" window relative to that season start.

    // Easier: Define a "Days Into Season" index?
    // Dec 1 = Day 0. Jan 1 = Day 31.
    // Let's use simple Month/Day matching.

    // Filter history to just records matching the season type
    const historyInSeason = history.filter(d => getSeasonName(d.Date) === targetSeasonName);

    const totalsByYear = d3.rollup(historyInSeason,
        (v) => d3.sum(v, d => d[field] || 0),
        (d) => getSeasonYear(d.Date)
    );

    // Add current season to the map (or overwrite if in history)
    totalsByYear.set(targetSeasonYear, currentTotal);

    // 3. Rank
    // Sort totals descending
    const allTotals = Array.from(totalsByYear.entries())
        .map(([year, total]) => ({ year, total }))
        .sort((a, b) => b.total - a.total); // Descending -> #1 is highest

    const rank = allTotals.findIndex(x => x.year === targetSeasonYear) + 1;
    const totalYears = allTotals.length;
    const percentile = ((totalYears - rank) / totalYears) * 100;

    return {
        rank,
        totalYears,
        value: currentTotal,
        percentile,
        seasonName: targetSeasonName
    };
}

// --- SEASONAL COMPARISON ANALYTICS ---

export interface SeasonalComparison {
    metric: string;
    currentValue: number;
    rank: number;
    totalYears: number;
    percentile: number;
    historicalBest: { year: number; value: number };
    historicalWorst: { year: number; value: number };
    unit: string;
    higherIsBetter: boolean; // For ranking direction
}

/**
 * Calculates the day-into-season index for winter.
 * Dec 1 = 0, Jan 1 = 31, Feb 28 = 89.
 */
function getDayIntoWinter(d: Date): number {
    const month = d.getMonth();
    const day = d.getDate();
    if (month === 11) return day; // Dec 1 = 1, Dec 31 = 31
    if (month === 0) return 31 + day; // Jan 1 = 32
    if (month === 1) return 31 + 31 + day; // Feb 1 = 63
    return 0; // Not a winter month
}

/**
 * Finds the longest streak of consecutive days matching a predicate.
 */
function findLongestStreak(records: WeatherRecord[], predicate: (r: WeatherRecord) => boolean): number {
    let maxStreak = 0;
    let currentStreak = 0;
    for (const r of records) {
        if (predicate(r)) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 0;
        }
    }
    return maxStreak;
}

export function calculateSeasonalComparisons(
    currentSeason: WeatherRecord[],
    history: WeatherRecord[]
): SeasonalComparison[] {
    if (currentSeason.length === 0) return [];

    const lastDate = currentSeason[currentSeason.length - 1].Date;
    const targetSeasonName = getSeasonName(lastDate);
    const targetSeasonYear = getSeasonYear(lastDate);
    const currentDayIntoSeason = getDayIntoWinter(lastDate);

    // Group historical data by season year
    const historyInSeason = history.filter(d => getSeasonName(d.Date) === targetSeasonName);
    const groupedByYear = d3.group(historyInSeason, d => getSeasonYear(d.Date));

    // Filter each historical year to only include days up to same point in season
    const filteredHistoricalSeasons = new Map<number, WeatherRecord[]>();
    groupedByYear.forEach((records, year) => {
        if (year === targetSeasonYear) return; // Skip current year
        const filtered = records
            .filter(r => getDayIntoWinter(r.Date) <= currentDayIntoSeason)
            .sort((a, b) => a.Date.getTime() - b.Date.getTime());
        if (filtered.length > 0) {
            filteredHistoricalSeasons.set(year, filtered);
        }
    });

    // Add current season
    filteredHistoricalSeasons.set(targetSeasonYear, currentSeason);

    // --- METRIC CALCULATIONS ---
    type MetricResult = { year: number; value: number };

    const computeMetric = (
        fn: (records: WeatherRecord[]) => number
    ): MetricResult[] => {
        const results: MetricResult[] = [];
        filteredHistoricalSeasons.forEach((records, year) => {
            results.push({ year, value: fn(records) });
        });
        return results;
    };

    // 1. Average Temperature
    const avgTempResults = computeMetric(recs =>
        d3.mean(recs, r => r['Avg Temp (°F)']) || 0
    );

    // 2. Total Snowfall
    const totalSnowResults = computeMetric(recs =>
        d3.sum(recs, r => r['Snowfall (in)'] || 0)
    );

    // 3. Total Precipitation
    const totalPrecipResults = computeMetric(recs =>
        d3.sum(recs, r => r['Precipitation (in)'] || 0)
    );

    // 4. Coldest Day (Min temp)
    const coldestDayResults = computeMetric(recs =>
        d3.min(recs, r => r['Min Temp (°F)']) || 0
    );

    // 5. Longest Warm Streak (days >= 32°F avg)
    const warmStreakResults = computeMetric(recs =>
        findLongestStreak(recs, r => r['Avg Temp (°F)'] >= 32)
    );

    // 6. Heating Degree Days (HDD)
    const hddResults = computeMetric(recs =>
        d3.sum(recs, r => r.HDD || Math.max(0, 65 - r['Avg Temp (°F)']))
    );

    // --- RANKING HELPER ---
    const buildComparison = (
        metric: string,
        unit: string,
        results: MetricResult[],
        higherIsBetter: boolean
    ): SeasonalComparison => {
        const sorted = [...results].sort((a, b) =>
            higherIsBetter ? b.value - a.value : a.value - b.value
        );

        const rank = sorted.findIndex(r => r.year === targetSeasonYear) + 1;
        const totalYears = sorted.length;
        const percentile = ((totalYears - rank) / totalYears) * 100;

        const currentEntry = results.find(r => r.year === targetSeasonYear);
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];

        return {
            metric,
            currentValue: currentEntry?.value || 0,
            rank,
            totalYears,
            percentile,
            historicalBest: { year: best.year, value: best.value },
            historicalWorst: { year: worst.year, value: worst.value },
            unit,
            higherIsBetter
        };
    };

    return [
        buildComparison('Average Temp', '°F', avgTempResults, false), // Lower is colder
        buildComparison('Total Snow', '"', totalSnowResults, true), // Higher is snowier
        buildComparison('Total Precip', '"', totalPrecipResults, true),
        buildComparison('Coldest Day', '°F', coldestDayResults, false), // Lower is colder
        buildComparison('Warm Streak', ' days', warmStreakResults, true),
        buildComparison('Heating Degrees', ' HDD', hddResults, true) // Higher = colder winter
    ];
}
