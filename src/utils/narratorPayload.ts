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
    const today = stats.currentTempTime || new Date();
    const sunTimes = SunCalc.getTimes(today, city.lat, city.lng);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return {
        city: {
            name: city.name
        },
        stats: {
            date: stats.currentTempTime
                ? new Date(stats.currentTempTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Today',
            currentTemp: stats.currentTemp ?? 0,
            todayMax: stats.todayMax ?? 0,
            todayMin: stats.todayMin ?? 0,
            todayPercentile: stats.todayPercentile ?? 0,
            zScore: stats.zScore ?? 0,
            analogYear: stats.analogYear?.year,
            similarityScore: stats.analogYear ? (stats.analogYear.similarityScore * 100).toFixed(1) : undefined,
            streakCount: stats.currentStreak?.count,
            streakType: stats.currentStreak?.type,
            lastSimilarDate: stats.lastSimilarDate
                ? new Date(stats.lastSimilarDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'N/A',
            volatility: stats.volatility,
            pulseDelta: stats.pulseDelta,
            decadalDelta: stats.decadalDelta,
            currentWind: stats.currentWind,
            currentGust: stats.currentGust,
            todayRain: stats.todayRain,
            todaySnow: stats.todaySnow,
            sunrise: formatTime(sunTimes.sunrise),
            sunset: formatTime(sunTimes.sunset),
            normalHigh: stats.dailyNormal?.high,
            normalLow: stats.dailyNormal?.low,
            normalAvg: stats.dailyNormal?.avg,
        },
        seasonal: {
            rainRank: stats.seasonalRain?.rank,
            rainTotal: stats.seasonalRain?.value,
            rainMedian: stats.seasonalMedians?.rain,
            snowRank: stats.seasonalSnow?.rank,
            snowTotal: stats.seasonalSnow?.value,
            snowMedian: stats.seasonalMedians?.snow,
            comparisons: (stats.seasonalComparisons || []).map(c => ({
                metric: c.metric,
                currentValue: c.currentValue,
                rank: c.rank,
                totalYears: c.totalYears,
                percentile: c.percentile,
                unit: c.unit
            }))
        },
        lookbackYoY: (stats.lookbackYoY || []).map(l => ({
            period: l.period,
            current: l.current,
            previous: l.previous,
            delta: l.delta
        }))
    };
}
