import { getSeasonalDisplayState } from '../SeasonalCard';
import { ClimateStats, SeasonalRank } from '@/types/weather';
import { vi, describe, test, expect } from 'vitest';

const mockRank: SeasonalRank = {
    rank: 1,
    totalYears: 80,
    value: 12.5,
    percentile: 99,
    seasonName: 'TestSeason'
};

const mockStats: ClimateStats = {
    maxTemp: 90,
    maxTempDate: new Date(),
    minTemp: 10,
    minTempDate: new Date(),
    pulseDelta: 2,
    frostDays: 10,
    heatDays: 5,
    volatility: 3,
    decadalDelta: 0.5,
    lastUpdate: new Date(),
    // Seasonal data
    seasonalSnow: { ...mockRank, seasonName: 'Snow' },
    seasonalRain: { ...mockRank, seasonName: 'Rain', value: 5.5 },
    // Default values
    todayMax: 40,
    todayMin: 20
};

describe('SeasonalCard Logic (getSeasonalDisplayState)', () => {

    test('Returns Snow state when threshold is low (Winter City) and month is Feb', () => {
        // Mock Feb date
        const stats = { ...mockStats, currentTempTime: new Date('2024-02-15') };

        // Threshold 1 means "Snowy City"
        const result = getSeasonalDisplayState(stats, 1.0);

        expect(result.label).toBe('Season Snow');
        expect(result.isSnowSeason).toBe(true);
    });

    test('Returns Rain state when threshold is high (Tropical City) even in Feb', () => {
        // Mock Feb date
        const stats = { ...mockStats, currentTempTime: new Date('2024-02-15') };

        // Threshold 100 means "No Snow City"
        const result = getSeasonalDisplayState(stats, 100.0);

        expect(result.label).toContain('Rain');
        expect(result.isSnowSeason).toBe(false);
    });

    test('Returns Rain state in Shoulder Season if snow accumulation is negligible', () => {
        // Mock November date
        const stats = {
            ...mockStats,
            currentTempTime: new Date('2024-11-15'),
            seasonalSnow: { ...mockRank, value: 0.0 } // No snow yet
        };

        // Threshold 10 (Snowy City), but no snow yet
        const result = getSeasonalDisplayState(stats, 10.0);

        expect(result.label).toContain('Rain');
        expect(result.isSnowSeason).toBe(false);
    });

    test('Returns Snow state in Shoulder Season if accumulation is significant', () => {
        // Mock November date
        const stats = {
            ...mockStats,
            currentTempTime: new Date('2024-11-15'),
            seasonalSnow: { ...mockRank, value: 2.5 } // Significant early snow
        };

        // Threshold 10 (Snowy City)
        const result = getSeasonalDisplayState(stats, 10.0);

        expect(result.label).toBe('Season Snow');
        expect(result.isSnowSeason).toBe(true);
    });
});
