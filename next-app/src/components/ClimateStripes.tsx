"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { WeatherRecord } from '@/utils/weatherData';

interface Props {
    data: WeatherRecord[];
}

export function ClimateStripes({ data }: Props) {
    const svgRef = useRef<SVGSVGElement>(null);

    const monthlyData = useMemo(() => {
        const grouped = d3.group(data, d => `${d.Year}-${d.Date.getMonth() + 1}`);
        const averages = Array.from(grouped).map(([key, records]) => {
            const [year, month] = key.split('-').map(Number);
            return {
                year,
                month,
                avg: d3.mean(records, r => r['Avg Temp (°F)']) || 0,
                date: new Date(year, month - 1, 1)
            };
        });

        const monthBaselines = d3.rollup(averages, v => d3.mean(v, d => d.avg), d => d.month);

        return averages.map(d => ({
            ...d,
            anomaly: d.avg - (monthBaselines.get(d.month) || 0)
        })).sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [data]);

    useEffect(() => {
        if (!monthlyData.length || !svgRef.current) return;

        const margin = { top: 40, right: 60, bottom: 40, left: 20 };
        const width = svgRef.current.clientWidth - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(monthlyData.map(d => d.date.getTime().toString()))
            .range([0, width])
            .padding(0);

        const color = d3.scaleSequential(d3.interpolateRdBu)
            .domain([3, -3]); // Anomaly range

        g.selectAll("rect")
            .data(monthlyData)
            .enter()
            .append("rect")
            .attr("x", d => x(d.date.getTime().toString())!)
            .attr("y", 0)
            .attr("width", x.bandwidth() + 1)
            .attr("height", height)
            .attr("fill", d => color(d.anomaly))
            .append("title")
            .text(d => `${d.date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}: ${d.anomaly > 0 ? '+' : ''}${d.anomaly.toFixed(2)}°F anomaly`);

        // Legend
        const legendWidth = 200;
        const legendHeight = 20;
        const legend = svg.append("g")
            .attr("transform", `translate(${width - legendWidth + margin.left}, ${height + margin.top + 20})`);

        const thresholds = d3.range(-3, 3.1, 0.5);
        const legendScale = d3.scaleLinear().domain([-3, 3]).range([0, legendWidth]);

        legend.selectAll("rect")
            .data(d3.range(-3, 3, 0.1))
            .enter()
            .append("rect")
            .attr("x", d => legendScale(d))
            .attr("y", 0)
            .attr("width", legendWidth / 60)
            .attr("height", legendHeight)
            .attr("fill", d => color(d));

        legend.append("g")
            .attr("transform", `translate(0, ${legendHeight})`)
            .call(d3.axisBottom(legendScale).ticks(5).tickFormat(d => `${(d as number) > 0 ? '+' : ''}${d}°F`))
            .attr("color", "var(--text-secondary)");

    }, [monthlyData]);

    return (
        <div className="stripes-container">
            <div className="chart-header">
                <h3>Interactive Climate Stripes</h3>
                <p>Each stripe is one month. Relative to 50-year monthly averages.</p>
            </div>
            <svg ref={svgRef} style={{ width: '100%', height: '400px' }}></svg>
            <style jsx>{`
        .chart-header { margin-bottom: 20px; }
        h3 { color: var(--accent-1); margin-bottom: 4px; }
        p { font-size: 0.85rem; color: var(--text-secondary); }
      `}</style>
        </div>
    );
}
