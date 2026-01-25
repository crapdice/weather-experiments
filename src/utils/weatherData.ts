import * as d3 from 'd3';
import { calculateZScore, calculatePercentileRank, findLongestRecentStreak, findAnalogYear } from './statisticalEngine';
import { calculateSeasonalRank, SeasonalRank } from './seasonalEngine';

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
    todayPercentile?: number; // 0-100 rank of today's mean temp vs history
    lastSimilarDate?: Date;
    zScore?: number;
    currentStreak?: { count: number, startDate: Date, type: string };
    analogYear?: { year: number, similarityScore: number };
    seasonalRain?: SeasonalRank;
    seasonalSnow?: SeasonalRank;
}

export function processAndEnrich(rawData: any[]): { data: WeatherRecord[], stats: ClimateStats } {
    const data: WeatherRecord[] = rawData.map((d: any) => {
        const date = new Date(d.Date);
        return {
            Date: date,
            'Max Temp (°F)': +d['Max Temp (°F)'],
            'Min Temp (°F)': +d['Min Temp (°F)'],
            'Avg Temp (°F)': +d['Avg Temp (°F)'],
            'Precipitation (in)': +d['Precipitation (in)'] || 0,
            'Snowfall (in)': +d['Snowfall (in)'] || 0,
            'Max Wind Speed (mph)': +d['Max Wind Speed (mph)'] || 0,
            'Max Wind Gust (mph)': +d['Max Wind Gust (mph)'] || 0,
            DayOfYear: getDayOfYear(date),
            Year: date.getFullYear(),
            MoonPhase: getMoonPhase(date),
            Rain: +d['Precipitation (in)'] || 0,
            Snow: +d['Snowfall (in)'] || 0,
            ...getSunTimes(date),
        };
    }).filter(d => !isNaN(d.Date.getTime()));

    // Sort by date
    data.sort((a, b) => a.Date.getTime() - b.Date.getTime());

    // --- Calculate Climatology (50-year seasonal normals) ---
    const climatologyMap = new Map<number, { high: number, low: number }>();
    const doyGroups = d3.group(data, d => d.DayOfYear);

    doyGroups.forEach((records, doy) => {
        climatologyMap.set(doy, {
            high: d3.mean(records, r => r['Max Temp (°F)']) || 0,
            low: d3.mean(records, r => r['Min Temp (°F)']) || 0
        });
    });

    // --- Enrich with Analytics ---
    for (let i = 0; i < data.length; i++) {
        const d = data[i];

        // SMA 7
        if (i >= 6) {
            const slice = data.slice(i - 6, i + 1);
            d.SMA7 = d3.mean(slice, r => r['Avg Temp (°F)']);
        }

        // ROC 1y
        if (i >= 365) {
            d.ROC1y = d['Avg Temp (°F)'] - data[i - 365]['Avg Temp (°F)'];
        }

        // Climatology
        const normals = climatologyMap.get(d.DayOfYear);
        if (normals) {
            d.MeanHigh = normals.high;
            d.MeanLow = normals.low;
        }

        // HDD (Base 65°F) - Energy demand for heating
        d.HDD = Math.max(0, 65 - d['Avg Temp (°F)']);
        // GDD (Base 50°F) - Crop heat accumulation
        d.GDD = Math.max(0, d['Avg Temp (°F)'] - 50);
    }

    let stats = calculateStats(data);
    return { data, stats };
}

async function fetchCurrentWeather(): Promise<{ temp: number, precip: number, wind: number, gust: number, time: Date, todayMax: number, todayMin: number, todayRain: number, todaySnow: number } | undefined> {
    try {
        const res = await fetch('/api/weather?type=current');
        if (res.ok) {
            const json = await res.json();
            if (json.current && json.current.temperature_2m !== undefined) {
                return {
                    temp: json.current.temperature_2m,
                    precip: json.current.precipitation || 0,
                    wind: (json.current.wind_speed_10m || 0) * 0.621371,
                    gust: (json.current.wind_gusts_10m || 0) * 0.621371,
                    time: new Date(json.current.time),
                    todayMax: json.daily.temperature_2m_max[0],
                    todayMin: json.daily.temperature_2m_min[0],
                    todayRain: json.daily.rain_sum?.[0] || 0,
                    todaySnow: json.daily.snowfall_sum?.[0] || 0
                };
            }
        }
    } catch (e) {
        // Internal errors are logged but not exposed with full external URLs
        console.error("Weather service sync failed");
    }
    return undefined;
}

function calculateStats(data: WeatherRecord[], updatedStats?: ClimateStats): ClimateStats {
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

function findLastSimilarDate(data: WeatherRecord[], todayMax?: number, todayMin?: number): Date | undefined {
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

function calculatePercentile(data: WeatherRecord[], todayMax?: number, todayMin?: number): number | undefined {
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

export async function loadWeatherData(url: string): Promise<{ data: WeatherRecord[], stats: ClimateStats }> {
    // Point to the new enriched dataset by default if the url is the old one
    const targetUrl = url.includes('chicago_weather_50years.csv') || url.includes('chicago_weather_enriched.csv')
        ? '/data/chicago_weather_v86.csv'
        : url;

    const rawData = await d3.csv(targetUrl);
    const result = processAndEnrich(rawData);
    const data = result.data; // Alias for easier access

    const currentInfo = await fetchCurrentWeather();
    if (currentInfo) {
        // Statistical Engine Integrations
        hydrateRealtimeStats(result.stats, result.data, currentInfo);
    }

    return result;
}

function hydrateRealtimeStats(stats: ClimateStats, data: WeatherRecord[], currentInfo: { temp: number, precip: number, wind: number, gust: number, time: Date, todayMax: number, todayMin: number, todayRain: number, todaySnow: number }) {
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

    // 1. Sigma Score
    stats.zScore = calculateZScore(currentInfo.temp, historyForDay);

    // 2. Percentile
    stats.todayPercentile = calculatePercentileRank(currentInfo.temp, historyForDay);

    // 3. Analog Year
    const recentHistory = data.slice(-30);
    const analog = findAnalogYear(recentHistory, data);
    stats.analogYear = analog;

    // 4. Streak
    // "Consecutive days fitting the current mode (Freezing or Thawing)"
    const isFreezing = currentInfo.temp < 32;
    const streakFreezing = findLongestRecentStreak(data, d => isFreezing ? d['Avg Temp (°F)'] < 32 : d['Avg Temp (°F)'] >= 32);

    stats.currentStreak = {
        count: streakFreezing.count,
        startDate: streakFreezing.startDate,
        type: isFreezing ? 'Below Freezing' : 'Above Freezing'
    };

    // 5. Seasonal Rank
    // Define "Season so far" from most recent record's season start
    // Winter: Dec 1. Spring: Mar 1. Summer: Jun 1. Fall: Sept 1.
    const lastDate = currentInfo.time;
    const month = lastDate.getMonth();
    let seasonStartMonth = 11; // Winter default
    if (month >= 2 && month <= 4) seasonStartMonth = 2; // Spring
    if (month >= 5 && month <= 7) seasonStartMonth = 5; // Summer
    if (month >= 8 && month <= 10) seasonStartMonth = 8; // Fall

    let startYear = lastDate.getFullYear();
    if (month < seasonStartMonth) startYear--; // Handle Jan/Feb belonging to previous Dec's winter start
    if (month === 11 && seasonStartMonth === 11) startYear = lastDate.getFullYear(); // Dec 1 starts in current year

    const seasonStartDate = new Date(startYear, seasonStartMonth, 1);

    // Filter "Current Season" records from the main dataset
    const currentSeasonData = data.filter(d => d.Date >= seasonStartDate);

    // We need to add the "Simulated" today record if it's not in 'data' yet (often it isn't if refreshing)
    // But 'hydrate' modifies stats, doesn't add rows.
    // We will pass filtered data to engine.

    stats.seasonalSnow = calculateSeasonalRank(currentSeasonData, data, 'snow');
    stats.seasonalRain = calculateSeasonalRank(currentSeasonData, data, 'rain');

    // Restore last similar date logic if we want it
    stats.lastSimilarDate = findLastSimilarDate(data, currentInfo.todayMax, currentInfo.todayMin);
}

export async function refreshWeatherData(currentData: WeatherRecord[]): Promise<{ data: WeatherRecord[], stats: ClimateStats }> {
    const currentInfo = await fetchCurrentWeather();
    try {
        const response = await fetch('/api/weather?type=forecast_past');
        if (!response.ok) throw new Error(`Weather API error`);

        const apiData = await response.json();

        if (!apiData.daily || !apiData.daily.time) {
            return ensureTodayRecord(currentData, currentInfo);
        }

        const newRecordsRaw = apiData.daily.time.map((time: string, i: number) => ({
            Date: time,
            'Max Temp (°F)': apiData.daily.temperature_2m_max[i],
            'Min Temp (°F)': apiData.daily.temperature_2m_min[i],
            'Avg Temp (°F)': apiData.daily.temperature_2m_mean[i],
            'Precipitation (in)': apiData.daily.precipitation_sum[i],
            'Snowfall (in)': apiData.daily.snowfall_sum[i],
            'Max Wind Speed (mph)': apiData.daily.wind_speed_10m_max[i],
            'Max Wind Gust (mph)': apiData.daily.wind_gusts_10m_max[i],
        })).filter((r: any) => r['Avg Temp (°F)'] !== null && r['Max Temp (°F)'] !== null);

        // Deduplicate
        const existingDates = new Set(currentData.map(d => d.Date.toISOString().split('T')[0]));
        const uniqueNew = newRecordsRaw.filter((r: any) => !existingDates.has(r.Date));

        if (uniqueNew.length === 0) {
            return ensureTodayRecord(currentData, currentInfo);
        };

        // Convert existing records back to raw format for re-processing
        const rawCurrent = currentData.map(d => ({
            Date: d.Date.toISOString().split('T')[0],
            'Max Temp (°F)': d['Max Temp (°F)'],
            'Min Temp (°F)': d['Min Temp (°F)'],
            'Avg Temp (°F)': d['Avg Temp (°F)'],
            'Precipitation (in)': d['Precipitation (in)'],
            'Snowfall (in)': d['Snowfall (in)'],
            'Max Wind Speed (mph)': d['Max Wind Speed (mph)'],
            'Max Wind Gust (mph)': d['Max Wind Gust (mph)'],
        }));

        const { data: finalData } = processAndEnrich([...rawCurrent, ...uniqueNew]);
        return ensureTodayRecord(finalData, currentInfo);
    } catch (e) {
        console.error("Refresh failed:", e);
        return ensureTodayRecord(currentData, currentInfo);
    }
}

function ensureTodayRecord(data: WeatherRecord[], currentInfo?: { temp: number, precip: number, wind: number, gust: number, time: Date, todayMax: number, todayMin: number, todayRain: number, todaySnow: number }): { data: WeatherRecord[], stats: ClimateStats } {
    const todayStr = new Date().toISOString().split('T')[0];
    const hasToday = data.some(d => d.Date.toISOString().split('T')[0] === todayStr);

    if (!hasToday && currentInfo) {
        const todayRecord: WeatherRecord = {
            Date: new Date(todayStr + 'T12:00:00'), // Noon today
            'Max Temp (°F)': currentInfo.temp,
            'Min Temp (°F)': currentInfo.temp,
            'Avg Temp (°F)': currentInfo.temp,
            DayOfYear: getDayOfYear(new Date()),
            Year: new Date().getFullYear(),
            'Precipitation (in)': 0,
            'Snowfall (in)': 0,
            'Max Wind Speed (mph)': 0,
            'Max Wind Gust (mph)': 0,
        };
        const newData = [...data, todayRecord];
        // Re-enrich to get SMA7 etc
        const result = processAndEnrich(newData.map(d => ({
            Date: formatDateKey(d.Date),
            'Max Temp (°F)': d['Max Temp (°F)'],
            'Min Temp (°F)': d['Min Temp (°F)'],
            'Avg Temp (°F)': d['Avg Temp (°F)'],
            'Precipitation (in)': d['Precipitation (in)'],
            'Snowfall (in)': d['Snowfall (in)'],
            'Max Wind Speed (mph)': d['Max Wind Speed (mph)'],
            'Max Wind Gust (mph)': d['Max Wind Gust (mph)'],
        })));

        hydrateRealtimeStats(result.stats, result.data, currentInfo);
        return result;
    }

    const stats = calculateStats(data);
    if (currentInfo) {
        hydrateRealtimeStats(stats, data, currentInfo);
    }
    return { data, stats };
}

import SunCalc from 'suncalc';

function getMoonPhase(date: Date): number {
    return SunCalc.getMoonIllumination(date).phase;
}

function getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

function getSunTimes(date: Date): { Sunrise: Date, Sunset: Date } {
    const times = SunCalc.getTimes(date, 41.9742, -87.9073);
    return {
        Sunrise: times.sunrise,
        Sunset: times.sunset
    };
}


export function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
