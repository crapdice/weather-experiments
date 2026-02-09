"use client";

import React from 'react';
import { MetricCard } from '@/components/core/MetricCard';
import { ClimateStats } from '@/types/weather';

interface AnomalyCardProps {
    stats: ClimateStats | null;
}

export function AnomalyCard({ stats }: AnomalyCardProps) {
    if (!stats) return <MetricCard label="Anomaly" value="--" delta="Calculating..." />;

    const zScore = stats.zScore || 0;
    const label = zScore > 0 ? "Heat Anomaly" : "Cold Anomaly";
    const rarity = stats.todayPercentile ? `Rarer than ${stats.todayPercentile > 50 ? stats.todayPercentile.toFixed(0) : (100 - stats.todayPercentile).toFixed(0)}% of days` : undefined;

    return (
        <MetricCard
            label={label}
            value={`${zScore > 0 ? '+' : ''}${zScore.toFixed(1)}σ`}
            delta={rarity}
            accent={Math.abs(zScore) > 2 ? 'ro' : Math.abs(zScore) > 1 ? 'secondary' : 'primary'}
            help="Standard Deviation from the mean. ±2σ represents a 1-in-20 year statistical event."
        />
    );
}
