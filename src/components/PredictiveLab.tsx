"use client";

import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { WeatherRecord } from '@/types/weather';
import { getAvgTemp, getMaxTemp, getMinTemp } from '@/utils/weatherAccessors';
import { useDimensions } from '@/hooks/useDimensions';

interface Props {
    data: WeatherRecord[];
}

export function PredictiveLab({ data }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const { width: containerWidth } = useDimensions(containerRef);
    const [viewType, setViewType] = useState<'prediction' | 'economics'>('prediction');

    // Calculate Climatology (Daily Averages/Spreads over 50 years)
    const climatology = useMemo(() => {
        const doyGroups = d3.group(data, d => d.DayOfYear);
        const results = Array.from({ length: 366 }, (_, i) => {
            const records = doyGroups.get(i + 1) || [];
            return {
                doy: i + 1,
                avg: d3.mean(records, r => getAvgTemp(r)) || 0,
                max: d3.max(records, r => getMaxTemp(r)) || 0,
                min: d3.min(records, r => getMinTemp(r)) || 0,
                avgHDD: d3.mean(records, r => r.HDD || 0) || 0,
                avgGDD: d3.mean(records, r => r.GDD || 0) || 0,
            };
        });
        return results;
    }, [data]);

    useEffect(() => {
        if (!data.length || !svgRef.current || !containerRef.current || containerWidth === 0) return;

        const margin = { top: 40, right: 60, bottom: 60, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // --- SCALES ---
        const x = d3.scaleLinear().domain([1, 366]).range([0, width]);

        const y = d3.scaleLinear()
            .domain([
                viewType === 'prediction' ? -20 : 0,
                viewType === 'prediction' ? 105 : 40
            ])
            .range([height, 0]);

        // --- AXES ---
        const xAxis = d3.axisBottom(x)
            .tickFormat(d => {
                const date = new Date(2024, 0, d as number);
                return d3.timeFormat("%b")(date);
            });

        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis)
            .attr("color", "rgba(255,255,255,0.2)");

        g.append("g")
            .call(d3.axisLeft(y).ticks(8))
            .attr("color", "rgba(255,255,255,0.2)");

        if (viewType === 'prediction') {
            // --- PREDICTION VIEW: Uncertainty Cone & Climatology ---

            // 1. All-time Historical Spread (Area)
            const spreadArea = d3.area<{ doy: number, avg: number, max: number, min: number }>()
                .x(d => x(d.doy))
                .y0(d => y(d.min))
                .y1(d => y(d.max))
                .curve(d3.curveMonotoneX);

            g.append("path")
                .datum(climatology)
                .attr("fill", "var(--accent-1)")
                .attr("opacity", 0.05)
                .attr("d", spreadArea);

            // 2. Average Normal Line
            const normalLine = d3.line<{ doy: number, avg: number }>()
                .x(d => x(d.doy))
                .y(d => y(d.avg))
                .curve(d3.curveMonotoneX);

            g.append("path")
                .datum(climatology)
                .attr("fill", "none")
                .attr("stroke", "rgba(255,255,255,0.3)")
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "4,4")
                .attr("d", normalLine);

            // 3. "Uncertainty Cone" for the next 90 days (Mocked Forward Projection)
            const lastData = data[data.length - 1];
            const startDoy = lastData.DayOfYear;
            const projectionDays = Array.from({ length: 90 }, (_, i) => {
                const targetDoy = ((startDoy + i) % 366) || 1;
                const baseNorm = climatology[targetDoy - 1];
                const variance = Math.min(15, 5 + (i * 0.1)); // Uncertainty grows over time
                return {
                    doy: targetDoy,
                    y: baseNorm.avg,
                    high: baseNorm.avg + variance,
                    low: baseNorm.avg - variance,
                    offset: i
                };
            });

            const coneArea = d3.area<{ doy: number, y: number, high: number, low: number, offset: number }>()
                .x((d) => x(d.doy + d.offset))
                .y0(d => y(d.low))
                .y1(d => y(d.high))
                .curve(d3.curveMonotoneX);

            g.append("path")
                .datum(projectionDays)
                .attr("fill", "var(--trend-line)")
                .attr("opacity", 0.15)
                .attr("d", coneArea);

            g.append("text")
                .attr("x", x(startDoy + 2))
                .attr("y", y(projectionDays[0].y) - 20)
                .text("90-Day Seasonal Projection")
                .style("fill", "var(--trend-line)")
                .style("font-size", "0.7rem")
                .style("font-weight", "bold");

            // Labels
            g.append("text").attr("x", 0).attr("y", -10).text("Predicted Seasonal Spread (90-Day Forecast)").style("fill", "white").style("font-size", "0.8rem").style("font-weight", "bold");

        } else {
            // --- ECONOMICS VIEW: HDD & GDD ---
            const hddLine = d3.line<{ doy: number, avgHDD: number }>().x(d => x(d.doy)).y(d => y(d.avgHDD)).curve(d3.curveMonotoneX);
            const gddLine = d3.line<{ doy: number, avgGDD: number }>().x(d => x(d.doy)).y(d => y(d.avgGDD)).curve(d3.curveMonotoneX);

            g.append("path")
                .datum(climatology)
                .attr("fill", "none")
                .attr("stroke", "var(--accent-1)")
                .attr("stroke-width", 2)
                .attr("d", hddLine);

            g.append("path")
                .datum(climatology)
                .attr("fill", "none")
                .attr("stroke", "var(--accent-2)")
                .attr("stroke-width", 2)
                .attr("d", gddLine);

            // Legends
            const legend = g.append("g").attr("transform", `translate(${width - 150}, 0)`);

            legend.append("rect").attr("width", 12).attr("height", 12).attr("fill", "var(--accent-1)");
            legend.append("text").attr("x", 20).attr("y", 10).text("Heating Degree Days (HDD)").style("fill", "var(--text-secondary)").style("font-size", "0.7rem");

            legend.append("rect").attr("y", 20).attr("width", 12).attr("height", 12).attr("fill", "var(--accent-2)");
            legend.append("text").attr("x", 20).attr("y", 30).text("Growing Degree Days (GDD)").style("fill", "var(--text-secondary)").style("font-size", "0.7rem");

            g.append("text").attr("x", 0).attr("y", -10).text("Climatological Energy & Agricultural Demand").style("fill", "white").style("font-size", "0.8rem").style("font-weight", "bold");
        }

    }, [climatology, viewType, data, containerWidth]);

    return (
        <div ref={containerRef} className="predictive-lab glass-panel">
            <div className="lab-header">
                <div className="title-area">
                    <strong>Forensic Projection Lab</strong>
                    <span>Cross-Variable Seasonal Intelligence</span>
                </div>
                <div className="toggle-group">
                    <button className={viewType === 'prediction' ? 'active' : ''} onClick={() => setViewType('prediction')}>Seasonal Forecast</button>
                    <button className={viewType === 'economics' ? 'active' : ''} onClick={() => setViewType('economics')}>Economic Impact (HDD/GDD)</button>
                </div>
            </div>
            <div className="lab-chart">
                <svg ref={svgRef} style={{ width: '100%', height: '500px' }}></svg>
            </div>
            <style jsx>{`
                .predictive-lab {
                    padding: 32px;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                .lab-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    padding-bottom: 20px;
                }
                .title-area {
                    display: flex;
                    flex-direction: column;
                    border-left: 4px solid var(--accent-1);
                    padding-left: 16px;
                }
                .title-area strong {
                    color: white;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-size: 1.2rem;
                }
                .title-area span {
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                    font-family: monospace;
                }
                .toggle-group {
                    display: flex;
                    gap: 8px;
                    background: rgba(0,0,0,0.2);
                    padding: 4px;
                    border-radius: 8px;
                }
                .toggle-group button {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    padding: 6px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s;
                }
                .toggle-group button.active {
                    background: var(--accent-1);
                    color: black;
                    font-weight: 800;
                }
            `}</style>
        </div>
    );
}
