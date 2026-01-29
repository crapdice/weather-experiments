import * as d3 from 'd3';
import { calculateZScore, calculatePercentileRank, findLongestRecentStreak, findAnalogYear, calculateStats, findLastSimilarDate, calculatePercentile } from './statisticalEngine';
import { calculateSeasonalRank } from './seasonalEngine';
import { processAndEnrich, getMoonPhase, getDayOfYear, getSunTimes } from './dataProcessor';

export interface SeasonalRank {
    rank: number;
    totalYears: number;
    value: number;
    percentile: number;
    seasonName: string;
}

export interface WeatherRecord {
    Date: Date;
    'Max Temp (°F)': number;
    'Min Temp (°F)': number;
    'Avg Temp (°F)': number;
    'Precipitation (in)': number;
    'Snowfall (in)': number;
    'Max Wind Speed (mph)': number;
    'Max Wind Gust (mph)': number;
    DayOfYear: number;
    Year: number;
    SMA7?: number;
    ROC1y?: number;
    MeanHigh?: number;
    MeanLow?: number;
    HDD?: number;
    GDD?: number;
    Sunrise?: Date;
    Sunset?: Date;
    MoonPhase?: number;
    Rain?: number;
    Snow?: number;
}

export interface ClimateStats {
    maxTemp: number;
    maxTempDate: Date;
    minTemp: number;
    minTempDate: Date;
    pulseDelta: number;
    frostDays: number;
    heatDays: number;
    volatility: number;
    decadalDelta: number;
    lastUpdate: Date;
    currentTemp?: number;
    currentPrecip?: number;
    currentTempTime?: Date;
    todayMax?: number;
    todayMin?: number;
    todayRain?: number;
    todaySnow?: number;
    currentWind?: number;
    currentGust?: number;
    todayPercentile?: number;
    lastSimilarDate?: Date;
    zScore?: number;
    currentStreak?: { count: number, startDate: Date, type: string };
    analogYear?: { year: number, similarityScore: number };
    seasonalRain?: SeasonalRank;
    seasonalSnow?: SeasonalRank;
}

async function fetchCurrentWeather(): Promise<{ temp: number, precip: number, wind: number, gust: number, time: Date, todayMax: number, todayMin: number, todayRain: number, todaySnow: number, recentHistory: WeatherRecord[] } | undefined> {
    try {
        const res = await fetch('/api/weather?type=current');
        if (res.ok) {
            const json = await res.json();
            if (json.current && json.current.temperature_2m !== undefined) {
                const history: WeatherRecord[] = [];
                if (json.daily && json.daily.time) {
                    for (let i = 0; i < json.daily.time.length; i++) {
                        const d = new Date(json.daily.time[i] + 'T12:00:00');
                        history.push({
                            Date: d,
                            'Max Temp (°F)': json.daily.temperature_2m_max?.[i] ?? 0,
                            'Min Temp (°F)': json.daily.temperature_2m_min?.[i] ?? 0,
                            'Avg Temp (°F)': json.daily.temperature_2m_mean?.[i] ?? 0,
                            'Precipitation (in)': (json.daily.precipitation_sum?.[i] || json.daily.rain_sum?.[i] || 0),
                            'Snowfall (in)': json.daily.snowfall_sum?.[i] || 0,
                            'Max Wind Speed (mph)': (json.daily.wind_speed_10m_max?.[i] || 0) * 0.621371,
                            'Max Wind Gust (mph)': (json.daily.wind_gusts_10m_max?.[i] || 0) * 0.621371,
                            DayOfYear: 0,
                            Year: d.getFullYear()
                        } as WeatherRecord);
                    }
                }

                return {
                    temp: json.current.temperature_2m,
                    precip: json.current.precipitation || 0,
                    wind: (json.current.wind_speed_10m || 0) * 0.621371,
                    gust: (json.current.wind_gusts_10m || 0) * 0.621371,
                    time: new Date(json.current.time),
                    todayMax: json.daily.temperature_2m_max?.[json.daily.time.length - 1] ?? json.current.temperature_2m,
                    todayMin: json.daily.temperature_2m_min?.[json.daily.time.length - 1] ?? json.current.temperature_2m,
                    todayRain: (json.daily.precipitation_sum?.[json.daily.time.length - 1] || json.daily.rain_sum?.[json.daily.time.length - 1] || 0),
                    todaySnow: json.daily.snowfall_sum?.[json.daily.time.length - 1] || 0,
                    recentHistory: history
                };
            }
        }
    } catch (e) {
        console.error("Weather service sync failed", e);
    }
    return undefined;
}

export async function loadWeatherData(url: string): Promise<{ data: WeatherRecord[], stats: ClimateStats }> {
    const targetUrl = url.includes('chicago_weather_50years.csv') || url.includes('chicago_weather_enriched.csv')
        ? '/data/chicago_weather_v86.csv'
        : url;

    const rawDataCSV = await d3.csv(targetUrl);
    const currentInfo = await fetchCurrentWeather();

    let mergedRawData: any[] = rawDataCSV;

    if (currentInfo && currentInfo.recentHistory) {
        const dataMap = new Map();
        rawDataCSV.forEach(d => {
            const key = new Date(d.Date).toISOString().split('T')[0];
            dataMap.set(key, d);
        });

        currentInfo.recentHistory.forEach(rec => {
            const key = rec.Date.toISOString().split('T')[0];
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
        });

        mergedRawData = Array.from(dataMap.values()).sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
    }

    const { data, stats } = processAndEnrich(mergedRawData);
    return finalizeResults(data, stats, currentInfo);
}

function finalizeResults(data: WeatherRecord[], stats: ClimateStats, currentInfo?: { temp: number, precip: number, wind: number, gust: number, time: Date, todayMax: number, todayMin: number, todayRain: number, todaySnow: number }) {
    if (currentInfo) {
        // Ensure today (from observation) exists in data
        const todayStr = currentInfo.time.toISOString().split('T')[0];
        const hasToday = data.some(d => d.Date.toISOString().split('T')[0] === todayStr);

        if (!hasToday) {
            const todayRec: WeatherRecord = {
                Date: new Date(todayStr + 'T12:00:00Z'),
                'Max Temp (°F)': currentInfo.todayMax,
                'Min Temp (°F)': currentInfo.todayMin,
                'Avg Temp (°F)': currentInfo.temp,
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

function hydrateRealtimeStats(stats: ClimateStats, data: WeatherRecord[], currentInfo: { temp: number, precip: number, wind: number, gust: number, time: Date, todayMax: number, todayMin: number, todayRain: number, todaySnow: number, recentHistory?: WeatherRecord[] }) {
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

    stats.zScore = calculateZScore(currentInfo.temp, historyForDay);
    stats.todayPercentile = calculatePercentileRank(currentInfo.temp, historyForDay);

    const recentHistory = data.slice(-30);
    stats.analogYear = findAnalogYear(recentHistory, data);

    const isFreezing = currentInfo.temp < 32;
    const streakFreezing = findLongestRecentStreak(data, d => isFreezing ? d['Avg Temp (°F)'] < 32 : d['Avg Temp (°F)'] >= 32);

    stats.currentStreak = {
        count: streakFreezing.count,
        startDate: streakFreezing.startDate,
        type: isFreezing ? 'Below Freezing' : 'Above Freezing'
    };

    stats.seasonalSnow = calculateSeasonalRank(data.filter(d => d.Date >= getSeasonStartDate(currentInfo.time)), data, 'snow');
    stats.seasonalRain = calculateSeasonalRank(data.filter(d => d.Date >= getSeasonStartDate(currentInfo.time)), data, 'rain');
    stats.lastSimilarDate = findLastSimilarDate(data, currentInfo.todayMax, currentInfo.todayMin);
}

function getSeasonStartDate(date: Date): Date {
    const month = date.getMonth();
    let seasonStartMonth = 11;
    if (month >= 2 && month <= 4) seasonStartMonth = 2; // Spring
    if (month >= 5 && month <= 7) seasonStartMonth = 5; // Summer
    if (month >= 8 && month <= 10) seasonStartMonth = 8; // Fall

    let startYear = date.getFullYear();
    if (month < seasonStartMonth) startYear--;
    return new Date(startYear, seasonStartMonth, 1);
}

export async function refreshWeatherData(currentData: WeatherRecord[]): Promise<{ data: WeatherRecord[], stats: ClimateStats }> {
    const currentInfo = await fetchCurrentWeather();
    try {
        const response = await fetch('/api/weather?type=forecast_past');
        if (!response.ok) throw new Error(`Weather API error`);

        const apiData = await response.json();
        if (!apiData.daily || !apiData.daily.time) {
            const stats = calculateStats(currentData);
            return finalizeResults(currentData, stats, currentInfo);
        }

        const newRecordsRaw = apiData.daily.time.map((time: string, i: number) => ({
            Date: time,
            'Max Temp (°F)': apiData.daily.temperature_2m_max?.[i] ?? 0,
            'Min Temp (°F)': apiData.daily.temperature_2m_min?.[i] ?? 0,
            'Avg Temp (°F)': apiData.daily.temperature_2m_mean?.[i] ?? 0,
            'Precipitation (in)': (apiData.daily.precipitation_sum?.[i] || apiData.daily.rain_sum?.[i] || 0),
            'Snowfall (in)': apiData.daily.snowfall_sum?.[i] || 0,
            'Max Wind Speed (mph)': apiData.daily.wind_speed_10m_max?.[i] || 0,
            'Max Wind Gust (mph)': apiData.daily.wind_gusts_10m_max?.[i] || 0,
        })).filter((r: any) => r['Avg Temp (°F)'] !== null && r['Max Temp (°F)'] !== null);

        const existingDates = new Set(currentData.map(d => d.Date.toISOString().split('T')[0]));
        const uniqueNew = newRecordsRaw.filter((r: any) => !existingDates.has(r.Date));

        if (uniqueNew.length === 0) {
            const stats = calculateStats(currentData);
            return finalizeResults(currentData, stats, currentInfo);
        }

        const rawCurrent = currentData.map(d => ({
            Date: formatDateKey(d.Date),
            'Max Temp (°F)': d['Max Temp (°F)'],
            'Min Temp (°F)': d['Min Temp (°F)'],
            'Avg Temp (°F)': d['Avg Temp (°F)'],
            'Precipitation (in)': d['Precipitation (in)'],
            'Snowfall (in)': d['Snowfall (in)'],
            'Max Wind Speed (mph)': d['Max Wind Speed (mph)'],
            'Max Wind Gust (mph)': d['Max Wind Gust (mph)'],
        }));

        const { data: finalData, stats: finalStats } = processAndEnrich([...rawCurrent, ...uniqueNew]);
        return finalizeResults(finalData, finalStats, currentInfo);
    } catch (e) {
        console.error("Refresh failed:", e);
        const stats = calculateStats(currentData);
        return finalizeResults(currentData, stats, currentInfo);
    }
}

export function formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
}

export { getDayOfYear, getMoonPhase, getSunTimes };
