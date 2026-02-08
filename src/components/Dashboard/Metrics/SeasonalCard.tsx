"use client";

import React from 'react';
import { MetricCard } from '../../MetricCard';
import { ClimateStats } from '@/types/weather';

interface SeasonalCardProps {
    stats: ClimateStats | null;
}

export function SeasonalCard({ stats }: SeasonalCardProps) {
    if (!stats) return null;

    const currentTime = stats.currentTempTime || new Date();
    const month = currentTime.getMonth();

    // Default: Snow logic for Winter/Shoulder (Nov-Apr)
    let isSnowSeason = month >= 10 || month <= 3;

    // Check recent snowfall to potentially switch modes
    // If we're in "start of winter" (Nov/Dec) but have 0 snow, maybe show Rain?
    // Or if we are in "late spring" (April) and have snow, force Snow mode.

    // Better Logic:
    // If stats.seasonalSnow has value > 0.1, prioritize Snow in winter months.
    // If stats.seasonalSnow is 0 AND we are in shoulder months (Nov, Mar, Apr), show Rain.

    if (isSnowSeason && (stats.seasonalSnow?.value || 0) < 0.1) {
        // It's technically winter, but we have no snow. 
        // If it's deep winter (Jan/Feb), keep showing "0.0 Snow" to highlight the anomaly.
        // If it's shoulder (Nov/Dec/Mar/Apr), switch to Rain.
        if (month === 10 || month === 11 || month === 2 || month === 3) {
            isSnowSeason = false;
        }
    }

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
