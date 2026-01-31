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
