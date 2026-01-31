import { describe, it, expect } from 'vitest';
import { calculateSeasonalRank } from './seasonalEngine';
import { WeatherRecord } from './weatherData';

// Mock Data Helper
const createRec = (date: string, snow: number): WeatherRecord => {
    const d = new Date(date + 'T12:00:00');
    return {
        Date: d,
        'Avg Temp (°F)': 30,
        'Max Temp (°F)': 40,
        'Min Temp (°F)': 20,
        'Precipitation (in)': 0,
        'Snowfall (in)': snow,
        'Max Wind Speed (mph)': 10,
        'Max Wind Gust (mph)': 20,
        DayOfYear: d.getDate(), // Simplified for this test context if needed, but Date object is primary
        Year: d.getFullYear()
    } as WeatherRecord; // Cast to avoid full mock
};

describe('Seasonal Engine', () => {

    describe('calculateSeasonalRank', () => {
        it('correctly ranks a snowy winter #1', () => {
            // History:
            // Winter 2020 (Dec '19 - Feb '20): 10" Total
            // Winter 2021 (Dec '20 - Feb '21): 5" Total
            // Current (Winter 2024): 20" Total

            // We need to provide a full dataset.
            const history = [
                // Winter 2020
                createRec('2019-12-01', 5), createRec('2020-01-15', 5),
                // Winter 2021
                createRec('2020-12-01', 2), createRec('2021-01-15', 3),
            ];

            // Current Season Data (e.g. Dec 1 2024 to Jan 25 2025)
            const currentSeason = [
                createRec('2024-12-01', 10), createRec('2025-01-25', 10)
            ];

            const result = calculateSeasonalRank(currentSeason, history, 'snow');

            expect(result.rank).toBe(1); // 20" is > 10" and 5"
            expect(result.totalYears).toBe(3); // 2020, 2021, and Current
        });

        it('handles year rollover (Dec -> Jan) correctly', () => {
            // Providing data that only falls in Dec should count towards the "2020" winter if it is Dec 2019.
            // Winter is defined usually as Season Ending In Year X. 
            // e.g. Winter 2020 = Dec 2019 + Jan 2020 + Feb 2020.

            const history = [
                createRec('2019-12-31', 10), // Winter 2020
                createRec('2020-01-01', 2),  // Winter 2020 (Total 12)
            ];

            const currentSeason = [
                createRec('2023-12-31', 5) // Winter 2024
            ];

            const result = calculateSeasonalRank(currentSeason, history, 'snow');

            // Current (5) vs Winter 2020 (12). Rank should be 2.
            expect(result.rank).toBe(2);
            expect(result.value).toBe(5);
        });
    });

});
