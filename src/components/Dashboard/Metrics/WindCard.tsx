"use client";

import React from 'react';
import { MetricCard } from '../../MetricCard';
import { ClimateStats } from '@/types/weather';

interface WindCardProps {
    stats: ClimateStats | null;
}

export function WindCard({ stats }: WindCardProps) {
    if (!stats) return <MetricCard label="Current Wind" value="-- mph" delta="Calm" />;

    return (
        <MetricCard
            label="Current Wind"
            value={stats.currentWind !== undefined ? `${stats.currentWind.toFixed(1)} mph` : '-- mph'}
            delta={stats.currentGust ? `Gusts ${stats.currentGust.toFixed(1)} mph` : 'Calm'}
            accent={stats.currentWind && stats.currentWind > 15 ? 'ro' : 'secondary'}
            help="Current sustained wind speed and peak gusts at O'Hare."
        />
    );
}
