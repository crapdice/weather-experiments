"use client";

import React from 'react';

interface SMAControlsProps {
    smaWindow: number;
    setSmaWindow: (val: number) => void;
}

export function SMAControls({ smaWindow, setSmaWindow }: SMAControlsProps) {
    return (
        <div className="sma-controls-container glass-panel">
            <div className="sma-header">
                <div className="sma-label-group">
                    <span className="sma-label">SMOOTHING ENGINE</span>
                    <span className="sma-value">{smaWindow} DAY MOVING AVERAGE</span>
                </div>
                <div className="sma-presets">
                    {[7, 14, 30, 90, 180, 365].map(v => (
                        <button
                            key={v}
                            onClick={() => setSmaWindow(v)}
                            className={`sma-preset-btn ${smaWindow === v ? 'active' : ''}`}
                        >
                            {v === 365 ? '1Y' : `${v}D`}
                        </button>
                    ))}
                </div>
            </div>

            <div className="sma-slider-wrapper">
                <input
                    type="range"
                    min="1"
                    max="365"
                    value={smaWindow}
                    onChange={(e) => setSmaWindow(parseInt(e.target.value))}
                    className="sma-slider"
                />
                <div className="slider-labels">
                    <span>1D (RAW)</span>
                    <span>365D (ANNUAL)</span>
                </div>
            </div>

            <style jsx>{`
                .sma-controls-container {
                    padding: 16px 24px;
                    margin-top: 12px;
                    background: rgba(255, 255, 255, 0.02);
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .sma-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 20px;
                }
                .sma-label-group {
                    display: flex;
                    flex-direction: column;
                }
                .sma-label {
                    font-size: 0.65rem;
                    text-transform: uppercase;
                    color: var(--accent-1);
                    font-weight: 900;
                    letter-spacing: 1.5px;
                }
                .sma-value {
                    font-size: 1rem;
                    font-weight: 800;
                    color: var(--text-primary);
                }
                .sma-presets {
                    display: flex;
                    gap: 6px;
                }
                .sma-preset-btn {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: var(--text-secondary);
                    padding: 6px 10px;
                    font-size: 0.7rem;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-weight: 700;
                }
                .sma-preset-btn:hover {
                    border-color: var(--accent-1);
                    color: var(--accent-1);
                }
                .sma-preset-btn.active {
                    background: var(--accent-1);
                    color: black;
                    border-color: var(--accent-1);
                    box-shadow: 0 0 15px rgba(0, 210, 255, 0.3);
                }
                .sma-slider-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .sma-slider {
                    width: 100%;
                    height: 6px;
                    -webkit-appearance: none;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    outline: none;
                }
                .sma-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 20px;
                    height: 20px;
                    background: var(--accent-1);
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(0, 210, 255, 0.5);
                    border: 2px solid white;
                }
                .slider-labels {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.6rem;
                    color: var(--text-secondary);
                    font-weight: bold;
                    letter-spacing: 0.5px;
                }

                @media (max-width: 768px) {
                    .sma-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    .sma-presets {
                        width: 100%;
                        overflow-x: auto;
                        padding: 4px 0;
                    }
                }
            `}</style>
        </div>
    );
}
