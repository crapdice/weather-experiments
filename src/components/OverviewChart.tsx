"use client";

import React, { useRef } from 'react';
import { OverviewChartProps } from './OverviewChart/types';
import { ChartControls } from './OverviewChart/ChartControls';
import { D3Chart } from './OverviewChart/D3Chart';
import { useOverviewChartState } from './OverviewChart/useOverviewChartState';
import { useDimensions } from '@/hooks/useDimensions';

export function OverviewChart({ data }: OverviewChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const dimensions = useDimensions(containerRef);
    const {
        dateRange,
        setDateRange,
        isDrawMode,
        setIsDrawMode,
        trendLine,
        setTrendLine,
        showRain,
        setShowRain,
        showSnow,
        setShowSnow,
        handleTimeframeChange
    } = useOverviewChartState(data);

    if (!dateRange) return null;

    return (
        <div ref={containerRef} className="overview-container">
            <ChartControls
                isDrawMode={isDrawMode}
                setIsDrawMode={setIsDrawMode}
                showRain={showRain}
                setShowRain={setShowRain}
                showSnow={showSnow}
                setShowSnow={setShowSnow}
                onTimeframeChange={handleTimeframeChange}
            />

            <D3Chart
                data={data}
                dateRange={dateRange}
                dimensions={dimensions}
                isDrawMode={isDrawMode}
                trendLine={trendLine}
                showRain={showRain}
                showSnow={showSnow}
                setDateRange={setDateRange}
                setTrendLine={setTrendLine}
            />

            <style jsx>{`
                .overview-container {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    width: 100%;
                }
            `}</style>
        </div>
    );
}
