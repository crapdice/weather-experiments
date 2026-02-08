import { useState, useEffect } from 'react';
import { loadWeatherData } from '@/utils/weatherData';
import { refreshWeatherData } from '@/api/weatherFetcher';
import { WeatherRecord, ClimateStats, CityConfig } from '@/types/weather';

export function useWeather(city: CityConfig, initialStats?: ClimateStats | null, initialData?: WeatherRecord[]) {
    const [data, setData] = useState<WeatherRecord[]>(initialData || []);
    const [stats, setStats] = useState<ClimateStats | null>(initialStats || null);
    const [loading, setLoading] = useState(!initialData || initialData.length === 0);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        // If we have initial data matching the current city, don't fetch
        // BUT: Simple check, if data is empty we must fetch.
        // Also if city changes, we must fetch regardless of initialData (unless we passed new initialData for new city, 
        // which React handles by re-mounting or re-running hook with new props)

        // Hybrid Logic:
        // 1. If we have initial "Stats", we can show the dashboard header immediately.
        // 2. BUT, we might only have a tiny slice of "Data" (e.g. 7 days) passed from server.
        // 3. The CHARTS need the full history (10k+ records).
        // 4. So, if data.length is small, we MUST fetch the full CSV, even if we have stats.

        const hasFullData = data.length > 365; // Arbitrary threshold: if we have < 1 year, we assume it's incomplete

        if (hasFullData && stats) {
            setLoading(false);
            return;
        }

        async function init() {
            setLoading(true); // Ensure loading state is true when city changes
            try {
                const { data, stats } = await loadWeatherData(city.file, city);
                setData(data);
                setStats(stats);
            } catch (err) {
                console.error("Failed to load weather data:", err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [city]); // Dependent on city object

    const handleRefresh = async () => {
        if (refreshing || data.length === 0) return;
        setRefreshing(true);
        try {
            const { data: newData, stats: newStats } = await refreshWeatherData(data, city);
            setData(newData);
            setStats(newStats);
        } catch (err) {
            console.error("Refresh failed:", err);
        } finally {
            setRefreshing(false);
        }
    };

    return {
        data,
        stats,
        loading,
        refreshing,
        handleRefresh
    };
}
