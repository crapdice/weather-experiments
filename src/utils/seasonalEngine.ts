import { WeatherRecord, SeasonalRank, SeasonalComparison } from '../types/weather';
import * as d3 from 'd3';
import {
    getSeasonDayIndex,
    getEffectiveSeasonYear,
    getSeasonNameByDate,
    SeasonType,
    SEASONS
} from './seasonRegistry';
import { getDayOfYear, formatDateKey } from './dateUtils';


export function calculateSeasonalRank(
    currentData: WeatherRecord[],
    history: WeatherRecord[],
    metric: 'snow' | 'rain'
): SeasonalRank {
    if (currentData.length === 0) return { rank: 0, totalYears: 0, value: 0, percentile: 0, seasonName: 'Unknown' };

    const lastRecord = currentData[currentData.length - 1];
    const lastDate = lastRecord.Date;

    // Determine the relevant season type
    const isSnow = metric === 'snow';
    const seasonType: SeasonType = isSnow ? 'SnowYear' : getSeasonNameByDate(lastDate);
    const targetSeasonYear = getEffectiveSeasonYear(lastDate, seasonType);
    const currentDayIndex = getSeasonDayIndex(lastDate, seasonType);

    const field = isSnow ? 'Snowfall (in)' : 'Precipitation (in)';

    // Deduplicate history and currentData by date
    const dateMap = new Map<string, WeatherRecord>();
    [...history, ...currentData].forEach(d => {
        dateMap.set(formatDateKey(d.Date), d);
    });

    const allData = Array.from(dateMap.values());

    const recordsInSeason = allData.filter(d => {
        const type = isSnow ? 'SnowYear' : getSeasonNameByDate(d.Date);
        return type === seasonType && getSeasonDayIndex(d.Date, seasonType) <= currentDayIndex;
    });

    const totalsByYear = d3.rollup(recordsInSeason,
        (v) => d3.sum(v, d => d[field] || 0),
        (d) => getEffectiveSeasonYear(d.Date, seasonType)
    );

    const currentTotal = totalsByYear.get(targetSeasonYear) || 0;

    const allTotals = Array.from(totalsByYear.entries())
        .map(([year, total]) => ({ year, total }))
        .sort((a, b) => b.total - a.total);

    const rank = allTotals.findIndex(x => x.year === targetSeasonYear) + 1;
    const totalYears = allTotals.length;
    const percentile = ((totalYears - rank) / totalYears) * 100;

    return {
        rank,
        totalYears,
        value: currentTotal,
        percentile,
        seasonName: seasonType === 'SnowYear' ? 'Snow' : seasonType
    };
}


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
    currentData: WeatherRecord[],
    history: WeatherRecord[]
): SeasonalComparison[] {
    if (currentData.length === 0) return [];

    const lastDate = currentData[currentData.length - 1].Date;
    const currentSeasonName = getSeasonNameByDate(lastDate);

    // We calculate standard metrics for the current METEOROLOGICAL season
    // except Snow, which always uses the SnowYear (July-June)
    const snowType: SeasonType = 'SnowYear';
    const tempType: SeasonType = currentSeasonName;

    const currentSnowIdx = getSeasonDayIndex(lastDate, snowType);
    const currentTempIdx = getSeasonDayIndex(lastDate, tempType);
    const targetSnowYear = getEffectiveSeasonYear(lastDate, snowType);
    const targetTempYear = getEffectiveSeasonYear(lastDate, tempType);

    // Deduplicate history and currentData by date
    const dateMap = new Map<string, WeatherRecord>();
    [...history, ...currentData].forEach(d => {
        dateMap.set(formatDateKey(d.Date), d);
    });

    const allData = Array.from(dateMap.values());

    // Pre-filter records for efficiency
    const snowRecords = allData.filter(d => {
        const idx = getSeasonDayIndex(d.Date, snowType);
        return idx >= 0 && idx <= currentSnowIdx;
    });

    const tempRecords = allData.filter(d => {
        const dType = getSeasonNameByDate(d.Date);
        const idx = getSeasonDayIndex(d.Date, tempType);
        // Only include days that are in the SAME meteorological season as the current day
        return dType === currentSeasonName && idx >= 0 && idx <= currentTempIdx;
    });

    const groupedSnow = d3.group(snowRecords, d => getEffectiveSeasonYear(d.Date, snowType));
    const groupedTemp = d3.group(tempRecords, d => getEffectiveSeasonYear(d.Date, tempType));

    type MetricResult = { year: number; value: number };

    const compute = (groups: Map<number, WeatherRecord[]>, fn: (recs: WeatherRecord[]) => number): MetricResult[] => {
        const results: MetricResult[] = [];
        groups.forEach((recs, year) => {
            results.push({ year, value: fn(recs) });
        });
        return results;
    };

    const metrics = [
        {
            name: 'Average Temp',
            unit: '°F',
            results: compute(groupedTemp, recs => d3.mean(recs, r => r['Avg Temp (°F)']) || 0),
            higherIsBetter: false,
            targetYear: targetTempYear
        },
        {
            name: 'Total Snow',
            unit: '"',
            results: compute(groupedSnow, recs => d3.sum(recs, r => r['Snowfall (in)'] || 0)),
            higherIsBetter: true,
            targetYear: targetSnowYear
        },
        {
            name: 'Total Precip',
            unit: '"',
            results: compute(groupedTemp, recs => d3.sum(recs, r => r['Precipitation (in)'] || 0)),
            higherIsBetter: true,
            targetYear: targetTempYear
        },
        {
            name: 'Coldest Day',
            unit: '°F',
            results: compute(groupedTemp, recs => d3.min(recs, r => r['Min Temp (°F)']) || 0),
            higherIsBetter: false,
            targetYear: targetTempYear
        },
        {
            name: 'Warm Streak',
            unit: ' d',
            results: compute(groupedTemp, recs => findLongestStreak(recs, r => r['Avg Temp (°F)'] >= 32)),
            higherIsBetter: true,
            targetYear: targetTempYear
        },
        {
            name: 'Heating Degrees',
            unit: ' HDD',
            results: compute(groupedTemp, recs => d3.sum(recs, r => r.HDD || 0)),
            higherIsBetter: true,
            targetYear: targetTempYear
        }
    ];

    return metrics.map(m => {
        const sorted = [...m.results].sort((a, b) => m.higherIsBetter ? b.value - a.value : a.value - b.value);
        const rank = sorted.findIndex(r => r.year === m.targetYear) + 1;
        const totalYears = sorted.length;
        const currentEntry = m.results.find(r => r.year === m.targetYear);

        return {
            metric: m.name,
            currentValue: currentEntry?.value || 0,
            rank,
            totalYears,
            percentile: ((totalYears - rank) / totalYears) * 100,
            historicalBest: { year: sorted[0].year, value: sorted[0].value },
            historicalWorst: { year: sorted[sorted.length - 1].year, value: sorted[sorted.length - 1].value },
            unit: m.unit,
            higherIsBetter: m.higherIsBetter
        };
    });
}

