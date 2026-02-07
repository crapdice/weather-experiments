"use client";

import React, { useRef } from 'react';
import { OverviewChartProps } from './OverviewChart/types';
import { ChartControls } from './OverviewChart/ChartControls';
import { D3Chart } from './OverviewChart/D3Chart';
import { SMAControls } from './OverviewChart/SMAControls';
import { useOverviewChartState } from './OverviewChart/useOverviewChartState';
import { useDimensions } from '@/hooks/useDimensions';
import { useAdmin } from '@/context/AdminContext';

export function OverviewChart({ data }: OverviewChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const dimensions = useDimensions(containerRef);
    const { isAdmin } = useAdmin();
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
        smaWindow,
        setSmaWindow,
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
                smaWindow={smaWindow}
                setDateRange={setDateRange}
                setTrendLine={setTrendLine}
            />

            {isAdmin && (
                <SMAControls
                    smaWindow={smaWindow}
                    setSmaWindow={setSmaWindow}
                />
            )}

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
