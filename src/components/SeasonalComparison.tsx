"use client";

import React from 'react';
import { SeasonalComparison } from '@/utils/seasonalEngine';

interface Props {
    comparisons: SeasonalComparison[];
    seasonName: string;
}

function getRankLabel(rank: number, totalYears: number, higherIsBetter: boolean, metric: string): string {
    const ordinal = getOrdinal(rank);
    // For temperature metrics, lower is colder
    if (metric === 'Average Temp' || metric === 'Coldest Day') {
        if (rank <= 3) return `${ordinal} Coldest`;
        if (rank >= totalYears - 2) return `${ordinal} Warmest`;
        return `${ordinal} of ${totalYears}`;
    }
    // For snow/precip, higher is more
    if (metric === 'Total Snow') {
        if (rank <= 3) return `${ordinal} Snowiest`;
        if (rank >= totalYears - 2) return `${ordinal} Least Snowy`;
        return `${ordinal} of ${totalYears}`;
    }
    if (metric === 'Total Precip') {
        if (rank <= 3) return `${ordinal} Wettest`;
        if (rank >= totalYears - 2) return `${ordinal} Driest`;
        return `${ordinal} of ${totalYears}`;
    }
    if (metric === 'Warm Streak') {
        if (rank <= 3) return `${ordinal} Longest`;
        if (rank >= totalYears - 2) return `${ordinal} Shortest`;
        return `${ordinal} of ${totalYears}`;
    }
    if (metric === 'Heating Degrees') {
        if (rank <= 3) return `${ordinal} Most Heating`;
        if (rank >= totalYears - 2) return `${ordinal} Least Heating`;
        return `${ordinal} of ${totalYears}`;
    }
    return `${ordinal} of ${totalYears}`;
}

function getOrdinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getRankColor(rank: number, totalYears: number): string {
    const percentile = (totalYears - rank) / totalYears;
    if (percentile >= 0.9) return 'var(--accent-1)'; // Top 10%
    if (percentile >= 0.75) return 'var(--accent-2)';
    if (percentile <= 0.1) return '#ff4d4d'; // Bottom 10%
    if (percentile <= 0.25) return '#ff9966';
    return 'var(--text-secondary)';
}

export function SeasonalComparisonPanel({ comparisons, seasonName }: Props) {
    if (!comparisons || comparisons.length === 0) {
        return <div className="seasonal-comparison-empty">No seasonal data available.</div>;
    }

    return (
        <div className="seasonal-comparison-panel">
            <div className="panel-header">
                <h3>{seasonName} Season-to-Date Rankings</h3>
                <p>How does this {seasonName.toLowerCase()} compare to history?</p>
            </div>
            <div className="comparison-grid">
                {comparisons.map((c, i) => (
                    <div key={i} className="comparison-card">
                        <div className="metric-label">{c.metric}</div>
                        <div className="metric-value">
                            {c.metric.includes('Temp') || c.metric === 'Coldest Day'
                                ? `${c.currentValue.toFixed(1)}${c.unit}`
                                : c.metric === 'Warm Streak'
                                    ? `${c.currentValue}${c.unit}`
                                    : `${c.currentValue.toFixed(1)}${c.unit}`}
                        </div>
                        <div
                            className="rank-badge"
                            style={{ color: getRankColor(c.rank, c.totalYears) }}
                        >
                            {getRankLabel(c.rank, c.totalYears, c.higherIsBetter, c.metric)}
                        </div>
                        <div className="historical-context">
                            <span className="best">
                                Best: {c.historicalBest.year} ({c.historicalBest.value.toFixed(1)}{c.unit})
                            </span>
                            <span className="worst">
                                Worst: {c.historicalWorst.year} ({c.historicalWorst.value.toFixed(1)}{c.unit})
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            <style jsx>{`
                .seasonal-comparison-panel {
                    padding: 24px;
                    background: var(--bg-component);
                    border-radius: 8px;
                }
                .panel-header {
                    margin-bottom: 24px;
                    border-left: 4px solid var(--accent-1);
                    padding-left: 16px;
                }
                .panel-header h3 {
                    color: var(--accent-1);
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 4px;
                    font-size: 1.2rem;
                }
                .panel-header p {
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                }
                .comparison-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                }
                .comparison-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid var(--border-subtle);
                    border-radius: 8px;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .metric-label {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    color: var(--text-secondary);
                    letter-spacing: 0.5px;
                }
                .metric-value {
                    font-size: 1.8rem;
                    font-weight: 900;
                    color: var(--text-primary);
                }
                .rank-badge {
                    font-size: 0.9rem;
                    font-weight: 700;
                }
                .historical-context {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                    opacity: 0.7;
                    margin-top: 8px;
                    padding-top: 8px;
                    border-top: 1px solid var(--border-subtle);
                }
                .seasonal-comparison-empty {
                    padding: 40px;
                    text-align: center;
                    color: var(--text-secondary);
                }

                @media (max-width: 768px) {
                    .seasonal-comparison-panel {
                        padding: 16px;
                    }
                    .comparison-grid {
                        grid-template-columns: 1fr 1fr;
                    }
                    .metric-value {
                        font-size: 1.4rem;
                    }
                }
            `}</style>
        </div>
    );
}
