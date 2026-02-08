import React from 'react';
import { MetricCard } from '../MetricCard';
import { ClimateStats, WeatherRecord, CityConfig } from '@/types/weather';
import { NarratorCard } from './NarratorCard';

// Specialized Logic-Separated Cards
import { ConditionsCard } from './Metrics/ConditionsCard';
import { AnomalyCard } from './Metrics/AnomalyCard';
import { StreakCard } from './Metrics/StreakCard';
import { PatternMatchCard } from './Metrics/PatternMatchCard';
import { SeasonalCard } from './Metrics/SeasonalCard';
import { WindCard } from './Metrics/WindCard';

interface SummaryMetricsProps {
    stats: ClimateStats | null;
    data: WeatherRecord[];
    city: CityConfig;
    isSecondary?: boolean;
    onSelectYear?: (year: number) => void;
}

export function SummaryMetrics({ stats, data, city, isSecondary = false, onSelectYear }: SummaryMetricsProps) {
    if (isSecondary) {
        return (
            <section className="metrics-grid secondary-metrics">
                <MetricCard label="Extreme Frost" value={stats?.frostDays || 0} delta="Days < 0°F" />
                <MetricCard label="Extreme Heat" value={stats?.heatDays || 0} delta="Days > 95°F" accent="secondary" />
                <MetricCard label="Volatility Index" value={`${stats?.volatility.toFixed(2)}°F`} delta="Avg Daily Δ" accent="ro" />
                <MetricCard label="Total Records" value={data.length.toLocaleString()} delta="High-Fid Samples" />
                <MetricCard
                    label="All-Time Max"
                    value={`${stats?.maxTemp.toFixed(1)}°F`}
                    delta={stats?.maxTempDate.getFullYear().toString()}
                    help={`The highest daily maximum temperature recorded at KORD between ${data[0]?.Year || '1940'} and today.`}
                />
                <MetricCard
                    label="All-Time Min"
                    value={`${stats?.minTemp.toFixed(1)}°F`}
                    delta={stats?.minTempDate.getFullYear().toString()}
                    accent="primary"
                    help={`The lowest daily minimum temperature recorded at KORD between ${data[0]?.Year || '1940'} and today.`}
                />
                <MetricCard
                    label="Climate Pulse"
                    value={`${stats?.pulseDelta.toFixed(2)}°F`}
                    delta={`Delta vs ${data.length > 0 ? (new Date().getFullYear() - data[0].Year) : '85'}y Baseline`}
                    accent="secondary"
                    help={`The climatological anomaly: compares the last 30 days against the full archival average (since ${data[0]?.Year || '1940'}) for those same calendar days.`}
                />
                <MetricCard
                    label="Decadal Shift"
                    value={`${stats?.decadalDelta.toFixed(2)}°F`}
                    delta="2020s vs 1970s"
                    accent="ro"
                    help="The difference in average temperature between the most recent decade and the first decade of records."
                />
                <style jsx>{`
                    .metrics-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                        gap: 16px;
                    }
                    @media (max-width: 768px) {
                        .metrics-grid {
                            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                            gap: 12px;
                        }
                    }
                `}</style>
            </section>
        );
    }

    return (
        <section className="metrics-grid">
            <NarratorCard stats={stats} city={city} />

            {/* 
                DESIGNER NOTE: 
                You can reorder these tags as much as you want! 
                The logic is safely hidden inside each specialized card.
            */}
            <ConditionsCard stats={stats} />
            <SeasonalCard stats={stats} minSnowThreshold={city?.minSnowThreshold} />
            <WindCard stats={stats} />
            <AnomalyCard stats={stats} />
            <StreakCard stats={stats} />
            <PatternMatchCard stats={stats} onSelectYear={onSelectYear} />


            <style jsx>{`
                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 16px;
                }
                @media (max-width: 768px) {
                    .metrics-grid {
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 12px;
                    }
                }
            `}</style>
        </section>
    );
}
