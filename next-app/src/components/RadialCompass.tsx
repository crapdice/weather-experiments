"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { WeatherRecord } from '@/utils/weatherData';

interface Props {
    data: WeatherRecord[];
}

export function RadialCompass({ data }: Props) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [selectedYear, setSelectedYear] = useState<number>(0);

    const years = useMemo(() => {
        return Array.from(new Set(data.map(d => d.Year))).sort((a, b) => b - a);
    }, [data]);

    useEffect(() => {
        if (years.length && selectedYear === 0) {
            setSelectedYear(years[0]);
        }
    }, [years, selectedYear]);

    const yearData = useMemo(() => {
        return data.filter(d => d.Year === selectedYear);
    }, [data, selectedYear]);

    useEffect(() => {
        if (!yearData.length || !svgRef.current) return;

        const width = svgRef.current.clientWidth;
        const height = 600;
        const margin = 40;
        const radius = Math.min(width, height) / 2 - margin;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const g = svg.append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);

        // --- SCALES ---
        const angle = d3.scaleLinear()
            .domain([1, 366])
            .range([0, 2 * Math.PI]);

        const r = d3.scaleLinear()
            .domain([-10, 100]) // Temp range
            .range([radius * 0.2, radius]);

        // --- GRID ---
        const ticks = [0, 20, 40, 60, 80, 100];
        g.selectAll(".grid-circle")
            .data(ticks)
            .enter()
            .append("circle")
            .attr("r", d => r(d))
            .attr("fill", "none")
            .attr("stroke", "var(--border-subtle)")
            .attr("stroke-dasharray", "2,2")
            .attr("opacity", 0.5);

        g.selectAll(".grid-label")
            .data(ticks)
            .enter()
            .append("text")
            .attr("y", d => -r(d))
            .attr("dy", "0.35em")
            .style("font-size", "0.6rem")
            .style("fill", "var(--text-secondary)")
            .text(d => `${d}°F`);

        // Month Labels
        const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
        g.selectAll(".month-axis")
            .data(months)
            .enter()
            .append("line")
            .attr("x1", 0)
            .attr("y1", -r(-10))
            .attr("x2", 0)
            .attr("y2", -radius)
            .attr("transform", (d, i) => `rotate(${(i * 30)})`)
            .attr("stroke", "var(--border-subtle)")
            .attr("stroke-width", 0.5);

        g.selectAll(".month-label")
            .data(months)
            .enter()
            .append("text")
            .attr("x", (d, i) => (radius + 20) * Math.sin(i * Math.PI / 6))
            .attr("y", (d, i) => -(radius + 20) * Math.cos(i * Math.PI / 6))
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .style("font-size", "0.8rem")
            .style("font-weight", "bold")
            .style("fill", "var(--accent-1)")
            .text(d => d);

        // --- RADIAL LINE ---
        const radialLine = d3.radialLine<WeatherRecord>()
            .angle(d => angle(d.DayOfYear))
            .radius(d => r(d['Avg Temp (°F)']))
            .curve(d3.curveBasis);

        const path = g.append("path")
            .datum(yearData)
            .attr("fill", "none")
            .attr("stroke", "url(#radial-gradient)")
            .attr("stroke-width", 2.5)
            .attr("d", radialLine);

        // Animation: Length of path
        const length = path.node()?.getTotalLength() || 0;
        path.attr("stroke-dasharray", length)
            .attr("stroke-dashoffset", length)
            .transition()
            .duration(2000)
            .attr("stroke-dashoffset", 0);

        // --- GRADIENT ---
        const defs = svg.append("defs");
        const gradient = defs.append("radialGradient")
            .attr("id", "radial-gradient")
            .attr("cx", "0").attr("cy", "0").attr("r", "1")
            .attr("gradientUnits", "userSpaceOnUse");

        gradient.append("stop").attr("offset", "0%").attr("stop-color", "#00FFFF");
        gradient.append("stop").attr("offset", "50%").attr("stop-color", "#ADFF2F");
        gradient.append("stop").attr("offset", "100%").attr("stop-color", "#FF4500");

        // --- HOVER RECT FOR TOOLTIP ---
        // In radial charts, interaction is trickier. For now, let's add a simple overlay or tooltip on dots.
        g.selectAll(".dot")
            .data(yearData.filter((_, i) => i % 10 === 0)) // Sample dots
            .enter()
            .append("circle")
            .attr("cx", d => r(d['Avg Temp (°F)']) * Math.sin(angle(d.DayOfYear)))
            .attr("cy", d => -r(d['Avg Temp (°F)']) * Math.cos(angle(d.DayOfYear)))
            .attr("r", 3)
            .attr("fill", "var(--accent-1)")
            .attr("opacity", 0)
            .attr("pointer-events", "all")
            .on("mouseover", function () { d3.select(this).attr("opacity", 1); })
            .on("mouseout", function () { d3.select(this).attr("opacity", 0); })
            .append("title")
            .text(d => `${d.Date.toLocaleDateString()}: ${d['Avg Temp (°F)'].toFixed(1)}°F`);

    }, [yearData]);

    return (
        <div className="radial-container">
            <div className="radial-controls">
                <div className="control-group">
                    <label>Select Year:</label>
                    <select value={selectedYear} onChange={e => setSelectedYear(+e.target.value)}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="radial-stats glass-panel">
                    <div className="stat-item">
                        <span className="label">Annual Mean:</span>
                        <span className="value">{(d3.mean(yearData, d => d['Avg Temp (°F)']) || 0).toFixed(1)}°F</span>
                    </div>
                    <div className="stat-item">
                        <span className="label">Max Excursion:</span>
                        <span className="value">{(d3.max(yearData, d => d['Avg Temp (°F)']) || 0).toFixed(1)}°F</span>
                    </div>
                </div>
            </div>

            <svg ref={svgRef} style={{ width: '100%', height: '600px' }}></svg>

            <style jsx>{`
        .radial-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 20px;
        }
        .radial-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .control-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        label {
          font-size: 0.85rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          font-weight: 800;
        }
        select {
          background: var(--bg-component);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          padding: 8px 16px;
          border-radius: 6px;
          font-family: inherit;
          cursor: pointer;
        }
        .radial-stats {
          display: flex;
          gap: 24px;
          padding: 12px 20px;
        }
        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .stat-item .label {
          font-size: 0.65rem;
          color: var(--text-secondary);
          text-transform: uppercase;
        }
        .stat-item .value {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--accent-1);
        }
      `}</style>
        </div>
    );
}
