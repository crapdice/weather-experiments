"use client";

import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { WeatherRecord } from '@/utils/weatherData';

interface Props {
    data: WeatherRecord[];
}

export function ClimateStripes({ data }: Props) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [range, setRange] = useState<[Date, Date] | null>(null);

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
        if (monthlyData.length && !range) {
            setRange([monthlyData[0].date, monthlyData[monthlyData.length - 1].date]);
        }
    }, [monthlyData, range]);

    const filteredStripes = useMemo(() => {
        if (!range) return monthlyData;
        return monthlyData.filter(d => d.date >= range[0] && d.date <= range[1]);
    }, [monthlyData, range]);

    useEffect(() => {
        if (!monthlyData.length || !svgRef.current || !range) return;

        const margin = { top: 40, right: 20, bottom: 80, left: 20 };
        const width = svgRef.current.clientWidth - margin.left - margin.right;
        const mainHeight = 350;
        const sliderHeight = 30;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // --- SCALES ---
        const xFull = d3.scaleTime()
            .domain([monthlyData[0].date, monthlyData[monthlyData.length - 1].date])
            .range([0, width]);

        const x = d3.scaleBand()
            .domain(filteredStripes.map(d => d.date.getTime().toString()))
            .range([0, width])
            .padding(0);

        const color = d3.scaleSequential(d3.interpolateRdBu)
            .domain([4, -4]); // Anomaly range

        // --- MAIN STRIPES ---
        g.selectAll(".stripe")
            .data(filteredStripes)
            .enter()
            .append("rect")
            .attr("class", "stripe")
            .attr("x", d => x(d.date.getTime().toString())!)
            .attr("y", 0)
            .attr("width", x.bandwidth() + 1)
            .attr("height", mainHeight)
            .attr("fill", d => color(d.anomaly))
            .append("title")
            .text(d => `${d.date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}: ${d.anomaly > 0 ? '+' : ''}${d.anomaly.toFixed(2)}°F anomaly`);

        // --- RANGE SLIDER (BRUSH) ---
        const gSlider = g.append("g")
            .attr("transform", `translate(0, ${mainHeight + 40})`);

        // Mini preview in slider
        gSlider.selectAll(".mini-stripe")
            .data(monthlyData)
            .enter()
            .append("rect")
            .attr("x", d => xFull(d.date))
            .attr("y", 0)
            .attr("width", width / monthlyData.length + 1)
            .attr("height", sliderHeight)
            .attr("fill", d => color(d.anomaly))
            .attr("opacity", 0.5);

        const brush = d3.brushX()
            .extent([[0, 0], [width, sliderHeight]])
            .on("end", (event) => {
                if (!event.sourceEvent) return;
                if (!event.selection) return;
                const [x0, x1] = event.selection;
                setRange([xFull.invert(x0), xFull.invert(x1)]);
            });

        const gBrush = gSlider.append("g")
            .attr("class", "brush")
            .call(brush);

        gBrush.call(brush.move, [xFull(range[0]), xFull(range[1])]);

        // Static label for slider
        gSlider.append("text")
            .attr("y", -5)
            .text("Navigation Range Selector")
            .style("font-size", "0.6rem")
            .style("fill", "var(--text-secondary)")
            .style("text-transform", "uppercase");

    }, [filteredStripes, range]);

    return (
        <div className="stripes-container">
            <div className="chart-header">
                <h3>High-Density Climate Stripes</h3>
                <p>Monthly temperature anomalies relative to 50-year seasonal baselines. Red: Warmer | Blue: Cooler.</p>
            </div>
            <svg ref={svgRef} style={{ width: '100%', height: '520px' }}></svg>
            <style jsx>{`
                .stripes-container {
                  padding: 10px;
                }
                .chart-header { margin-bottom: 20px; }
                h3 { color: var(--accent-1); margin-bottom: 4px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
                p { font-size: 0.85rem; color: var(--text-secondary); }
                :global(.brush .selection) {
                    fill: var(--accent-1);
                    fill-opacity: 0.1;
                    stroke: var(--accent-1);
                }
            `}</style>
        </div>
    );
}
