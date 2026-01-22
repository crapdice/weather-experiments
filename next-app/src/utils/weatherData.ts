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

export async function loadWeatherData(url: string): Promise<{ data: WeatherRecord[], stats: ClimateStats }> {
    const rawData = await d3.csv(url);

    const data: WeatherRecord[] = rawData.map((d: any) => {
        const date = new Date(d.Date);
        // Adjust for timezones if necessary, but UTC is usually fine for daily data
        return {
            Date: date,
            'Max Temp (°F)': +d['Max Temp (°F)'],
            'Min Temp (°F)': +d['Min Temp (°F)'],
            'Avg Temp (°F)': +d['Avg Temp (°F)'],
            DayOfYear: getDayOfYear(date),
            Year: date.getFullYear(),
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

        // ROC 1y (approx 365 days ago)
        if (i >= 365) {
            d.ROC1y = d['Avg Temp (°F)'] - data[i - 365]['Avg Temp (°F)'];
        }

        // Climatology
        const normals = climatologyMap.get(d.DayOfYear);
        if (normals) {
            d.MeanHigh = normals.high;
            d.MeanLow = normals.low;
        }
    }

    // --- Stats ---
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

    const stats: ClimateStats = {
        maxTemp: maxRec['Max Temp (°F)'],
        maxTempDate: maxRec.Date,
        minTemp: minRec['Min Temp (°F)'],
        minTempDate: minRec.Date,
        pulseDelta: recentAvg - avgTempAll, // Simplified version of pulse delta
        frostDays,
        heatDays,
        volatility,
        decadalDelta,
        lastUpdate: data[data.length - 1].Date
    };

    return { data, stats };
}

function getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}
