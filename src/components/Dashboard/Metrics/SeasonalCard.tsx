"use client";

import React from 'react';
import { MetricCard } from '../../MetricCard';
import { ClimateStats } from '@/types/weather';

interface SeasonalCardProps {
    stats: ClimateStats | null;
}

export function SeasonalCard({ stats }: SeasonalCardProps) {
    if (!stats) return null;

    const month = stats.currentTempTime ? stats.currentTempTime.getMonth() : new Date().getMonth();
    // Show snow if we are between Nov (10) and April (3)
    const isSnowSeason = month >= 10 || month <= 3;
    const sStats = isSnowSeason ? stats.seasonalSnow : stats.seasonalRain;

    if (!sStats) return null;

    const unit = isSnowSeason ? '" Snow' : '" Rain';
    const label = isSnowSeason ? 'Season Snow' : `${sStats.seasonName} Rain`;

    const getRankStr = (n: number) => {
        const j = n % 10, k = n % 100;
        if (j == 1 && k != 11) return `${n}st`;
        if (j == 2 && k != 12) return `${n}nd`;
        if (j == 3 && k != 13) return `${n}rd`;
        return `${n}th`;
    };

    const description = sStats.rank === 1
        ? `Record ${sStats.seasonName}`
        : sStats.rank <= 5
            ? `Top 5 ${sStats.seasonName}`
            : sStats.rank >= sStats.totalYears - 5
                ? `Top 5 Driest`
                : `${getRankStr(sStats.rank)} Wettest`;

    return (
        <MetricCard
            label={label}
            value={`${sStats.value.toFixed(1)}${unit}`}
            delta={`${description} (of ${sStats.totalYears} yrs)`}
            accent={sStats.rank <= 10 ? 'secondary' : 'primary'}
            help={`Ranking accumulated ${isSnowSeason ? 'snowfall' : 'precipitation'} for this ${isSnowSeason ? 'Winter (July-June)' : 'season'} against all records since 1940.`}
        />
    );
}
