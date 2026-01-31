"use client";

import React from 'react';
import { TIMEFRAMES, Timeframe } from './types';

interface ChartControlsProps {
    isDrawMode: boolean;
    setIsDrawMode: (val: boolean) => void;
    showRain: boolean;
    setShowRain: (val: boolean) => void;
    showSnow: boolean;
    setShowSnow: (val: boolean) => void;
    onTimeframeChange: (tf: Timeframe) => void;
}

export function ChartControls({
    isDrawMode,
    setIsDrawMode,
    showRain,
    setShowRain,
    showSnow,
    setShowSnow,
    onTimeframeChange
}: ChartControlsProps) {
    return (
        <div className="timeframe-buttons">
            {TIMEFRAMES.map(tf => (
                <button
                    key={tf.label}
                    onClick={() => onTimeframeChange(tf)}
                    className="time-btn glass-panel"
                >
                    {tf.label}
                </button>
            ))}
            <button
                className={`time-btn glass-panel ${isDrawMode ? 'active-draw' : ''}`}
                onClick={() => setIsDrawMode(!isDrawMode)}
                style={{ marginLeft: '12px', borderColor: isDrawMode ? 'var(--trend-line)' : '' }}
            >
                {isDrawMode ? 'Exit Draw Mode' : '✎ Draw Trend'}
            </button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button
                    className={`time-btn glass-panel ${showRain ? 'active-precip' : ''}`}
                    onClick={() => setShowRain(!showRain)}
                    style={{ borderColor: showRain ? '#00d2ff' : '' }}
                >
                    💧 Rain
                </button>
                <button
                    className={`time-btn glass-panel ${showSnow ? 'active-precip' : ''}`}
                    onClick={() => setShowSnow(!showSnow)}
                    style={{ borderColor: showSnow ? '#ffffff' : '' }}
                >
                    ❄️ Snow
                </button>
            </div>

            <style jsx>{`
                .timeframe-buttons {
                    display: flex;
                    justify-content: flex-start;
                    gap: 8px;
                    margin-bottom: 10px;
                    overflow-x: auto;
                    white-space: nowrap;
                    padding: 4px 0;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                }
                .timeframe-buttons::-webkit-scrollbar {
                    display: none;
                }
                .time-btn {
                    background: var(--bg-component);
                    border: 1px solid var(--border-subtle);
                    color: var(--text-secondary);
                    padding: 6px 14px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    cursor: pointer;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                    font-family: inherit;
                }
                .time-btn:hover {
                    color: var(--accent-1);
                    border-color: var(--accent-1);
                    background: rgba(0, 210, 255, 0.1);
                }
                .active-draw {
                    background: rgba(0, 210, 255, 0.2) !important;
                    color: var(--accent-1) !important;
                    border-color: var(--accent-1) !important;
                    box-shadow: 0 0 10px rgba(0, 210, 255, 0.3);
                }
                .active-precip {
                    background: rgba(255, 255, 255, 0.1) !important;
                    color: var(--text-primary) !important;
                    box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
}
