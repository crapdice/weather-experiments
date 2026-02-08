"use client";

import React from 'react';
import { MetricCard } from '@/components/MetricCard';
import { ClimateStats } from '@/types/weather';

interface SeasonalCardProps {
    stats: ClimateStats | null;
    minSnowThreshold?: number;
}

// Logic Extracted for Testing
export function getSeasonalDisplayState(stats: ClimateStats, minSnowThreshold: number = 0) {
    const currentTime = stats.currentTempTime || new Date();
    const month = currentTime.getMonth();

    // Default: Snow logic for Winter/Shoulder (Nov-Apr)
    let isSnowSeason = month >= 10 || month <= 3;

    // Check Climate Config
    // If threshold is very high (e.g., 100 which implies NO SNOW), force Rain immediately.
    if (minSnowThreshold && minSnowThreshold >= 50) {
        isSnowSeason = false;
    }

    // Dynamic Switching Logic:
    // If it is technically winter, BUT snow is negligible, switch to Rain for shoulder seasons.
    if (isSnowSeason && (stats.seasonalSnow?.value || 0) < 0.1) {
        // Shoulder months: Nov (10), Dec (11), Mar (2), Apr (3)
        // Deep winter: Jan (0), Feb (1) -- Keep showing snow even if 0 unless customized
        if (month === 10 || month === 11 || month === 2 || month === 3) {
            isSnowSeason = false;
        }
    }

    const sStats = isSnowSeason ? stats.seasonalSnow : stats.seasonalRain;
    const unit = isSnowSeason ? '" Snow' : '" Rain';
    const label = isSnowSeason ? 'Season Snow' : `${sStats?.seasonName} Rain`;

    return { isSnowSeason, sStats, unit, label };
}

export function SeasonalCard({ stats, minSnowThreshold = 0 }: SeasonalCardProps) {
    if (!stats) return null;

    const { sStats, unit, label, isSnowSeason } = getSeasonalDisplayState(stats, minSnowThreshold);

    if (!sStats) return null;

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
