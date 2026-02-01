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

export function SeasonalComparisonPanelV2({ comparisons, seasonName }: Props) {
    const [isProMode, setIsProMode] = React.useState(false);
    console.log("SeasonalComparisonPanelV2 Mounted");

    const m_metadata: Record<string, { layman: string, pro: string, desc: string }> = {
        'Average Temp': {
            layman: 'Average Temperature',
            pro: 'Mean Temp (°F)',
            desc: 'The typical daily temperature throughout this season.'
        },
        'Total Snow': {
            layman: 'Total Snowfall',
            pro: 'Accreted Snow (in)',
            desc: 'Accumulated snowfall since July 1st.'
        },
        'Total Precip': {
            layman: 'Total Rain/Melt',
            pro: 'Liquid Precip (in)',
            desc: 'Total water content (rain + melted snow).'
        },
        'Coldest Day': {
            layman: 'Coldest Temperature',
            pro: 'Season Min Temp',
            desc: 'The single lowest temperature recorded this season.'
        },
        'Warm Streak': {
            layman: 'Days Above Freezing',
            pro: 'Thaw Streak (>32°F)',
            desc: 'Longest stretch of days where average temp stayed above 32°F.'
        },
        'Heating Degrees': {
            layman: 'Heating Energy Load',
            pro: 'Heating Degree Days',
            desc: 'A measure of how much energy was needed to heat buildings.'
        }
    };

    const getLabel = (metric: string) => isProMode ? m_metadata[metric]?.pro || metric : m_metadata[metric]?.layman || metric;
    const getDescription = (metric: string) => m_metadata[metric]?.desc || '';

    const m_type = (metric: string, best: boolean) => {
        if (metric.includes('Temp')) return best ? 'Warmest' : 'Coldest';
        if (metric.includes('Snow')) return best ? 'Snowiest' : 'Least Snowy';
        if (metric.includes('Precip')) return best ? 'Wettest' : 'Driest';
        if (metric === 'Warm Streak') return best ? 'Mildest' : 'Harshest';
        return best ? 'Max' : 'Min';
    };

    if (!comparisons || comparisons.length === 0) {
        return <div className="seasonal-comparison-empty">No seasonal data available.</div>;
    }

    return (
        <div className="seasonal-comparison-panel">
            <div className="panel-header">
                <div className="header-top">
                    <div className="title-group">
                        <h3>{seasonName} Rankings <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>v2.1</span></h3>
                        <p>NEW: Pro/Simple toggles enabled. Comparing {seasonName.toLowerCase()} vs. the last 86 years.</p>
                    </div>
                    <div className="toggle-container">
                        <span className={!isProMode ? 'active' : ''}>Simple</span>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={isProMode}
                                onChange={(e) => setIsProMode(e.target.checked)}
                            />
                            <span className="slider round"></span>
                        </label>
                        <span className={isProMode ? 'active' : ''}>Pro</span>
                    </div>
                </div>
                <div className="season-meta">
                    <span className="snow-context"> *Snow metrics use the July–June Snow Year standard.</span>
                </div>
            </div>

            <div className="comparison-grid">
                {comparisons.map((c, i) => (
                    <div key={i} className="comparison-card">
                        <div className="metric-header">
                            <div className="metric-label">{getLabel(c.metric)}</div>
                            {c.metric === 'Total Snow' && <span className="snow-tag">Snow Year</span>}
                        </div>
                        <div className="metric-value">
                            {c.metric.includes('Temp') || c.metric === 'Coldest Day'
                                ? `${c.currentValue.toFixed(1)}${c.unit}`
                                : c.metric === 'Warm Streak'
                                    ? `${c.currentValue}${c.unit}`
                                    : `${c.currentValue.toFixed(2)}${c.unit}`}
                        </div>
                        <div
                            className="rank-badge"
                            style={{ color: getRankColor(c.rank, c.totalYears) }}
                        >
                            {getRankLabel(c.rank, c.totalYears, c.higherIsBetter, c.metric)}
                        </div>
                        <div className="metric-desc">{getDescription(c.metric)}</div>
                        <div className="historical-context">
                            <div className="hist-entry">
                                <span className="hist-label">{m_type(c.metric, true)}</span>
                                <span className="hist-val">{c.historicalBest.year} ({c.historicalBest.value.toFixed(1)}{c.unit})</span>
                            </div>
                            <div className="hist-entry">
                                <span className="hist-label">{m_type(c.metric, false)}</span>
                                <span className="hist-val">{c.historicalWorst.year} ({c.historicalWorst.value.toFixed(1)}{c.unit})</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .seasonal-comparison-panel {
                    padding: 24px;
                    background: var(--bg-component);
                    border-radius: 12px;
                    border: 1px solid var(--border-subtle);
                }
                .panel-header {
                    margin-bottom: 24px;
                }
                .header-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 12px;
                }
                .title-group h3 {
                    color: var(--accent-1);
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    margin-bottom: 4px;
                    font-size: 1.4rem;
                }
                .title-group p {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    opacity: 0.8;
                }
                .season-meta {
                    padding-top: 8px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                }
                .snow-context {
                    font-size: 0.75rem;
                    font-style: italic;
                    color: var(--text-secondary);
                    opacity: 0.6;
                }
                
                /* Toggle Switch */
                .toggle-container {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: var(--text-secondary);
                }
                .toggle-container .active {
                    color: var(--accent-1);
                }
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 34px;
                    height: 18px;
                }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-color: rgba(255,255,255,0.1);
                    transition: .4s;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 12px; width: 12px;
                    left: 3px; bottom: 3px;
                    background-color: white;
                    transition: .4s;
                }
                input:checked + .slider { background-color: var(--accent-1); }
                input:checked + .slider:before { transform: translateX(16px); }
                .slider.round { border-radius: 34px; }
                .slider.round:before { border-radius: 50%; }

                .comparison-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 16px;
                }
                .comparison-card {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid var(--border-subtle);
                    border-radius: 12px;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    transition: transform 0.2s, background 0.2s;
                }
                .comparison-card:hover {
                    background: rgba(255, 255, 255, 0.04);
                    transform: translateY(-2px);
                }
                .metric-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .snow-tag {
                    background: var(--accent-1);
                    color: black;
                    font-size: 0.6rem;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                .metric-label {
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    color: var(--accent-2);
                    font-weight: 800;
                    letter-spacing: 0.5px;
                }
                .metric-value {
                    font-size: 2.2rem;
                    font-weight: 900;
                    color: var(--text-primary);
                    line-height: 1;
                }
                .rank-badge {
                    font-size: 0.95rem;
                    font-weight: 800;
                    letter-spacing: -0.2px;
                }
                .metric-desc {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    opacity: 0.7;
                    line-height: 1.4;
                    min-height: 2.8em;
                }
                .historical-context {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    margin-top: 4px;
                    padding-top: 12px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                }
                .hist-entry {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.7rem;
                }
                .hist-label {
                    color: var(--text-secondary);
                    opacity: 0.6;
                }
                .hist-val {
                    color: var(--text-primary);
                    font-weight: 600;
                }
                .seasonal-comparison-empty {
                    padding: 60px;
                    text-align: center;
                    color: var(--text-secondary);
                    font-style: italic;
                }

                @media (max-width: 768px) {
                    .header-top {
                        flex-direction: column;
                        gap: 16px;
                    }
                    .comparison-grid {
                        grid-template-columns: 1fr;
                    }
                    .metric-value {
                        font-size: 1.8rem;
                    }
                }
            `}</style>
        </div>
    );
}
