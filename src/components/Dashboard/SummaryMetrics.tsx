"use client";

import React from 'react';
import { MetricCard } from '../MetricCard';
import { ClimateStats, WeatherRecord, CityConfig } from '@/types/weather';
import { NarratorCard } from './NarratorCard';

interface SummaryMetricsProps {
    stats: ClimateStats | null;
    data: WeatherRecord[];
    city: CityConfig;
    isSecondary?: boolean;
}

export function SummaryMetrics({ stats, data, city, isSecondary = false }: SummaryMetricsProps) {
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
            <MetricCard
                label="Current Conditions"
                value={stats?.currentTemp !== undefined ? `${stats.currentTemp.toFixed(1)}°F` : '--°F'}
                subValues={stats?.todayMax !== undefined && stats?.todayMin !== undefined ? {
                    high: `${stats.todayMax.toFixed(0)}°`,
                    low: `${stats.todayMin.toFixed(0)}°`
                } : undefined}
                delta={stats?.currentTempTime ? `Real-time | ${stats.currentTempTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${stats.currentTempTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : "Real-time"}
                accent="secondary"
                help="The latest temperature reading from KORD via Open-Meteo, with today's high and low."
            />
            <MetricCard
                label={stats?.zScore !== undefined && stats.zScore > 0 ? "Heat Anomaly" : "Cold Anomaly"}
                value={stats?.zScore ? `${stats.zScore > 0 ? '+' : ''}${stats.zScore.toFixed(1)}σ` : '--'}
                delta={stats?.todayPercentile ? `Rarer than ${stats.todayPercentile > 50 ? stats.todayPercentile.toFixed(0) : (100 - stats.todayPercentile).toFixed(0)}% of days` : undefined}
                accent={Math.abs(stats?.zScore || 0) > 2 ? 'ro' : Math.abs(stats?.zScore || 0) > 1 ? 'secondary' : 'primary'}
                help="Standard Deviation from the mean. ±2σ represents a 1-in-20 year statistical event."
            />
            <MetricCard
                label={stats?.currentStreak?.type || "Streak"}
                value={stats?.currentStreak ? `${stats.currentStreak.count} Days` : '--'}
                delta={`Started ${stats?.currentStreak?.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                accent={stats?.currentStreak && stats.currentStreak.count > 5 ? 'secondary' : 'primary'}
                help="Consecutive days maintaining the current temperature regime."
            />
            <MetricCard
                label="Pattern Match"
                value={stats?.analogYear ? stats.analogYear.year.toString() : '--'}
                delta={stats?.analogYear ? `~${(stats.analogYear.similarityScore * 100).toFixed(0)}% Similarity` : undefined}
                accent="primary"
                help="The historical year with the most similar weather pattern to the last 30 days."
            />
            {(() => {
                const sStats = stats?.seasonalSnow?.seasonName === 'Winter' ? stats?.seasonalSnow : stats?.seasonalRain;
                const unit = stats?.seasonalSnow?.seasonName === 'Winter' ? '" Snow' : '" Rain';
                const label = sStats?.seasonName + (stats?.seasonalSnow?.seasonName === 'Winter' ? ' Snow' : ' Rain');
                if (!sStats) return null;
                const rankSuffix = (n: number) => {
                    const j = n % 10, k = n % 100;
                    if (j == 1 && k != 11) return "st";
                    if (j == 2 && k != 12) return "nd";
                    if (j == 3 && k != 13) return "rd";
                    return "th";
                };
                const rankStr = `${sStats.rank}${rankSuffix(sStats.rank)}`;
                const description = sStats.rank === 1 ? `Record ${sStats.seasonName}` : sStats.rank <= 5 ? `Top 5 ${sStats.seasonName}` : sStats.rank >= sStats.totalYears - 5 ? `Top 5 Driest` : `${rankStr} Wettest`;
                return (
                    <MetricCard
                        label={label}
                        value={`${sStats.value.toFixed(1)}${unit}`}
                        delta={`${description} (of ${sStats.totalYears} yrs)`}
                        accent={sStats.rank <= 10 ? 'secondary' : 'primary'}
                        help={`Ranking accumulated precipitation/snow for this season against all winters since 1940.`}
                    />
                )
            })()}
            <MetricCard
                label="Current Wind"
                value={stats?.currentWind !== undefined ? `${stats.currentWind.toFixed(1)} mph` : '-- mph'}
                delta={stats?.currentGust ? `Gusts ${stats.currentGust.toFixed(1)} mph` : 'Calm'}
                accent={stats?.currentWind && stats.currentWind > 15 ? 'ro' : 'secondary'}
                help="Current sustained wind speed and peak gusts at O'Hare."
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
