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
        const totalContentHeight = 1000;
        const verticalPadding = 60; // Space between subplots

        // Plot Heights (Approx 60%, 20%, 20%)
        const h1 = 500;
        const h2 = 180;
        const h3 = 180;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // --- SCALES ---
        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.Date) as [Date, Date])
            .range([0, width]);

        const y1 = d3.scaleLinear()
            .domain([
                d3.min(data, d => d['Min Temp (°F)'])! - 5,
                d3.max(data, d => d['Max Temp (°F)'])! + 5
            ])
            .range([h1, 0]);

        const y2 = d3.scaleLinear()
            .domain([
                d3.min(data, d => d.SMA7 || 0)! - 2,
                d3.max(data, d => d.SMA7 || 0)! + 2
            ])
            .range([h2, 0]);

        const y3 = d3.scaleLinear()
            .domain([
                d3.min(data, d => d.ROC1y || 0)! - 2,
                d3.max(data, d => d.ROC1y || 0)! + 2
            ])
            .range([h3, 0]);

        // --- SUBPLOTS ---
        const g1 = g.append("g").attr("class", "subplot-1");
        const g2 = g.append("g").attr("class", "subplot-2").attr("transform", `translate(0, ${h1 + verticalPadding})`);
        const g3 = g.append("g").attr("class", "subplot-3").attr("transform", `translate(0, ${h1 + h2 + verticalPadding * 2})`);

        // --- SUBPLOT 1: Thermal Distribution ---
        g1.append("text").attr("x", 0).attr("y", -10).text("Thermal Distribution Spectrum (Seasonal Normals)").style("fill", "var(--accent-1)").style("font-size", "0.9rem").style("font-weight", "bold");

        g1.append("g")
            .attr("transform", `translate(0,${h1})`)
            .call(d3.axisBottom(x).ticks(width / 100).tickFormat(() => "")) // No labels on top plot X axis
            .attr("color", "var(--border-subtle)");

        g1.append("g")
            .call(d3.axisLeft(y1))
            .attr("color", "var(--text-secondary)");

        // Seasonal Range (Area)
        const area = d3.area<WeatherRecord>()
            .x(d => x(d.Date))
            .y0(d => y1(d.MeanLow || 0))
            .y1(d => y1(d.MeanHigh || 0))
            .curve(d3.curveMonotoneX);

        g1.append("path")
            .datum(data)
            .attr("fill", "var(--text-primary)")
            .attr("opacity", 0.05)
            .attr("d", area);

        // Daily Mean Line
        const lineMean = d3.line<WeatherRecord>()
            .x(d => x(d.Date))
            .y(d => y1(d['Avg Temp (°F)']))
            .curve(d3.curveMonotoneX);

        g1.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "var(--text-secondary)")
            .attr("stroke-width", 1)
            .attr("opacity", 0.4)
            .attr("d", lineMean);

        // --- SUBPLOT 2: 7-Day Volatility Trend (SMA) ---
        g2.append("text").attr("x", 0).attr("y", -10).text("7-Day Volatility Trend").style("fill", "var(--trend-line)").style("font-size", "0.8rem").style("font-weight", "bold");

        g2.append("g")
            .attr("transform", `translate(0,${h2})`)
            .call(d3.axisBottom(x).ticks(width / 100).tickFormat(() => ""))
            .attr("color", "var(--border-subtle)");

        g2.append("g")
            .call(d3.axisLeft(y2).ticks(5))
            .attr("color", "var(--text-secondary)");

        const lineSMA = d3.line<WeatherRecord>()
            .x(d => x(d.Date))
            .y(d => y2(d.SMA7 || 0))
            .curve(d3.curveMonotoneX);

        g2.append("path")
            .datum(data.filter(d => d.SMA7 !== undefined))
            .attr("fill", "none")
            .attr("stroke", "var(--trend-line)")
            .attr("stroke-width", 2)
            .attr("d", lineSMA);

        // --- SUBPLOT 3: YoY Variance Delta (ROC) ---
        g3.append("text").attr("x", 0).attr("y", -10).text("Year-over-Year Variance Delta").style("fill", "var(--ro-line)").style("font-size", "0.8rem").style("font-weight", "bold");

        g3.append("g")
            .attr("transform", `translate(0,${h3})`)
            .call(d3.axisBottom(x).ticks(width / 100))
            .attr("color", "var(--text-secondary)");

        g3.append("g")
            .call(d3.axisLeft(y3).ticks(5))
            .attr("color", "var(--text-secondary)");

        const areaROC = d3.area<WeatherRecord>()
            .x(d => x(d.Date))
            .y0(y3(0))
            .y1(d => y3(d.ROC1y || 0))
            .curve(d3.curveMonotoneX);

        g3.append("path")
            .datum(data.filter(d => d.ROC1y !== undefined))
            .attr("fill", "var(--ro-line)")
            .attr("opacity", 0.1)
            .attr("d", areaROC);

        const lineROC = d3.line<WeatherRecord>()
            .x(d => x(d.Date))
            .y(d => y3(d.ROC1y || 0))
            .curve(d3.curveMonotoneX);

        g3.append("path")
            .datum(data.filter(d => d.ROC1y !== undefined))
            .attr("fill", "none")
            .attr("stroke", "var(--ro-line)")
            .attr("stroke-width", 1.5)
            .attr("d", lineROC);


        // --- TOOLTIP & INTERACTION ---
        const tooltip = d3.select("body").append("div")
            .attr("class", "chart-tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background", "var(--bg-page)")
            .style("border", "1px solid var(--accent-1)")
            .style("padding", "12px")
            .style("border-radius", "8px")
            .style("pointer-events", "none")
            .style("z-index", "100")
            .style("font-size", "0.85rem")
            .style("backdrop-filter", "blur(8px)")
            .style("box-shadow", "0 4px 12px rgba(0,0,0,0.5)");

        const hoverLine = g.append("line")
            .attr("y1", 0)
            .attr("y2", h1 + h2 + h3 + verticalPadding * 2)
            .attr("stroke", "var(--text-secondary)")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4,4")
            .style("opacity", 0);

        const bisect = d3.bisector<WeatherRecord, Date>(d => d.Date).left;

        g.append("rect")
            .attr("width", width)
            .attr("height", h1 + h2 + h3 + verticalPadding * 2)
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .on("mousemove", (event) => {
                const mouseX = d3.pointer(event)[0];
                const date = x.invert(mouseX);
                const i = bisect(data, date, 1);
                const d = data[i - 1];

                if (d) {
                    hoverLine
                        .attr("x1", x(d.Date))
                        .attr("x2", x(d.Date))
                        .style("opacity", 0.5);

                    tooltip
                        .style("opacity", 1)
                        .html(`
              <div style="color: var(--accent-1); font-weight: bold; margin-bottom: 6px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 4px;">
                ${d.Date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 2px;">
                <span>Avg Temp:</span> 
                <span style="font-weight: bold;">${d['Avg Temp (°F)'].toFixed(1)}°F</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 2px; color: var(--trend-line)">
                <span>7d SMA:</span> 
                <span style="font-weight: bold;">${d.SMA7?.toFixed(1) || 'N/A'}°F</span>
              </div>
               <div style="display: flex; justify-content: space-between; gap: 20px; color: var(--ro-line)">
                <span>YoY ROC:</span> 
                <span style="font-weight: bold;">${d.ROC1y ? (d.ROC1y > 0 ? '+' : '') + d.ROC1y.toFixed(1) : 'N/A'}°F</span>
              </div>
            `)
                        .style("left", (event.pageX + 20) + "px")
                        .style("top", (event.pageY - 20) + "px");
                }
            })
            .on("mouseout", () => {
                tooltip.style("opacity", 0);
                hoverLine.style("opacity", 0);
            });

        return () => {
            tooltip.remove();
        };
    }, [data]);

    return (
        <div className="chart-container" style={{ width: '100%', minHeight: '1000px' }}>
            <svg ref={svgRef} style={{ width: '100%', height: '1100px' }}></svg>
        </div>
    );
}
