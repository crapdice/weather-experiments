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

    const generateBriefing = async (forceRefetch = false) => {
        if (!stats) return;

        setLoading(true);
        setError(null);

        try {
            const cacheKey = `briefing_${city.id}_${new Date().toISOString().split('T')[0]}`;

            if (!forceRefetch) {
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    setBriefing(JSON.parse(cached));
                    setLoading(false);
                    return;
                }
            } else {
                // Clear cache for this key if forcing
                sessionStorage.removeItem(cacheKey);
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
            sessionStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (err: any) {
            console.error('Narrator UI Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (stats) {
            generateBriefing();
        }
    }, [stats?.currentTempTime, city.id]);

    if (!stats) return null;

    return (
        <div className="narrator-card glass-panel">
            <div className="card-header">
                <div className="title-area">
                    <Sparkles size={16} className="sparkle-icon" />
                    <h3>Daily Briefing</h3>
                </div>
                {isAdmin && (
                    <button
                        className={`refresh-mini ${loading ? 'spinning' : ''}`}
                        onClick={() => generateBriefing(true)}
                        disabled={loading}
                        title="Regenerate Insights (Admin Only)"
                    >
                        <RefreshCcw size={14} />
                    </button>
                )}
            </div>

            <div className="card-content">
                {loading ? (
                    <div className="shimmer-container">
                        <div className="shimmer headline-shimmer"></div>
                        <div className="shimmer body-shimmer"></div>
                        <div className="shimmer body-shimmer short"></div>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <AlertTriangle size={20} />
                        <p>{error}</p>
                        <button onClick={() => generateBriefing(true)}>Retry</button>
                    </div>
                ) : briefing ? (
                    <>
                        <h2 className="headline">{briefing.headline}</h2>
                        <p className="analysis">{briefing.analysis}</p>
                    </>
                ) : (
                    <p className="placeholder">Awaiting intelligence feed...</p>
                )}
            </div>

            <div className="card-footer">
                <span className="ai-badge">Gemini 2.0 Flash</span>
                <span className="location-tag">{city.name} Station</span>
            </div>

            <style jsx>{`
                .narrator-card {
                    grid-column: 1 / -1;
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
                    border-left: 3px solid var(--accent-2);
                    min-height: 180px;
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .title-area {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--accent-2);
                }

                .title-area h3 {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: 800;
                    margin: 0;
                }

                .sparkle-icon {
                    filter: drop-shadow(0 0 5px var(--accent-2));
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0% { opacity: 0.6; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.1); }
                    100% { opacity: 0.6; transform: scale(1); }
                }

                .refresh-mini {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .refresh-mini:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.1);
                    color: var(--text-primary);
                }

                .refresh-mini.spinning {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .headline {
                    font-size: 1.4rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin: 0 0 12px 0;
                    line-height: 1.2;
                }

                .analysis {
                    font-size: 1.05rem;
                    line-height: 1.5;
                    color: var(--text-secondary);
                    margin: 0;
                }

                .card-footer {
                    margin-top: auto;
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.7rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .ai-badge {
                    color: var(--accent-2);
                    opacity: 0.8;
                }

                .location-tag {
                    color: var(--text-secondary);
                    opacity: 0.5;
                }

                /* Shimmer Effect */
                .shimmer-container {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .shimmer {
                    background: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0.05) 25%,
                        rgba(255, 255, 255, 0.1) 50%,
                        rgba(255, 255, 255, 0.05) 75%
                    );
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                    border-radius: 4px;
                }

                @keyframes shimmer {
                    from { background-position: 200% 0; }
                    to { background-position: -200% 0; }
                }

                .headline-shimmer { height: 28px; width: 80%; }
                .body-shimmer { height: 16px; width: 100%; }
                .body-shimmer.short { width: 60%; }

                .error-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    color: var(--ro-line);
                    text-align: center;
                    padding: 20px 0;
                }

                .error-state p {
                    margin: 0;
                    font-size: 0.9rem;
                }

                .error-state button {
                    background: rgba(255, 75, 43, 0.1);
                    border: 1px solid var(--ro-line);
                    color: var(--ro-line);
                    padding: 4px 12px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    cursor: pointer;
                }

                @media (max-width: 768px) {
                    .headline { font-size: 1.1rem; }
                    .analysis { font-size: 0.9rem; }
                }
            `}</style>
        </div>
    );
}
