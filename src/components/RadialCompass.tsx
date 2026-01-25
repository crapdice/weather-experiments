"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { WeatherRecord } from '@/utils/weatherData';

interface Props {
    data: WeatherRecord[];
}

export function RadialCompass({ data }: Props) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const handleResize = () => {
            if (svgRef.current) setWidth(svgRef.current.clientWidth);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const years = useMemo(() => {
        return Array.from(new Set(data.map(d => d.Year))).sort((a, b) => a - b);
    }, [data]);

    const yearGroups = useMemo(() => {
        return d3.group(data, d => d.Year);
    }, [data]);

    useEffect(() => {
        if (!data.length || !svgRef.current) return;

        const isMobile = window.innerWidth <= 768;
        const width = svgRef.current.clientWidth;
        const height = isMobile ? 400 : 650;
        const margin = isMobile ? 40 : 60;
        const legendWidth = isMobile ? 0 : 120;
        const chartWidth = width - legendWidth;
        const radius = Math.min(chartWidth, height) / 2 - margin;

        svgRef.current.style.height = `${height}px`;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const g = svg.append("g")
            .attr("transform", `translate(${chartWidth / 2},${height / 2})`);

        // --- SCALES ---
        const angle = d3.scaleLinear()
            .domain([1, 366])
            .range([0, 2 * Math.PI]);

        const r = d3.scaleLinear()
            .domain([-20, 100]) // Temp range
            .range([radius * 0.1, radius]);

        const colorScale = d3.scaleSequential(d3.interpolateSinebow)
            .domain([years[0], years[years.length - 1]]);

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
            .attr("opacity", 0.3);

        g.selectAll(".grid-label")
            .data(ticks)
            .enter()
            .append("text")
            .attr("x", 5)
            .attr("y", d => -r(d))
            .attr("dy", "0.35em")
            .style("font-size", "0.65rem")
            .style("fill", "var(--text-secondary)")
            .text(d => `${d}°F`);

        // Month Labels
        const months = [
            { name: "Jan", doy: 1 }, { name: "Apr", doy: 91 },
            { name: "Jul", doy: 182 }, { name: "Oct", doy: 274 }
        ];

        g.selectAll(".month-axis")
            .data(months)
            .enter()
            .append("line")
            .attr("x1", 0)
            .attr("y1", -r(-20))
            .attr("x2", 0)
            .attr("y2", -radius)
            .attr("transform", d => `rotate(${angle(d.doy) * 180 / Math.PI})`)
            .attr("stroke", "var(--border-subtle)")
            .attr("opacity", 0.3);

        g.selectAll(".month-label")
            .data(months)
            .enter()
            .append("text")
            .attr("x", d => (radius + 25) * Math.sin(angle(d.doy)))
            .attr("y", d => -(radius + 25) * Math.cos(angle(d.doy)))
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .style("font-size", "0.85rem")
            .style("font-weight", "bold")
            .style("fill", "var(--text-primary)")
            .text(d => d.name);

        // --- RADIAL LINES ---
        const radialLine = d3.radialLine<WeatherRecord>()
            .angle(d => angle(d.DayOfYear))
            .radius(d => r(d['Avg Temp (°F)']))
            .curve(d3.curveBasis);

        const plotYears = selectedYear === 'all' ? years : [selectedYear];

        plotYears.forEach((year) => {
            const currentYearData = yearGroups.get(year) || [];
            g.append("path")
                .datum(currentYearData)
                .attr("fill", "none")
                .attr("stroke", colorScale(year))
                .attr("stroke-width", selectedYear === 'all' ? 0.8 : 2.5)
                .attr("opacity", selectedYear === 'all' ? 0.6 : 1)
                .attr("d", radialLine)
                .attr("class", "year-path")
                .on("mouseover", function () {
                    if (selectedYear === 'all') {
                        d3.selectAll(".year-path").attr("opacity", 0.1);
                        d3.select(this).attr("opacity", 1).attr("stroke-width", 3);
                    }
                })
                .on("mouseout", function () {
                    if (selectedYear === 'all') {
                        d3.selectAll(".year-path").attr("opacity", 0.6).attr("stroke-width", 0.8);
                    }
                })
                .append("title")
                .text(`${year} Thermal Cycle`);
        });

        // --- LEGEND (Years) ---
        if (!isMobile) {
            const legend = svg.append("g")
                .attr("transform", `translate(${chartWidth + 10}, ${margin})`);

            const startYear = years[0];
            const endYear = years[years.length - 1];
            const step = Math.ceil((endYear - startYear) / 5);
            const legendYears = d3.range(startYear, endYear + 1, step);
            const legendItemHeight = 25;

            legend.selectAll(".legend-item")
                .data(legendYears)
                .enter()
                .append("g")
                .attr("transform", (d, i) => `translate(0, ${i * legendItemHeight})`)
                .call(item => {
                    item.append("line")
                        .attr("x1", 0).attr("y1", 0)
                        .attr("x2", 20).attr("y2", 0)
                        .attr("stroke", d => colorScale(d))
                        .attr("stroke-width", 3);
                    item.append("text")
                        .attr("x", 30).attr("y", 4)
                        .style("fill", "var(--text-secondary)")
                        .style("font-size", "0.75rem")
                        .text(d => d);
                });
        }

    }, [data, selectedYear, years, yearGroups, width]);

    return (
        <div className="radial-container">
            <div className="radial-header">
                <div className="header-text">
                    <h3>Radial Climate Compass</h3>
                    <p>Seasonal migration over {data.length > 0 ? (data[data.length - 1].Year - data[0].Year) : '85'} years. Rings move from center (cooler) to outer (warmer).</p>
                </div>
                <div className="radial-controls">
                    <label>Focus View:</label>
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(e.target.value === 'all' ? 'all' : +e.target.value)}
                        className="glass-panel"
                    >
                        <option value="all">ALL YEARS (Full Fidelity)</option>
                        {years.slice().reverse().map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div className="radial-chart-box glass-panel">
                <svg ref={svgRef} style={{ width: '100%' }}></svg>
            </div>

            <style jsx>{`
        .radial-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 10px;
        }
        .radial-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 16px;
          flex-wrap: wrap;
          gap: 16px;
        }
        @media (max-width: 768px) {
          .radial-header {
            align-items: flex-start;
          }
          .radial-controls {
            align-items: flex-start;
            width: 100%;
          }
          select {
            width: 100%;
          }
          h3 {
            font-size: 1.1rem;
          }
          p {
            font-size: 0.75rem;
          }
        }
        h3 { 
          color: var(--accent-1); 
          margin-bottom: 4px; 
          font-weight: 800; 
          text-transform: uppercase; 
          letter-spacing: 1px;
        }
        p { 
          font-size: 0.85rem; 
          color: var(--text-secondary); 
          margin: 0;
        }
        .radial-controls {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-end;
        }
        label {
          font-size: 0.65rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          font-weight: 800;
        }
        select {
          background: var(--bg-component);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          padding: 10px 16px;
          border-radius: 6px;
          font-family: inherit;
          cursor: pointer;
          outline: none;
        }
        select option {
            background: #111; /* Explicit dark background for dropdown */
            color: #fff;
        }
        .radial-chart-box {
            padding: 20px;
            background: rgba(0,0,0,0.2);
        }
      `}</style>
        </div>
    );
}
