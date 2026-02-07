import { useState, useEffect } from 'react';
import { loadWeatherData } from '@/utils/weatherData';
import { refreshWeatherData } from '@/api/weatherFetcher';
import { WeatherRecord, ClimateStats, CityConfig } from '@/types/weather';

export function useWeather(city: CityConfig) {
    const [data, setData] = useState<WeatherRecord[]>([]);
    const [stats, setStats] = useState<ClimateStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
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
