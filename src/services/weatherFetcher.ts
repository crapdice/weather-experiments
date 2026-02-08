import { WeatherRecord, ClimateStats, WeatherFetchResult, CityConfig } from '../types/weather';
import { calculateStats } from '../utils/statisticalEngine';
import { processAndEnrich } from '../utils/dataProcessor';
import { finalizeResults } from '../utils/weatherProcessor';

const getBaseUrl = () => {
    if (typeof window !== 'undefined') return ''; // Browser should use relative path
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return `http://localhost:3000`; // Fallback for local development server
};

export async function fetchCurrentWeather(lat = 41.9742, lng = -87.9073): Promise<WeatherFetchResult | undefined> {
    const baseUrl = getBaseUrl();
    try {
        const res = await fetch(`${baseUrl}/api/weather?type=current&lat=${lat}&lng=${lng}`);
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
                } as WeatherFetchResult;
            }
        }
    } catch (e) {
        console.error("Weather service sync failed", e);
    }
    return undefined;
}

export async function refreshWeatherData(
    currentData: WeatherRecord[],
    city?: CityConfig
): Promise<{ data: WeatherRecord[], stats: ClimateStats }> {
    const lat = city?.lat ?? 41.9742;
    const lng = city?.lng ?? -87.9073;
    const baseUrl = getBaseUrl();

    const currentInfo = await fetchCurrentWeather(lat, lng);
    try {
        const response = await fetch(`${baseUrl}/api/weather?type=forecast_past&lat=${lat}&lng=${lng}`);
        if (!response.ok) throw new Error(`Weather API error`);

        const apiData = await response.json();
        if (!apiData.daily || !apiData.daily.time) {
            const stats = calculateStats(currentData);
            return finalizeResults(currentData, stats, currentInfo);
        }

        const newRecordsRaw = apiData.daily.time.map((time: string, i: number) => ({
            Date: new Date(time + 'T12:00:00Z'),
            'Max Temp (°F)': apiData.daily.temperature_2m_max?.[i] ?? 0,
            'Min Temp (°F)': apiData.daily.temperature_2m_min?.[i] ?? 0,
            'Avg Temp (°F)': apiData.daily.temperature_2m_mean?.[i] ?? 0,
            'Precipitation (in)': (apiData.daily.precipitation_sum?.[i] || apiData.daily.rain_sum?.[i] || 0),
            'Snowfall (in)': apiData.daily.snowfall_sum?.[i] || 0,
            'Max Wind Speed (mph)': apiData.daily.wind_speed_10m_max?.[i] || 0,
            'Max Wind Gust (mph)': apiData.daily.wind_gusts_10m_max?.[i] || 0,
        })).filter((r: WeatherRecord) => r['Avg Temp (°F)'] !== null && r['Max Temp (°F)'] !== null);

        const existingDates = new Set(currentData.map(d => d.Date.toISOString().split('T')[0]));
        const uniqueNew = newRecordsRaw.filter((r: WeatherRecord) => !existingDates.has(r.Date.toISOString().split('T')[0]));

        if (uniqueNew.length === 0) {
            const stats = calculateStats(currentData);
            return finalizeResults(currentData, stats, currentInfo);
        }

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

        const { data: finalData, stats: finalStats } = processAndEnrich([...rawCurrent, ...uniqueNew]);
        return finalizeResults(finalData, finalStats, currentInfo);
    } catch (e) {
        console.error("Refresh failed:", e);
        const stats = calculateStats(currentData);
        return finalizeResults(currentData, stats, currentInfo);
    }
}
