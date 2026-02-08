"use client";

import React, { useState, useEffect } from 'react';
import { ClimateStats, CityConfig } from '@/types/weather';
import { Sparkles, RefreshCcw, AlertTriangle } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';

interface NarratorCardProps {
    stats: ClimateStats | null;
    city: CityConfig;
}

interface Briefing {
    headline: string;
    analysis: string;
}

export function NarratorCard({ stats, city }: NarratorCardProps) {
    const { isAdmin } = useAdmin();
    const [briefing, setBriefing] = useState<Briefing | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFallback, setIsFallback] = useState(false);

    const generateFactualFallback = () => {
        if (!stats) return null;
        const low = stats.todayMin?.toFixed(1) ?? 'N/A';
        const high = stats.todayMax?.toFixed(1) ?? 'N/A';
        const wind = stats.currentWind?.toFixed(1) ?? '0';
        const rain = stats.todayRain ? `${stats.todayRain}"` : "None";
        const sunrise = stats.sunrise || "N/A";
        const sunset = stats.sunset || "N/A";

        return {
            headline: `TELEMETRY_REPORT: ${city.name} [STATION_ALPHA]`,
            analysis: `WEATHER_SYNOPSIS: Currently ${stats.currentTemp}°F. Temperature bounded by a low of ${low}°F and a high of ${high}°F. Surface winds recorded at ${wind} mph. Hydrometeor accumulation: ${rain}. Daylight cycle established: Sunrise at ${sunrise}, Sunset at ${sunset}. Climatological context matches ${stats.analogYear} pattern.`
        };
    };

    const generateBriefing = async (forceRefetch = false) => {
        if (!stats) return;

        setLoading(true);
        setError(null);
        setIsFallback(false);

        try {
            const cacheKey = `briefing_${city.id}_${new Date().toISOString().split('T')[0]}`;

            if (!forceRefetch) {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    setBriefing(JSON.parse(cached));
                    setLoading(false);
                    return;
                }
            } else {
                // Clear cache and current state for this key if forcing (Admin only)
                localStorage.removeItem(cacheKey);
                setBriefing(null);
            }

            const response = await fetch('/api/narrator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ city, stats }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to generate briefing');
            }

            const data = await response.json();
            setBriefing(data);
            localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (err: any) {
            console.error('Narrator UI Error:', err);
            const fallback = generateFactualFallback();
            if (fallback) {
                setBriefing(fallback);
                setIsFallback(true);
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only generate if we have COMPLETE stats (not just initial server-side stats)
        // dailyNormal is a good proxy for "full stats" since it's computed after all data is loaded
        if (stats && stats.dailyNormal) {
            generateBriefing();
        }
    }, [stats?.currentTempTime, stats?.dailyNormal, city.id]);

    if (!stats) return null;

    return (
        <div className="narrator-card glass-panel">
            <div className="card-header">
                <div className="title-area">
                    <div className="command-prompt">&gt;_</div>
                    <h3>DAILY_BRIEFING_FEED</h3>
                </div>
                <div className="header-controls">
                    <div className={`status-indicator ${isFallback ? 'stale' : ''}`}>
                        {isFallback ? 'TELEMETRY_FALLBACK' : 'SYSTEM_ACTIVE'}
                    </div>
                    {isAdmin && (
                        <button
                            className={`refresh-mini ${loading ? 'spinning' : ''}`}
                            onClick={() => generateBriefing(true)}
                            disabled={loading}
                            title="Regenerate Insights (Admin Only)"
                        >
                            <RefreshCcw size={12} />
                        </button>
                    )}
                </div>
            </div>

            <div className="card-content">
                {loading ? (
                    <div className="terminal-loading">
                        <div className="loading-bar"></div>
                        <p className="loading-text">DECRYPTING_METEOROLOGICAL_STREAM...</p>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <AlertTriangle size={16} />
                        <p>DATA_STREAM_ERROR: {error}</p>
                        <button onClick={() => generateBriefing(true)}>RETRY_SYNC</button>
                    </div>
                ) : briefing ? (
                    <div className="terminal-output">
                        <h2 className="headline">{briefing.headline}</h2>
                        <div className="divider"></div>
                        <p className="analysis">{briefing.analysis}</p>
                    </div>
                ) : (
                    <p className="placeholder">AWAITING_UPLINK...</p>
                )}
            </div>

            <div className="card-footer">
                <div className="origin-tag">SOURCE: KORD_STATION_ALPHA</div>
                <div className="timestamp-tag">{stats.currentTempTime?.toISOString().replace('T', ' ').slice(0, 19)}</div>
            </div>

            <div className="scanlines"></div>

            <style jsx>{`
                .narrator-card {
                    grid-column: 1 / -1;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    background: var(--bg-page);
                    border: 1px solid var(--border-subtle);
                    position: relative;
                    overflow: hidden;
                    box-shadow: inset 0 0 30px rgba(0,0,0,0.1);
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(0, 210, 255, 0.1);
                    padding-bottom: 12px;
                }

                .title-area {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: var(--accent-2);
                }

                .command-prompt {
                    font-family: var(--font-mono);
                    font-weight: 800;
                    font-size: 1rem;
                    animation: blink 1s infinite;
                }

                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }

                .title-area h3 {
                    font-family: var(--font-mono);
                    font-size: 0.75rem;
                    letter-spacing: 2px;
                    font-weight: 700;
                    margin: 0;
                }

                .header-controls {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .status-indicator {
                    font-family: var(--font-mono);
                    font-size: 0.6rem;
                    color: #4ade80;
                    padding: 2px 6px;
                    border: 1px solid #4ade80;
                    border-radius: 2px;
                    letter-spacing: 1px;
                }

                .status-indicator.stale {
                    color: #facc15;
                    border-color: #facc15;
                }

                .refresh-mini {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    opacity: 0.5;
                    transition: all 0.2s;
                }

                .refresh-mini:hover {
                    opacity: 1;
                    color: var(--accent-2);
                }

                .refresh-mini.spinning {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .card-content {
                    position: relative;
                    z-index: 2;
                    max-height: 350px;
                    overflow-y: auto;
                    padding-right: 10px;
                }

                .card-content::-webkit-scrollbar {
                    width: 4px;
                }

                .card-content::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                }

                .card-content::-webkit-scrollbar-thumb {
                    background: var(--accent-2);
                    border-radius: 2px;
                }

                .terminal-output {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .headline {
                    font-family: var(--font-inter);
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #fff;
                    margin: 0;
                    line-height: 1.1;
                    letter-spacing: -0.5px;
                }

                .divider {
                    height: 2px;
                    width: 60px;
                    background: var(--accent-2);
                    opacity: 0.8;
                    margin: 4px 0;
                }

                .analysis {
                    font-family: var(--font-inter);
                    font-size: 1.05rem;
                    line-height: 1.6;
                    color: rgba(255, 255, 255, 0.85);
                    margin: 0;
                    max-width: 100%;
                    overflow-wrap: break-word;
                    word-wrap: break-word;
                }

                .terminal-loading {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .loading-bar {
                    height: 2px;
                    width: 100%;
                    background: rgba(0, 210, 255, 0.1);
                    position: relative;
                    overflow: hidden;
                }

                .loading-bar::after {
                    content: '';
                    position: absolute;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: var(--accent-2);
                    animation: slide 1.5s infinite linear;
                }

                @keyframes slide {
                    to { left: 100%; }
                }

                .loading-text {
                    font-family: var(--font-mono);
                    font-size: 0.7rem;
                    color: var(--accent-2);
                    opacity: 0.6;
                    margin: 0;
                }

                .card-footer {
                    display: flex;
                    justify-content: space-between;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    padding-top: 16px;
                }

                .origin-tag, .timestamp-tag {
                    font-family: var(--font-mono);
                    font-size: 0.6rem;
                    color: var(--text-secondary);
                    opacity: 0.4;
                    letter-spacing: 1px;
                }

                .scanlines {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        rgba(18, 16, 16, 0) 50%, 
                        rgba(0, 0, 0, 0.1) 50%
                    );
                    background-size: 100% 4px;
                    z-index: 5;
                    pointer-events: none;
                    opacity: 0.2;
                }

                @media (max-width: 768px) {
                    .headline { font-size: 1.2rem; }
                    .analysis { font-size: 0.95rem; }
                    .narrator-card { padding: 16px; }
                }
            `}</style>
        </div>
    );
}
