import { useState, useEffect } from 'react';
import { loadWeatherData, refreshWeatherData, WeatherRecord, ClimateStats } from '@/utils/weatherData';

export function useWeather(csvPath: string = '/data/chicago_weather_v86.csv') {
    const [data, setData] = useState<WeatherRecord[]>([]);
    const [stats, setStats] = useState<ClimateStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        async function init() {
            try {
                const { data, stats } = await loadWeatherData(csvPath);
                setData(data);
                setStats(stats);
            } catch (err) {
                console.error("Failed to load weather data:", err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [csvPath]);

    const handleRefresh = async () => {
        if (refreshing || data.length === 0) return;
        setRefreshing(true);
        try {
            const { data: newData, stats: newStats } = await refreshWeatherData(data);
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
