import { NarratorPayload } from '@/utils/narratorPayload';

/**
 * Replaces all {{placeholder}} tokens in a template string with values from a data object.
 * Handles nested arrays by pre-formatting them into multi-line strings.
 */
export function hydratePrompt(template: string, payload: NarratorPayload): string {
    // Build a flat key-value map for simple replacements
    const data: Record<string, string> = {
        // City
        cityName: payload.city.name,

        // Stats (with safe defaults)
        date: payload.stats.date,
        currentTemp: String(payload.stats.currentTemp),
        todayMax: String(payload.stats.todayMax),
        todayMin: String(payload.stats.todayMin),
        normalHigh: payload.stats.normalHigh?.toFixed(1) ?? 'N/A',
        normalLow: payload.stats.normalLow?.toFixed(1) ?? 'N/A',
        currentWind: String(payload.stats.currentWind ?? 0),
        currentGust: String(payload.stats.currentGust ?? 0),
        todayRain: String(payload.stats.todayRain ?? 0),
        todaySnow: String(payload.stats.todaySnow ?? 0),
        sunrise: payload.stats.sunrise ?? 'N/A',
        sunset: payload.stats.sunset ?? 'N/A',
        dayOfWeek: payload.stats.dayOfWeek,
        analogYear: String(payload.stats.analogYear ?? 'Unknown'),
        streakCount: String(payload.stats.streakCount ?? 0),
        streakType: payload.stats.streakType ?? 'None',

        // Seasonal
        rainTotal: String(payload.seasonal.rainTotal ?? 0),
        rainMedian: String(payload.seasonal.rainMedian ?? 0),
        snowTotal: String(payload.seasonal.snowTotal ?? 0),
        snowMedian: String(payload.seasonal.snowMedian ?? 0),

        // Pre-formatted arrays
        seasonalComparisons: formatSeasonalComparisons(payload.seasonal.comparisons),
        lookbackYoY: formatLookbackYoY(payload.lookbackYoY),
        analogForecast: formatAnalogForecast(payload.stats.analogForecast),
    };

    // Replace all {{key}} with the corresponding value
    let result = template;
    for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, value);
    }

    return result;
}

// --- Formatting Helpers ---

function formatSeasonalComparisons(
    comparisons: NarratorPayload['seasonal']['comparisons']
): string {
    if (!comparisons || comparisons.length === 0) {
        return '- No seasonal comparison data available.';
    }
    return comparisons
        .map(c => `- ${c.metric}: ${c.currentValue}${c.unit} (Rank #${c.rank} of ${c.totalYears})`)
        .join('\n');
}

function formatLookbackYoY(lookback: NarratorPayload['lookbackYoY']): string {
    if (!lookback || lookback.length === 0) {
        return '- No year-over-year data available.';
    }
    return lookback
        .map(l => `- ${l.period}: ${l.delta > 0 ? '+' : ''}${l.delta.toFixed(2)}°F vs last year (Curr: ${l.current.toFixed(1)}°F vs Prev: ${l.previous.toFixed(1)}°F)`)
        .join('\n');
}

function formatAnalogForecast(
    forecast: NarratorPayload['stats']['analogForecast']
): string {
    if (!forecast || forecast.length === 0) {
        return '- No analog forecast data available.';
    }
    return forecast
        .map(f => `- ${f.date}: High ${f.high}°F / Low ${f.low}°F`)
        .join('\n');
}
