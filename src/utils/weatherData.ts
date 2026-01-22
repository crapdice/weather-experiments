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
}

export function processAndEnrich(rawData: any[]): { data: WeatherRecord[], stats: ClimateStats } {
    const data: WeatherRecord[] = rawData.map((d: any) => {
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

    return { data, stats: calculateStats(data) };
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

        const precipUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=41.9742&longitude=-87.9073&start_date=${startStr}&end_date=${endStr}&daily=rain_sum,snowfall_sum&timezone=America%2FChicago`;
        const res = await fetch(precipUrl);
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

    return result;
}

export async function refreshWeatherData(currentData: WeatherRecord[]): Promise<{ data: WeatherRecord[], stats: ClimateStats }> {
    try {
        // Use Forecast API with past_days=7 for more reliable real-time updates
        const url = `https://api.open-meteo.com/v1/forecast?latitude=41.9742&longitude=-87.9073&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,rain_sum,snowfall_sum&temperature_unit=fahrenheit&timezone=America%2FChicago&past_days=7&forecast_days=1`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Weather API error: ${response.statusText}`);

        const apiData = await response.json();

        if (!apiData.daily || !apiData.daily.time) {
            return { data: currentData, stats: calculateStats(currentData) };
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

        if (uniqueNew.length === 0) return { data: currentData, stats: calculateStats(currentData) };

        // Convert existing records back to raw format
        const rawCurrent = currentData.map(d => ({
            Date: d.Date.toISOString().split('T')[0],
            'Max Temp (°F)': d['Max Temp (°F)'],
            'Min Temp (°F)': d['Min Temp (°F)'],
            'Avg Temp (°F)': d['Avg Temp (°F)'],
            Rain: d.Rain,
            Snow: d.Snow,
        }));

        return processAndEnrich([...rawCurrent, ...uniqueNew]);
    } catch (e) {
        console.error("Refresh failed:", e);
        return { data: currentData, stats: calculateStats(currentData) };
    }
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

export function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
