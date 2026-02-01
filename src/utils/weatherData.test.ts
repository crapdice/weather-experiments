import { describe, it, expect, vi, beforeEach } from 'vitest';
import { refreshWeatherData, WeatherRecord } from './weatherData';

describe('weatherData integration', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        global.fetch = vi.fn();
    });

    it('should synthesize a record for today when it is missing from the daily feed', async () => {
        const mockCurrentData: WeatherRecord[] = [
            {
                Date: new Date('2026-01-21T12:00:00'),
                'Max Temp (°F)': 30,
                'Min Temp (°F)': 20,
                'Avg Temp (°F)': 25,
                'Precipitation (in)': 0,
                'Snowfall (in)': 0,
                'Max Wind Speed (mph)': 0,
                'Max Wind Gust (mph)': 0,
                DayOfYear: 21,
                Year: 2026,
                Rain: 0,
                Snow: 0
            }
        ];

        const mockApiDaily = {
            daily: {
                time: ['2026-01-21'],
                temperature_2m_max: [30],
                temperature_2m_min: [20],
                temperature_2m_mean: [25],
                rain_sum: [0],
                precipitation_sum: [0],
                snowfall_sum: [0],
                wind_speed_10m_max: [10],
                wind_gusts_10m_max: [15]
            }
        };

        const mockApiCurrent = {
            current: {
                time: '2026-01-22T08:00',
                temperature_2m: 28.5
            },
            daily: {
                time: ['2026-01-22'],
                temperature_2m_max: [30],
                temperature_2m_min: [20]
            }
        };

        vi.mocked(global.fetch).mockImplementation((url: string) => {
            if (url.includes('type=current')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockApiCurrent)
                });
            }
            if (url.includes('type=forecast_past')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockApiDaily)
                });
            }
            return Promise.resolve({ ok: false });
        });

        // Use the date from the mock current weather
        const todayStr = '2026-01-22';

        const result = await refreshWeatherData(mockCurrentData);

        const hasToday = result.data.some(d => d.Date.toISOString().split('T')[0] === todayStr);
        expect(hasToday).toBe(true);

        const todayRecord = result.data.find(d => d.Date.toISOString().split('T')[0] === todayStr);
        expect(todayRecord?.['Avg Temp (°F)']).toBe(28.5);
    });
});
