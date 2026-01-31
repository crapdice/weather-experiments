import { describe, it, expect } from 'vitest';
import { calculateZScore, calculatePercentileRank, findLongestRecentStreak, findAnalogYear } from './statisticalEngine';
import { WeatherRecord } from './weatherData';

// Mock Data Utilities
const createRecord = (date: string, avgTemp: number, precip = 0): WeatherRecord => {
    const d = new Date(date + 'T12:00:00'); // Force noon to avoid TZ shift to previous year
    return {
        Date: d,
        'Avg Temp (°F)': avgTemp,
        'Max Temp (°F)': avgTemp + 10,
        'Min Temp (°F)': avgTemp - 10,
        'Precipitation (in)': precip,
        'Snowfall (in)': 0,
        'Max Wind Speed (mph)': 10,
        'Max Wind Gust (mph)': 20,
        DayOfYear: d.getDate(),
        Year: d.getFullYear()
    };
};

describe('Statistical Engine', () => {

    describe('calculateZScore', () => {
        it('correctly identifies a +2.0 sigma event (Warm Anomaly)', () => {
            // Mean = 50, Sample StdDev of [40, 50, 60] is 10.
            const history = [
                createRecord('2020-01-01', 40),
                createRecord('2021-01-01', 50),
                createRecord('2022-01-01', 60),
            ];
            // Current = 70 (20 degrees above mean 50. StdDev of pop {40,50,60} is 8.16. Let's use simple numbers)
            // If we simply check the math: Mean=50.
            // We want to test the logic, not Math.stddev library. 
            // Let's rely on the implementation to handle standard deviation calc.

            const currentVal = 70;
            const result = calculateZScore(currentVal, history.map(h => h['Avg Temp (°F)']));

            // (70 - 50) / 10 = 2.0
            expect(result).toBeCloseTo(2.0, 1);
        });

        it('returns 0 for value exactly at mean', () => {
            const history = [createRecord('2020-01-01', 50), createRecord('2021-01-01', 50)];
            const result = calculateZScore(50, history.map(h => h['Avg Temp (°F)']));
            expect(result).toBe(0);
        });
    });

    describe('calculatePercentileRank', () => {
        it('returns 99th percentile for record high', () => {
            const history = Array.from({ length: 99 }, (_, i) => createRecord(`2000-01-01`, 30 + i)); // 30...128
            const current = 200; // Higher than all
            const rank = calculatePercentileRank(current, history.map(h => h['Avg Temp (°F)']));
            expect(rank).toBeGreaterThan(99);
        });

        it('returns 50th percentile for median value', () => {
            const history = [10, 20, 30, 40, 50].map(t => createRecord('2000-01-01', t));
            const current = 30;
            const rank = calculatePercentileRank(current, history.map(h => h['Avg Temp (°F)']));
            // 2 values are smaller (10, 20). 2/5 = 40th percentile (or 50th depending on strictness)
            // Usually percentile is % of values BELOW.
            expect(rank).toBeCloseTo(40, 0);
        });
    });

    describe('findLongestRecentStreak', () => {
        it('identifies a 3-day warm streak', () => {
            // Records sorted by date ascending
            const data = [
                createRecord('2024-01-01', 30), // Cold
                createRecord('2024-01-02', 60), // Warm
                createRecord('2024-01-03', 65), // Warm
                createRecord('2024-01-04', 70), // Warm
            ];
            // Predicate: Temp > 50
            const result = findLongestRecentStreak(data, d => d['Avg Temp (°F)'] > 50);
            expect(result.count).toBe(3);
            expect(result.startDate.toISOString()).toContain('2024-01-02');
        });

        it('returns 0 if streak is broken today', () => {
            const data = [
                createRecord('2024-01-01', 60),
                createRecord('2024-01-02', 30), // Cold today
            ];
            const result = findLongestRecentStreak(data, d => d['Avg Temp (°F)'] > 50);
            expect(result.count).toBe(0);
        });
    });

    describe('findAnalogYear', () => {
        it('matches a year with similar patterns', () => {
            // Setup: 2024 (Current) matches 2020 perfectly, but not 2021
            const database = [
                // 2020: Warm, Cold, Warm
                createRecord('2020-01-01', 50), createRecord('2020-01-02', 20), createRecord('2020-01-03', 50),
                // 2021: Cold, Cold, Cold
                createRecord('2021-01-01', 20), createRecord('2021-01-02', 20), createRecord('2021-01-03', 20),
                // 2024 (Recent): Warm, Cold, Warm
                createRecord('2024-01-01', 50), createRecord('2024-01-02', 20), createRecord('2024-01-03', 50)
            ];

            const recent = database.filter(d => d.Year === 2024);
            const history = database.filter(d => d.Year !== 2024);

            const analog = findAnalogYear(recent, history);
            expect(analog.year).toBe(2020);
            expect(analog.similarityScore).toBeGreaterThan(0.9); // High correlation
        });
    });

});
