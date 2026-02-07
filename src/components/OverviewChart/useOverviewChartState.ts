"use client";

import { useState, useCallback } from 'react';
import { WeatherRecord } from '@/types/weather';
import { Timeframe, TrendLine } from './types';

export function useOverviewChartState(data: WeatherRecord[]) {
    const [dateRange, setDateRange] = useState<[Date, Date] | null>(() => {
        if (data.length) {
            const lastDataDate = data[data.length - 1].Date;
            const end = new Date(lastDataDate);
            end.setDate(end.getDate() + 1);

            const start = new Date(lastDataDate);
            start.setFullYear(start.getFullYear() - 1);
            return [start < data[0].Date ? data[0].Date : start, end];
        }
        return null;
    });
    const [isDrawMode, setIsDrawMode] = useState(false);
    const [trendLine, setTrendLine] = useState<TrendLine | null>(null);
    const [showRain, setShowRain] = useState(false);
    const [showSnow, setShowSnow] = useState(false);
    const [smaWindow, setSmaWindow] = useState(7);

    const handleTimeframeChange = useCallback((tf: Timeframe) => {
        if (!data.length) return;
        const lastDataDate = data[data.length - 1].Date;
        const bufferedEnd = new Date(lastDataDate);
        bufferedEnd.setDate(bufferedEnd.getDate() + 1);

        let start: Date;
        if (tf.unit === 'all') {
            start = data[0].Date;
        } else {
            start = new Date(lastDataDate);
            if (tf.unit === 'month') {
                start.setMonth(start.getMonth() - tf.value);
            } else {
                start.setFullYear(start.getFullYear() - tf.value);
            }
            if (start < data[0].Date) start = data[0].Date;
        }
        setDateRange([start, bufferedEnd]);
    }, [data]);

    return {
        dateRange,
        setDateRange,
        isDrawMode,
        setIsDrawMode,
        trendLine,
        setTrendLine,
        showRain,
        setShowRain,
        showSnow,
        setShowSnow,
        smaWindow,
        setSmaWindow,
        handleTimeframeChange
    };
}
