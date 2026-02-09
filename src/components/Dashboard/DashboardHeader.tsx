"use client";

import React from 'react';
import { ClimateStats, WeatherRecord, CityConfig } from '@/types/weather';
import { SatelliteHeader } from '@/components/header/SatelliteHeader';

interface DashboardHeaderProps {
    data: WeatherRecord[];
    stats: ClimateStats | null;
    city: CityConfig;
}

export function DashboardHeader({ data, stats, city }: DashboardHeaderProps) {
    return (
        <header className="header">
            <div className="satellite-container">
                <SatelliteHeader />
                <div className="title-overlay">
                    <h1 className="title">{city.title}</h1>
                    <p className="subtitle">
                        {city.subtitle} | {data.length > 0 ? data[0].Year : '1940'} - {stats?.lastUpdate.getFullYear()}
                    </p>
                </div>
            </div>
            <style jsx>{`
                .header {
                    width: 100%;
                    margin-bottom: 20px;
                }
                .satellite-container {
                    position: relative;
                    width: 100%;
                    /* SatelliteHeader has its own height (300px), but we can contain it */
                }
                .title-overlay {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 30; /* Above scanlines */
                    pointer-events: none; /* Let clicks pass through if needed */
                    text-shadow: 0 4px 20px rgba(0,0,0,0.8);
                }
                .title {
                    font-size: 3.5rem;
                    font-weight: 800;
                    color: var(--accent-1);
                    margin-bottom: 8px;
                    background: linear-gradient(to bottom, var(--accent-1), var(--accent-2));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-family: var(--font-main);
                }
                .subtitle {
                    color: white; /* Ensure visibility over potential dark/green background */
                    font-size: 1.1rem;
                    opacity: 0.9;
                }
                @media (max-width: 768px) {
                    .title {
                        font-size: clamp(1.5rem, 10vw, 2.2rem);
                    }
                    .subtitle {
                        font-size: 0.9rem;
                    }
                }
            `}</style>
        </header>
    );
}
