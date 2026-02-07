"use client";

import React from 'react';
import { MetricCard } from '../../MetricCard';
import { ClimateStats } from '@/types/weather';

interface PatternMatchCardProps {
    stats: ClimateStats | null;
}

export function PatternMatchCard({ stats }: PatternMatchCardProps) {
    if (!stats || !stats.analogYear) return <MetricCard label="Pattern Match" value="--" delta="Calculating similarity..." />;

    return (
        <MetricCard
            label="Pattern Match"
            value={stats.analogYear.year.toString()}
            delta={`~${(stats.analogYear.similarityScore * 100).toFixed(0)}% Similarity`}
            accent="primary"
            help="The historical year with the most similar weather pattern to the last 30 days."
        />
    );
}
