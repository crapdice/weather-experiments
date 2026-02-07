"use client";

import React from 'react';
import { MetricCard } from '../../MetricCard';
import { ClimateStats } from '@/types/weather';

interface StreakCardProps {
    stats: ClimateStats | null;
}

export function StreakCard({ stats }: StreakCardProps) {
    if (!stats || !stats.currentStreak) return <MetricCard label="Streak" value="--" delta="No active streak" />;

    return (
        <MetricCard
            label={stats.currentStreak.type}
            value={`${stats.currentStreak.count} Days`}
            delta={`Started ${stats.currentStreak.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            accent={stats.currentStreak.count > 5 ? 'secondary' : 'primary'}
            help="Consecutive days maintaining the current temperature regime."
        />
    );
}
