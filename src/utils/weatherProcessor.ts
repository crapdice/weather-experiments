import { WeatherRecord, ClimateStats, WeatherFetchResult } from '../types/weather';
import { calculateStats, calculateZScore, calculatePercentileRank, findLongestRecentStreak, findAnalogYear, findLastSimilarDate } from './statisticalEngine';
import { calculateSeasonalRank, calculateSeasonalComparisons } from './seasonalEngine';
import { getDayOfYear } from './dateUtils';
import { getSeasonNameByDate } from './seasonRegistry';
import SunCalc from 'suncalc';

export function finalizeResults(data: WeatherRecord[], stats: ClimateStats, currentInfo?: WeatherFetchResult) {
    if (currentInfo) {
        // Ensure today (from observation) exists in data
        const todayStr = currentInfo.time.toISOString().split('T')[0];
        const hasToday = data.some(d => d.Date.toISOString().split('T')[0] === todayStr);

        if (!hasToday) {
            const todayRec: WeatherRecord = {
                Date: new Date(todayStr + 'T12:00:00Z'),
                'Max Temp (°F)': currentInfo.todayMax,
                'Min Temp (°F)': currentInfo.todayMin,
                'Avg Temp (°F)': (currentInfo.todayMax + currentInfo.todayMin) / 2,
                'Precipitation (in)': currentInfo.todayRain,
                'Snowfall (in)': currentInfo.todaySnow,
                'Max Wind Speed (mph)': currentInfo.wind,
                'Max Wind Gust (mph)': currentInfo.gust,
                DayOfYear: getDayOfYear(new Date()),
                Year: new Date().getFullYear()
            };
            data.push(todayRec);
            data.sort((a, b) => a.Date.getTime() - b.Date.getTime());
            // Recalculate stats since we added a record
            Object.assign(stats, calculateStats(data));
        }

        hydrateRealtimeStats(stats, data, currentInfo);
    }
    return { data, stats };
}

export function hydrateRealtimeStats(stats: ClimateStats, data: WeatherRecord[], currentInfo: WeatherFetchResult) {
    stats.currentTemp = currentInfo.temp;
    stats.currentPrecip = currentInfo.precip;
    stats.currentTempTime = currentInfo.time;
    stats.todayMax = currentInfo.todayMax;
    stats.todayMin = currentInfo.todayMin;
    stats.todayRain = currentInfo.todayRain;
    stats.todaySnow = currentInfo.todaySnow;
    stats.currentWind = currentInfo.wind;
    stats.currentGust = currentInfo.gust;

    const doy = getDayOfYear(new Date());
    const historyForDay = data.filter(d => d.DayOfYear === doy).map(d => d['Avg Temp (°F)']);

    const dailyProjectedMean = (currentInfo.todayMax + currentInfo.todayMin) / 2;
    stats.zScore = calculateZScore(dailyProjectedMean, historyForDay);
    stats.todayPercentile = calculatePercentileRank(dailyProjectedMean, historyForDay);

    const recentHistory = data.slice(-30);
    const analog = findAnalogYear(recentHistory, data);
    stats.analogYear = analog;

    // Generate a 7-day "forecast" based on the analog year
    if (analog && analog.year > 0) {
        const todayDoy = getDayOfYear(currentInfo.time);
        const forecastDays = [];
        for (let i = 1; i <= 7; i++) {
            const targetDoy = ((todayDoy + i - 1) % 366) + 1;
            const match = data.find(d => d.Year === analog.year && d.DayOfYear === targetDoy);
            if (match) {
                forecastDays.push({
                    date: match.Date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    high: match['Max Temp (°F)'],
                    low: match['Min Temp (°F)'],
                    avg: match['Avg Temp (°F)']
                });
            }
        }
        stats.analogForecast = forecastDays;
    }

    const isFreezing = currentInfo.temp < 32;
    const streakFreezing = findLongestRecentStreak(data, d => isFreezing ? d['Avg Temp (°F)'] < 32 : d['Avg Temp (°F)'] >= 32);

    stats.currentStreak = {
        count: streakFreezing.count,
        startDate: streakFreezing.startDate,
        type: isFreezing ? 'Below Freezing' : 'Above Freezing'
    };

    const now = currentInfo.time;

    // Core seasonal ranks
    stats.seasonalSnow = calculateSeasonalRank(data, data, 'snow');
    stats.seasonalRain = calculateSeasonalRank(data, data, 'rain');
    stats.lastSimilarDate = findLastSimilarDate(data, currentInfo.todayMax, currentInfo.todayMin);

    // Hydrate sun times
    try {
        const sunTimes = SunCalc.getTimes(currentInfo.time, 41.9742, -87.9073); // Defaulting to Chicago coordinates if none provided
        const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        stats.sunrise = formatTime(sunTimes.sunrise);
        stats.sunset = formatTime(sunTimes.sunset);
    } catch (e) {
        console.error("Failed to hydrate sun times", e);
    }

    // Pass the full dataset as both current and history context. 
    stats.seasonalComparisons = calculateSeasonalComparisons(data, data);
}
