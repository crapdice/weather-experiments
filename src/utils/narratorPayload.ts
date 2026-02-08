import { ClimateStats, CityConfig } from '@/types/weather';
import SunCalc from 'suncalc';

export interface NarratorPayload {
    city: {
        name: string;
    };
    stats: {
        date: string;
        currentTemp: number;
        todayMax: number;
        todayMin: number;
        todayPercentile: number;
        zScore: number;
        analogYear: number | undefined;
        similarityScore: string | undefined;
        streakCount: number | undefined;
        streakType: string | undefined;
        lastSimilarDate: string;
        volatility: number;
        pulseDelta: number;
        decadalDelta: number;
        currentWind: number | undefined;
        currentGust: number | undefined;
        todayRain: number | undefined;
        todaySnow: number | undefined;
        sunrise: string | undefined;
        sunset: string | undefined;
        normalHigh: number | undefined;
        normalLow: number | undefined;
        normalAvg: number | undefined;
        analogForecast?: { date: string, high: number, low: number, avg: number }[];
    };
    seasonal: {
        rainRank: number | undefined;
        rainTotal: number | undefined;
        rainMedian: number | undefined;
        snowRank: number | undefined;
        snowTotal: number | undefined;
        snowMedian: number | undefined;
        comparisons: {
            metric: string;
            currentValue: number;
            rank: number;
            totalYears: number;
            percentile: number;
            unit: string;
        }[];
    };
    lookbackYoY: {
        period: string;
        current: number;
        previous: number;
        delta: number;
    }[];
}

export function prepareNarratorPayload(city: CityConfig, stats: ClimateStats): NarratorPayload {
    // Defensive: If stats is null or undefined, return a minimal payload
    if (!stats) {
        console.error("prepareNarratorPayload: stats is null or undefined");
        return {
            city: { name: city?.name || 'Unknown' },
            stats: {
                date: 'Today',
                currentTemp: 0, todayMax: 0, todayMin: 0, todayPercentile: 0, zScore: 0,
                analogYear: undefined, similarityScore: undefined, streakCount: undefined, streakType: undefined,
                lastSimilarDate: 'N/A', volatility: 0, pulseDelta: 0, decadalDelta: 0,
                currentWind: undefined, currentGust: undefined, todayRain: undefined, todaySnow: undefined,
                sunrise: undefined, sunset: undefined, normalHigh: undefined, normalLow: undefined, normalAvg: undefined,
                analogForecast: []
            },
            seasonal: { rainRank: undefined, rainTotal: undefined, rainMedian: undefined, snowRank: undefined, snowTotal: undefined, snowMedian: undefined, comparisons: [] },
            lookbackYoY: []
        };
    }

    // Ensure we have a valid Date object for SunCalc. 
    // Data coming from the API will have Date strings, not Date objects.
    let today: Date;
    try {
        today = stats.currentTempTime ? new Date(stats.currentTempTime) : new Date();
        if (isNaN(today.getTime())) today = new Date();
    } catch {
        today = new Date();
    }

    let sunTimes;
    try {
        sunTimes = SunCalc.getTimes(today, city?.lat ?? 41.8781, city?.lng ?? -87.6298);
    } catch {
        sunTimes = { sunrise: new Date(), sunset: new Date() };
    }

    const formatTime = (date: Date) => {
        if (!date || isNaN(date.getTime())) return 'N/A';
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const safeDate = (val: any): string => {
        if (!val) return 'N/A';
        try {
            const d = new Date(val);
            if (isNaN(d.getTime())) return 'N/A';
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return 'N/A';
        }
    };

    return {
        city: {
            name: city?.name || 'Unknown'
        },
        stats: {
            date: stats.currentTempTime ? safeDate(stats.currentTempTime) : 'Today',
            currentTemp: stats.currentTemp ?? 0,
            todayMax: stats.todayMax ?? 0,
            todayMin: stats.todayMin ?? 0,
            todayPercentile: stats.todayPercentile ?? 0,
            zScore: stats.zScore ?? 0,
            analogYear: stats.analogYear?.year,
            similarityScore: stats.analogYear ? ((stats.analogYear.similarityScore ?? 0) * 100).toFixed(1) : undefined,
            streakCount: stats.currentStreak?.count,
            streakType: stats.currentStreak?.type,
            lastSimilarDate: safeDate(stats.lastSimilarDate),
            volatility: stats.volatility ?? 0,
            pulseDelta: stats.pulseDelta ?? 0,
            decadalDelta: stats.decadalDelta ?? 0,
            currentWind: stats.currentWind,
            currentGust: stats.currentGust,
            todayRain: stats.todayRain,
            todaySnow: stats.todaySnow,
            sunrise: formatTime(sunTimes.sunrise),
            sunset: formatTime(sunTimes.sunset),
            normalHigh: stats.dailyNormal?.high,
            normalLow: stats.dailyNormal?.low,
            normalAvg: stats.dailyNormal?.avg,
            analogForecast: Array.isArray(stats.analogForecast) ? stats.analogForecast : [],
        },
        seasonal: {
            rainRank: stats.seasonalRain?.rank,
            rainTotal: stats.seasonalRain?.value,
            rainMedian: stats.seasonalMedians?.rain,
            snowRank: stats.seasonalSnow?.rank,
            snowTotal: stats.seasonalSnow?.value,
            snowMedian: stats.seasonalMedians?.snow,
            comparisons: Array.isArray(stats.seasonalComparisons) ? stats.seasonalComparisons.map(c => ({
                metric: c?.metric || '',
                currentValue: c?.currentValue ?? 0,
                rank: c?.rank ?? 0,
                totalYears: c?.totalYears ?? 0,
                percentile: c?.percentile ?? 0,
                unit: c?.unit || ''
            })) : []
        },
        lookbackYoY: Array.isArray(stats.lookbackYoY) ? stats.lookbackYoY.map(l => ({
            period: l?.period || '',
            current: l?.current ?? 0,
            previous: l?.previous ?? 0,
            delta: l?.delta ?? 0
        })) : []
    };
}
