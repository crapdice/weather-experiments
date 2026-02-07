"use client";

import React from 'react';
import { MetricCard } from '../../MetricCard';
import { ClimateStats } from '@/types/weather';

interface ConditionsCardProps {
    stats: ClimateStats | null;
}

export function ConditionsCard({ stats }: ConditionsCardProps) {
    if (!stats) return <MetricCard label="Current Conditions" value="--°F" delta="Real-time" />;

    return (
        <MetricCard
            label="Current Conditions"
            value={stats.currentTemp !== undefined ? `${stats.currentTemp.toFixed(1)}°F` : '--°F'}
            subValues={stats.todayMax !== undefined && stats.todayMin !== undefined ? {
                high: `${stats.todayMax.toFixed(0)}°`,
                low: `${stats.todayMin.toFixed(0)}°`
            } : undefined}
            delta={stats.currentTempTime ? `Real-time | ${stats.currentTempTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${stats.currentTempTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : "Real-time"}
            accent="secondary"
            help="The latest temperature reading from KORD via Open-Meteo, with today's high and low."
        />
    );
}
