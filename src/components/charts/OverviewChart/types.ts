import { WeatherRecord } from '@/types/weather';

export interface Timeframe {
    label: string;
    value: number;
    unit: 'month' | 'year' | 'all';
}

export const TIMEFRAMES: Timeframe[] = [
    { label: '1M', value: 1, unit: 'month' },
    { label: '3M', value: 3, unit: 'month' },
    { label: '6M', value: 6, unit: 'month' },
    { label: '1Y', value: 1, unit: 'year' },
    { label: '3Y', value: 3, unit: 'year' },
    { label: '5Y', value: 5, unit: 'year' },
    { label: '10Y', value: 10, unit: 'year' },
    { label: '20Y', value: 20, unit: 'year' },
    { label: 'ALL', value: 0, unit: 'all' },
];

export interface TrendLine {
    p1: { date: Date, val: number };
    p2: { date: Date, val: number };
}

export interface OverviewChartProps {
    data: WeatherRecord[];
}
