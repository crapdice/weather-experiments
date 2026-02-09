"use client";

import React from 'react';
import { MetricCard } from '@/components/core/MetricCard';
import { ClimateStats } from '@/types/weather';

interface PatternMatchCardProps {
    stats: ClimateStats | null;
    onSelectYear?: (year: number) => void;
}

export function PatternMatchCard({ stats, onSelectYear }: PatternMatchCardProps) {
    if (!stats || !stats.analogYear) return <MetricCard label="Pattern Match" value="--" delta="Calculating similarity..." />;

    return (
        <div
            onClick={() => onSelectYear?.(stats.analogYear!.year)}
            style={{ cursor: onSelectYear ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', height: '100%' }}
        >
            <MetricCard
                label="Pattern Match"
                value={stats.analogYear.year.toString()}
                delta={`~${(stats.analogYear.similarityScore * 100).toFixed(0)}% Similarity`}
                accent="primary"
                help="The historical year with the most similar weather pattern to the last 30 days. Click to view full year comparison."
                style={{ height: '100%', flex: 1 }}
            />
        </div>
    );
}
