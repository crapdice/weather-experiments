"use client";

import React from 'react';
import { ClimateStripes } from '../ClimateStripes';
import { ThermalTopo } from '../ThermalTopo';
import { RadialCompass } from '../RadialCompass';
import { WinterIntensity } from '../WinterIntensity';
import { SunriseChart } from '../SunriseChart';
import { PredictiveLab } from '../PredictiveLab';
import { SeasonalComparisonPanel } from '../SeasonalComparison';
import { WeatherRecord, ClimateStats } from '@/utils/weatherData';

interface LabContainerProps {
    labTab: string;
    setLabTab: (tab: string) => void;
    data: WeatherRecord[];
    stats: ClimateStats | null;
}

export function LabContainer({ labTab, setLabTab, data, stats }: LabContainerProps) {
    return (
        <div className="lab-container">
            <div className="lab-tabs">
                <button className={labTab === 'stripes' ? 'active' : ''} onClick={() => setLabTab('stripes')}>Climate Stripes</button>
                <button className={labTab === 'topo' ? 'active' : ''} onClick={() => setLabTab('topo')}>3D Thermal Topo</button>
                <button className={labTab === 'radial' ? 'active' : ''} onClick={() => setLabTab('radial')}>Radial Compass</button>
                <button className={labTab === 'winter' ? 'active' : ''} onClick={() => setLabTab('winter')}>Winter Intensity</button>
                <button className={labTab === 'sunrise' ? 'active' : ''} onClick={() => setLabTab('sunrise')}>Daylight Cycle</button>
                <button className={labTab === 'predictive' ? 'active' : ''} onClick={() => setLabTab('predictive')}>Predictive Lab</button>
                <button className={labTab === 'season' ? 'active' : ''} onClick={() => setLabTab('season')}>Season Stats</button>
            </div>
            <div className="lab-content">
                {labTab === 'stripes' && data.length > 0 && <ClimateStripes data={data} />}
                {labTab === 'topo' && data.length > 0 && <ThermalTopo data={data} />}
                {labTab === 'radial' && data.length > 0 && <RadialCompass data={data} />}
                {labTab === 'winter' && data.length > 0 && <WinterIntensity data={data} />}
                {labTab === 'sunrise' && data.length > 0 && <SunriseChart data={data} />}
                {labTab === 'predictive' && data.length > 0 && <PredictiveLab data={data} />}
                {labTab === 'season' && stats?.seasonalComparisons && (
                    <SeasonalComparisonPanel
                        comparisons={stats.seasonalComparisons}
                        seasonName={stats.seasonalSnow?.seasonName || 'Current'}
                    />
                )}
            </div>
            <style jsx>{`
                .lab-container {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                .lab-tabs {
                    display: flex;
                    gap: 12px;
                    border-bottom: 1px solid var(--border-subtle);
                    padding-bottom: 12px;
                }
                .lab-tabs button {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    padding: 8px 16px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 0.9rem;
                    border-radius: 4px;
                }
                .lab-tabs button:hover:not(:disabled) {
                    color: var(--text-primary);
                    background: rgba(255, 255, 255, 0.05);
                }
                .lab-tabs button.active {
                    color: var(--accent-1);
                    background: rgba(0, 210, 255, 0.1);
                }
                @media (max-width: 768px) {
                    .lab-tabs {
                        overflow-x: auto;
                        white-space: nowrap;
                        padding-bottom: 8px;
                        -webkit-overflow-scrolling: touch;
                    }
                    .lab-tabs button {
                        padding: 6px 12px;
                        font-size: 0.8rem;
                    }
                }
            `}</style>
        </div>
    );
}
