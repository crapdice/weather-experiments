import * as d3 from 'd3';
import SunCalc from 'suncalc';
import { WeatherRecord, ClimateStats } from './weatherData';
import { calculateStats } from './statisticalEngine';

export function getMoonPhase(date: Date): number {
    return SunCalc.getMoonIllumination(date).phase;
}

export function getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

export function getSunTimes(date: Date): { Sunrise: Date, Sunset: Date } {
    const times = SunCalc.getTimes(date, 41.9742, -87.9073);
    return {
        Sunrise: times.sunrise,
        Sunset: times.sunset
    };
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
        } as WeatherRecord;
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
