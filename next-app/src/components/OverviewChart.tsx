"use client";

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { WeatherRecord } from '@/utils/weatherData';

interface Props {
    data: WeatherRecord[];
}

export function OverviewChart({ data }: Props) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!data.length || !svgRef.current) return;

        const margin = { top: 40, right: 80, bottom: 60, left: 60 };
        const width = svgRef.current.clientWidth - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.Date) as [Date, Date])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([
                d3.min(data, d => d['Min Temp (°F)'])! - 5,
                d3.max(data, d => d['Max Temp (°F)'])! + 5
            ])
            .range([height, 0]);

        // Axes
        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(width / 100))
            .attr("color", "var(--text-secondary)");

        g.append("g")
            .call(d3.axisLeft(y))
            .attr("color", "var(--text-secondary)");

        // Grid lines
        g.append("g")
            .attr("class", "grid")
            .attr("opacity", 0.1)
            .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ""));

        // Seasonal Range (Area)
        const area = d3.area<WeatherRecord>()
            .x(d => x(d.Date))
            .y0(d => y(d.MeanLow || 0))
            .y1(d => y(d.MeanHigh || 0))
            .curve(d3.curveMonotoneX);

        g.append("path")
            .datum(data)
            .attr("fill", "var(--text-primary)")
            .attr("opacity", 0.05)
            .attr("d", area);

        // Daily Mean Line
        const lineMean = d3.line<WeatherRecord>()
            .x(d => x(d.Date))
            .y(d => y(d['Avg Temp (°F)']))
            .curve(d3.curveMonotoneX);

        g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "var(--text-secondary)")
            .attr("stroke-width", 1)
            .attr("opacity", 0.4)
            .attr("d", lineMean);

        // SMA7 Line
        const lineSMA = d3.line<WeatherRecord>()
            .x(d => x(d.Date))
            .y(d => y(d.SMA7 || 0))
            .curve(d3.curveMonotoneX);

        g.append("path")
            .datum(data.filter(d => d.SMA7 !== undefined))
            .attr("fill", "none")
            .attr("stroke", "var(--trend-line)")
            .attr("stroke-width", 2)
            .attr("d", lineSMA);

        // Interactive Tooltip
        const tooltip = d3.select("body").append("div")
            .attr("class", "chart-tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background", "var(--bg-page)")
            .style("border", "1px solid var(--accent-1)")
            .style("padding", "10px")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .style("z-index", "100")
            .style("font-size", "0.8rem");

        const bisect = d3.bisector<WeatherRecord, Date>(d => d.Date).left;

        g.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .on("mousemove", (event) => {
                const mouseX = d3.pointer(event)[0];
                const date = x.invert(mouseX);
                const i = bisect(data, date, 1);
                const d = data[i - 1];

                if (d) {
                    tooltip
                        .style("opacity", 1)
                        .html(`
              <div style="color: var(--accent-1); font-weight: bold; margin-bottom: 4px;">
                ${d.Date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div>Avg: ${d['Avg Temp (°F)'].toFixed(1)}°F</div>
              <div style="color: var(--trend-line)">SMA7: ${d.SMA7?.toFixed(1) || 'N/A'}°F</div>
              <div style="color: var(--accent-2)">Max: ${d['Max Temp (°F)'].toFixed(1)}°F</div>
            `)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 15) + "px");
                }
            })
            .on("mouseout", () => {
                tooltip.style("opacity", 0);
            });

        return () => {
            tooltip.remove();
        };
    }, [data]);

    return (
        <div className="chart-container" style={{ width: '100%', height: '100%' }}>
            <svg ref={svgRef} style={{ width: '100%', height: '600px' }}></svg>
        </div>
    );
}
