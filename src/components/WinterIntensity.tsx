"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { WeatherRecord } from '@/utils/weatherData';

interface Props {
    data: WeatherRecord[];
}

export function WinterIntensity({ data }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [widthState, setWidthState] = useState(0);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) setWidthState(containerRef.current.clientWidth);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const winterData = useMemo(() => {
        // Filter for winter months (Nov, Dec, Jan, Feb, Mar)
        return data.filter(d => {
            const month = d.Date.getMonth();
            return [10, 11, 0, 1, 2].includes(month);
        });
    }, [data]);

    const [dateRange, setDateRange] = useState<[Date, Date] | null>(() => {
        if (winterData.length) {
            const end = winterData[winterData.length - 1].Date;
            const start = new Date(end);
            start.setFullYear(start.getFullYear() - 5);
            return [start < winterData[0].Date ? winterData[0].Date : start, end];
        }
        return null;
    });

    // Initial date range handled by useState initializer.

    useEffect(() => {
        if (!winterData.length || !svgRef.current || !containerRef.current || !dateRange) return;

        const isMobile = window.innerWidth <= 768;
        const margin = {
            top: 40,
            right: isMobile ? 30 : 60,
            bottom: 80,
            left: isMobile ? 30 : 60
        };
        const width = containerRef.current.clientWidth - margin.left - margin.right;
        const mainHeight = isMobile ? 250 : 400;
        const brushHeight = 40;
        const padding = 40;
        const totalHeight = mainHeight + brushHeight + padding;

        svgRef.current.style.height = `${totalHeight + margin.top + margin.bottom}px`;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const filtered = winterData.filter(d => d.Date >= dateRange[0] && d.Date <= dateRange[1]);

        // --- SCALES ---
        const x = d3.scaleTime()
            .domain(dateRange)
            .range([0, width]);

        const xFull = d3.scaleTime()
            .domain(d3.extent(winterData, d => d.Date) as [Date, Date])
            .range([0, width]);

        const ySnow = d3.scaleLinear()
            .domain([0, d3.max(filtered, d => d.Snow || 0)! || 1])
            .range([mainHeight, 0]);

        const yTemp = d3.scaleLinear()
            .domain([d3.min(filtered, d => d['Min Temp (°F)'])! - 5, d3.max(filtered, d => d['Min Temp (°F)'])! + 5])
            .range([mainHeight, 0]);

        // --- CLIP PATH ---
        g.append("defs").append("clipPath")
            .attr("id", "clip-winter")
            .append("rect")
            .attr("width", width)
            .attr("height", mainHeight);

        // --- MAIN CHART AREA ---
        const mainArea = g.append("g").attr("clip-path", "url(#clip-winter)");

        // Snow bars (High Contrast White)
        mainArea.selectAll(".snow-bar-winter")
            .data(filtered.filter(d => (d.Snow || 0) > 0.05))
            .enter().append("rect")
            .attr("class", "snow-bar-winter")
            .attr("x", d => x(d.Date) - Math.max(1, width / filtered.length) / 2)
            .attr("y", d => ySnow(d.Snow || 0))
            .attr("width", Math.max(2, width / filtered.length))
            .attr("height", d => mainHeight - ySnow(d.Snow || 0))
            .attr("fill", "#ffffff")
            .attr("opacity", 0.25);

        // Temp Line (Stark Cyan/Red Contrast)
        const lineTemp = d3.line<WeatherRecord>()
            .x(d => x(d.Date))
            .y(d => yTemp(d['Min Temp (°F)']))
            .curve(d3.curveMonotoneX);

        mainArea.append("path")
            .datum(filtered)
            .attr("fill", "none")
            .attr("stroke", "#ff3e3e") // Stark Red for cold minimums
            .attr("stroke-width", 2.5)
            .attr("d", lineTemp);

        // Granular Markers (Individual Daily Points)
        mainArea.selectAll(".temp-dot")
            .data(filtered)
            .enter().append("circle")
            .attr("class", "temp-dot")
            .attr("cx", d => x(d.Date))
            .attr("cy", d => yTemp(d['Min Temp (°F)']))
            .attr("r", 1.5)
            .attr("fill", "#ff3e3e")
            .attr("stroke", "#0a0f19")
            .attr("stroke-width", 0.5);

        // --- AXES ---
        g.append("g")
            .attr("transform", `translate(0,${mainHeight})`)
            .call(d3.axisBottom(x).ticks(width / 100))
            .attr("color", "rgba(255,255,255,0.3)");

        g.append("g")
            .call(d3.axisLeft(ySnow).ticks(5))
            .attr("color", "rgba(255,255,255,0.5)");

        g.append("g")
            .attr("transform", `translate(${width}, 0)`)
            .call(d3.axisRight(yTemp).ticks(5))
            .attr("color", "rgba(255,62,62,0.5)");

        // --- BRUSH (RANGE SELECTOR) ---
        const gBrush = g.append("g")
            .attr("transform", `translate(0, ${mainHeight + padding})`);

        const brush = d3.brushX()
            .extent([[0, 0], [width, brushHeight]])
            .on("end", (event) => {
                if (!event.sourceEvent || !event.selection) return;
                const [x0, x1] = event.selection;
                setDateRange([xFull.invert(x0), xFull.invert(x1)]);
            });

        // Brush Background (Simplified view)
        const brushXScale = d3.scaleTime()
            .domain(xFull.domain())
            .range([0, width]);

        const brushYScale = d3.scaleLinear()
            .domain(ySnow.domain())
            .range([brushHeight, 0]);

        gBrush.append("path")
            .datum(winterData)
            .attr("fill", "none")
            .attr("stroke", "rgba(255,255,255,0.1)")
            .attr("stroke-width", 1)
            .attr("d", d3.line<WeatherRecord>().x(d => brushXScale(d.Date)).y(d => brushYScale(d.Snow || 0)).curve(d3.curveLinear));

        gBrush.call(brush)
            .call(brush.move as unknown as (selection: d3.Selection<SVGGElement, unknown, null, undefined>) => void, xFull.range() as [number, number]);

        // Labels
        g.append("text").attr("x", 0).attr("y", -10).text("❄️ Historical Snow Accumulation (Inches)").style("fill", "white").style("font-size", "0.75rem").style("font-weight", "bold");
        g.append("text").attr("x", width).attr("y", -10).attr("text-anchor", "end").text("🌡️ Daily Minimums (°F)").style("fill", "#ff3e3e").style("font-size", "0.75rem").style("font-weight", "bold");

    }, [winterData, dateRange, widthState]);

    return (
        <div ref={containerRef} className="winter-intensity-container glass-panel">
            <div className="chart-header">
                <div className="title-group">
                    <strong>Winter Intensity Matrix</strong>
                    <span>Archive Precision: Snowfall vs. Sub-Zero Thresholds</span>
                </div>
                <button className="reset-btn" onClick={() => {
                    if (winterData.length) {
                        const end = winterData[winterData.length - 1].Date;
                        const start = new Date(end);
                        start.setFullYear(start.getFullYear() - 5);
                        setDateRange([start < winterData[0].Date ? winterData[0].Date : start, end]);
                    }
                }}>Reset Range</button>
            </div>
            <div className="chart-body">
                <svg ref={svgRef} style={{ width: '100%' }}></svg>
            </div>
            <style jsx>{`
        .winter-intensity-container {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          background: rgba(10, 15, 25, 0.8);
        }
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-left: 4px solid #ffffff;
          padding-left: 16px;
        }
        .title-group {
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 768px) {
          .winter-intensity-container {
            padding: 16px;
            gap: 16px;
          }
          .chart-header strong {
            font-size: 1.1rem;
          }
          .chart-header span {
            font-size: 0.7rem;
          }
        }

        .chart-header strong {
          color: #ffffff;
          text-transform: uppercase;
          font-weight: 950;
          font-size: 1.4rem;
          letter-spacing: 1px;
        }
        .chart-header span {
            font-size: 0.85rem;
            color: var(--text-secondary);
            font-family: monospace;
        }
        .reset-btn {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            padding: 4px 12px;
            font-size: 0.7rem;
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.2s;
        }
        .reset-btn:hover {
            background: rgba(255,255,255,0.15);
            border-color: #ffffff;
        }
        :global(.selection) {
            fill: #ffffff;
            fill-opacity: 0.1;
            stroke: #ffffff;
        }
      `}</style>
        </div>
    );
}
