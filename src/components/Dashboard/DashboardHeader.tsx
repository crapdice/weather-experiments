"use client";

import React from 'react';
import { ClimateStats, WeatherRecord } from '@/utils/weatherData';

interface DashboardHeaderProps {
    data: WeatherRecord[];
    stats: ClimateStats | null;
}

export function DashboardHeader({ data, stats }: DashboardHeaderProps) {
    return (
        <header className="header">
            <h1 className="title">KORD Intelligence</h1>
            <p className="subtitle">
                Climate Data for Chicago O&apos;Hare | {data.length > 0 ? data[0].Year : '1940'} - {stats?.lastUpdate.getFullYear()}
            </p>
            <style jsx>{`
                .header {
                    text-align: center;
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
                    color: var(--text-secondary);
                    font-size: 1.1rem;
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
