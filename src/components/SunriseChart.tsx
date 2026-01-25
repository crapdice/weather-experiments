"use client";

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { WeatherRecord } from '@/utils/weatherData';

interface SunriseChartProps {
    data: WeatherRecord[];
}

export function SunriseChart({ data }: SunriseChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!data || data.length === 0 || !svgRef.current) return;

        const margin = { top: 40, right: 40, bottom: 60, left: 60 };
        const width = 1000 - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;

        // Clear previous SVG
        d3.select(svgRef.current).selectAll("*").remove();

        const svg = d3.select(svgRef.current)
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const xScale = d3.scaleLinear()
            .domain([1, 366]) // Day of Year
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, 24]) // Hours of the day
            .range([0, height]); // Reversed so 00:00 is at top

        // Format data: we need sunrise and sunset as hour decimals (0-24)
        const plotData = data.filter(d => d.Sunrise && d.Sunset).map((d: WeatherRecord) => {
            const sunrise = d.Sunrise!;
            const sunset = d.Sunset!;
            return {
                doy: d.DayOfYear,
                sunriseHour: sunrise.getHours() + sunrise.getMinutes() / 60,
                sunsetHour: sunset.getHours() + sunset.getMinutes() / 60
            };
        });

        type PlotItem = (typeof plotData)[0];

        // Areas
        const daylightArea = d3.area<PlotItem>()
            .x(d => xScale(d.doy))
            .y0(d => yScale(d.sunriseHour))
            .y1(d => yScale(d.sunsetHour))
            .curve(d3.curveMonotoneX);

        const morningArea = d3.area<PlotItem>()
            .x(d => xScale(d.doy))
            .y0(d => yScale(0))
            .y1(d => yScale(d.sunriseHour))
            .curve(d3.curveMonotoneX);

        const eveningArea = d3.area<PlotItem>()
            .x(d => xScale(d.doy))
            .y0(d => yScale(d.sunsetHour))
            .y1(d => yScale(24))
            .curve(d3.curveMonotoneX);

        // Draw Areas
        svg.append("path")
            .datum(plotData)
            .attr("class", "area-daylight")
            .attr("d", daylightArea)
            .attr("fill", "rgba(255, 230, 0, 0.15)")
            .attr("stroke", "var(--accent-1)")
            .attr("stroke-width", 1);

        svg.append("path")
            .datum(plotData)
            .attr("class", "area-morning")
            .attr("d", morningArea)
            .attr("fill", "rgba(10, 20, 40, 0.6)");

        svg.append("path")
            .datum(plotData)
            .attr("class", "area-evening")
            .attr("d", eveningArea)
            .attr("fill", "rgba(10, 20, 40, 0.6)");

        // Axes
        const xAxis = d3.axisBottom(xScale)
            .tickFormat((dval) => {
                const date = new Date(2024, 0, dval as number); // Use a leap year for correct mapping
                return d3.timeFormat("%b")(date);
            })
            .ticks(12);

        const yAxis = d3.axisLeft(yScale)
            .tickValues([0, 4, 8, 12, 16, 20, 24])
            .tickFormat((dval) => `${dval}:00`);

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis)
            .style("color", "var(--text-secondary)");

        svg.append("g")
            .call(yAxis)
            .style("color", "var(--text-secondary)");

        // Labels
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .attr("text-anchor", "middle")
            .attr("fill", "var(--text-secondary)")
            .text("Day of Year (Seasonal Cycle)");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -45)
            .attr("text-anchor", "middle")
            .attr("fill", "var(--text-secondary)")
            .text("Time of Day (24h)");

        // Reference Lines
        svg.append("line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", yScale(12))
            .attr("y2", yScale(12))
            .attr("stroke", "rgba(255, 255, 255, 0.05)")
            .attr("stroke-dasharray", "4,4");

    }, [data]);

    return (
        <div className="sunrise-chart-container">
            <h3>Daylight Cycle (O&apos;Hare KORD)</h3>
            <p className="chart-description">Visualizing the seasonal contraction and expansion of daylight hours.</p>
            <div className="canvas-wrapper">
                <svg ref={svgRef}></svg>
            </div>
            <style jsx>{`
                .sunrise-chart-container {
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                h3 {
                    color: var(--accent-1);
                    font-size: 1.5rem;
                    margin: 0;
                }
                .chart-description {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    max-width: 600px;
                }
                .canvas-wrapper {
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid var(--border-subtle);
                    border-radius: 8px;
                    overflow: hidden;
                }
                svg {
                    width: 100%;
                    height: auto;
                    display: block;
                }
            `}</style>
        </div>
    );
}
