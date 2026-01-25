import * as d3 from 'd3';

export interface WeatherRecord {
    Date: Date;
    'Max Temp (°F)': number;
    'Min Temp (°F)': number;
    'Avg Temp (°F)': number;
    DayOfYear: number;
    Year: number;
    SMA7?: number;
    ROC1y?: number;
    MeanHigh?: number;
    MeanLow?: number;
    Rain?: number;
    Snow?: number;
    MoonPhase?: number;
    HDD?: number;
    GDD?: number;
    Sunrise?: Date;
    Sunset?: Date;
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
}

export function processAndEnrich(rawData: any[]): { data: WeatherRecord[], stats: ClimateStats } {
    const data: WeatherRecord[] = rawData.map((d: WeatherRecord) => {
        const date = new Date(d.Date);
        return {
            Date: date,
            'Max Temp (°F)': +d['Max Temp (°F)'],
            'Min Temp (°F)': +d['Min Temp (°F)'],
            'Avg Temp (°F)': +d['Avg Temp (°F)'],
            Rain: d.Rain !== undefined ? +d.Rain : 0,
            Snow: d.Snow !== undefined ? +d.Snow : 0,
            DayOfYear: getDayOfYear(date),
            Year: date.getFullYear(),
            MoonPhase: getMoonPhase(date),
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

    const stats = calculateStats(data);
    return { data, stats };
}

async function fetchCurrentWeather(): Promise<{ temp: number, precip: number, time: Date, todayMax: number, todayMin: number } | undefined> {
    try {
        const res = await fetch('/api/weather?type=current');
        if (res.ok) {
            const json = await res.json();
            if (json.current && json.current.temperature_2m !== undefined) {
                return {
                    temp: json.current.temperature_2m,
                    precip: json.current.precipitation || 0,
                    time: new Date(json.current.time),
                    todayMax: json.daily.temperature_2m_max[0],
                    todayMin: json.daily.temperature_2m_min[0]
                };
            }
        }
    } catch (e) {
        // Internal errors are logged but not exposed with full external URLs
        console.error("Weather service sync failed");
    }
    return undefined;
}

function calculateStats(data: WeatherRecord[]): ClimateStats {
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

    const firstDecade = data.filter(d => d.Year <= 1984);
    const lastDecade = data.filter(d => d.Year >= 2016);
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
        lastUpdate: data[data.length - 1].Date
    };
}

export async function loadWeatherData(url: string): Promise<{ data: WeatherRecord[], stats: ClimateStats }> {
    const rawData = await d3.csv(url);
    const result = processAndEnrich(rawData);

    // Proactively fetch historical precipitation for the last 5 years to fill the gap
    try {
        const end = new Date();
        const start = new Date();
        start.setFullYear(end.getFullYear() - 5);

        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        const res = await fetch(`/api/weather?type=archive&start=${startStr}&end=${endStr}`);
        if (res.ok) {
            const apiData = await res.json();
            if (apiData.daily && apiData.daily.time) {
                const precipMap = new Map();
                apiData.daily.time.forEach((t: string, i: number) => {
                    precipMap.set(t, {
                        rain: apiData.daily.rain_sum[i],
                        snow: apiData.daily.snowfall_sum[i] * 0.393701
                    });
                });

                result.data.forEach(d => {
                    const dateStr = formatDateKey(d.Date);
                    if (precipMap.has(dateStr)) {
                        const vals = precipMap.get(dateStr);
                        d.Rain = vals.rain;
                        d.Snow = vals.snow;
                    }
                });
            }
        }
    } catch (e) {
        console.error("Historical precip fetch failed:", e);
    }

    const currentInfo = await fetchCurrentWeather();
    if (currentInfo) {
        result.stats.currentTemp = currentInfo.temp;
        result.stats.currentPrecip = currentInfo.precip;
        result.stats.currentTempTime = currentInfo.time;
        result.stats.todayMax = currentInfo.todayMax;
        result.stats.todayMin = currentInfo.todayMin;
    }

    return result;
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
            Rain: apiData.daily.rain_sum[i],
            Snow: apiData.daily.snowfall_sum[i] * 0.393701, // Convert cm to inches
        })).filter((r: any) => r['Avg Temp (°F)'] !== null && r['Max Temp (°F)'] !== null);

        // Deduplicate
        const existingDates = new Set(currentData.map(d => d.Date.toISOString().split('T')[0]));
        const uniqueNew = newRecordsRaw.filter((r: any) => !existingDates.has(r.Date));

        if (uniqueNew.length === 0) {
            // Even if no new daily records, we must ensure today's partial record is present for the charts
            return ensureTodayRecord(currentData, currentInfo);
        };

        // Convert existing records back to raw format
        const rawCurrent = currentData.map(d => ({
            Date: d.Date.toISOString().split('T')[0],
            'Max Temp (°F)': d['Max Temp (°F)'],
            'Min Temp (°F)': d['Min Temp (°F)'],
            'Avg Temp (°F)': d['Avg Temp (°F)'],
            Rain: d.Rain,
            Snow: d.Snow,
        }));

        const { data: finalData } = processAndEnrich([...rawCurrent, ...uniqueNew]);
        return ensureTodayRecord(finalData, currentInfo);
    } catch (e) {
        console.error("Refresh failed:", e);
        return ensureTodayRecord(currentData, currentInfo);
    }
}

function ensureTodayRecord(data: WeatherRecord[], currentInfo?: { temp: number, precip: number, time: Date, todayMax: number, todayMin: number }): { data: WeatherRecord[], stats: ClimateStats } {
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
            Rain: 0,
            Snow: 0,
        };
        const newData = [...data, todayRecord];
        // Re-enrich to get SMA7 etc
        const result = processAndEnrich(newData.map(d => ({
            Date: d.Date.toISOString().split('T')[0],
            'Max Temp (°F)': d['Max Temp (°F)'],
            'Min Temp (°F)': d['Min Temp (°F)'],
            'Avg Temp (°F)': d['Avg Temp (°F)'],
            Rain: d.Rain,
            Snow: d.Snow,
        })));

        result.stats.currentTemp = currentInfo.temp;
        result.stats.currentPrecip = currentInfo.precip;
        result.stats.currentTempTime = currentInfo.time;
        result.stats.todayMax = currentInfo.todayMax;
        result.stats.todayMin = currentInfo.todayMin;
        return result;
    }

    const stats = calculateStats(data);
    if (currentInfo) {
        stats.currentTemp = currentInfo.temp;
        stats.currentPrecip = currentInfo.precip;
        stats.currentTempTime = currentInfo.time;
        stats.todayMax = currentInfo.todayMax;
        stats.todayMin = currentInfo.todayMin;
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
