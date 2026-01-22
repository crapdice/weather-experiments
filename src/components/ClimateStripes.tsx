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
    const [widthState, setWidthState] = useState(0);

    useEffect(() => {
        const handleResize = () => {
            if (svgRef.current) setWidthState(svgRef.current.clientWidth);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

        const isMobile = window.innerWidth <= 768;
        const margin = {
            top: 60,
            right: isMobile ? 10 : 20,
            bottom: 80,
            left: isMobile ? 10 : 20
        };
        const width = svgRef.current.clientWidth - margin.left - margin.right;
        const mainHeight = isMobile ? 200 : 350;
        const sliderHeight = 30;

        svgRef.current.style.height = `${mainHeight + sliderHeight + margin.top + margin.bottom + 40}px`;

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
        const stripeLayer = g.append("g").attr("class", "stripes-layer");

        stripeLayer.selectAll(".stripe")
            .data(filteredStripes)
            .enter()
            .append("rect")
            .attr("class", "stripe")
            .attr("x", d => x(d.date.getTime().toString())!)
            .attr("y", 0)
            .attr("width", x.bandwidth() + 1)
            .attr("height", mainHeight)
            .attr("fill", d => color(d.anomaly));

        // --- LEGEND ---
        const legendWidth = isMobile ? 120 : 200;
        const legendHeight = 10;
        const gLegend = g.append("g")
            .attr("transform", `translate(${width - legendWidth}, -35)`);

        const legendScale = d3.scaleLinear().domain([-4, 4]).range([0, legendWidth]);

        const defs = svg.append("defs");
        const gradient = defs.append("linearGradient")
            .attr("id", "stripe-gradient")
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "100%").attr("y2", "0%");

        const stops = d3.range(-4, 4.1, 0.5);
        stops.forEach(s => {
            gradient.append("stop")
                .attr("offset", `${((s + 4) / 8) * 100}%`)
                .attr("stop-color", color(s));
        });

        gLegend.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .attr("fill", "url(#stripe-gradient)")
            .attr("rx", 2);

        gLegend.append("text")
            .attr("x", 0).attr("y", legendHeight + 12)
            .text("-4°F")
            .style("font-size", "0.6rem").style("fill", "var(--text-secondary)");

        gLegend.append("text")
            .attr("x", legendWidth).attr("y", legendHeight + 12)
            .attr("text-anchor", "end")
            .text("+4°F")
            .style("font-size", "0.6rem").style("fill", "var(--text-secondary)");

        gLegend.append("text")
            .attr("x", legendWidth / 2).attr("y", legendHeight + 12)
            .attr("text-anchor", "middle")
            .text("ANOMALY DELTA")
            .style("font-size", "0.5rem").style("fill", "var(--text-secondary)").style("letter-spacing", "1px");

        // --- TOOLTIP ---
        const tooltip = d3.select("body").append("div")
            .attr("class", "stripe-tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background", "var(--bg-page)")
            .style("border", "1px solid var(--accent-1)")
            .style("padding", "8px 12px")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .style("z-index", "100")
            .style("font-size", "0.75rem")
            .style("backdrop-filter", "blur(8px)")
            .style("box-shadow", "0 4px 12px rgba(0,0,0,0.5)");

        const hoverOverlay = g.append("rect")
            .attr("width", width)
            .attr("height", mainHeight)
            .attr("fill", "transparent")
            .attr("pointer-events", "all");

        hoverOverlay.on("mousemove", (event) => {
            const [mx] = d3.pointer(event);
            const eachBand = x.step();
            const index = Math.floor(mx / eachBand);
            const d = filteredStripes[index];

            if (d) {
                tooltip
                    .style("opacity", 1)
                    .html(`
                        <div style="font-weight: 800; color: var(--accent-1); border-bottom: 1px solid var(--border-subtle); margin-bottom: 4px; padding-bottom: 2px;">
                            ${d.date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        </div>
                        <div style="display: flex; justify-content: space-between; gap: 15px;">
                            <span>Avg Temp:</span>
                            <span style="font-weight: bold;">${d.avg.toFixed(1)}°F</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; gap: 15px; color: ${d.anomaly > 0 ? '#ff4d4d' : '#4d94ff'}">
                            <span>Anomaly:</span>
                            <span style="font-weight: bold;">${d.anomaly > 0 ? '+' : ''}${d.anomaly.toFixed(2)}°F</span>
                        </div>
                    `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 15) + "px");
            }
        }).on("mouseout", () => {
            tooltip.style("opacity", 0);
        });

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
            .attr("width", (width / monthlyData.length) + 0.5)
            .attr("height", sliderHeight)
            .attr("fill", d => color(d.anomaly))
            .attr("opacity", 0.5);

        const brush = d3.brushX()
            .extent([[0, 0], [width, sliderHeight]])
            .on("brush", (event) => {
                if (event.selection) {
                    updateHandles(event.selection);
                }
            })
            .on("end", (event) => {
                if (!event.sourceEvent) return;
                if (!event.selection) return;
                const [x0, x1] = event.selection;
                setRange([xFull.invert(x0), xFull.invert(x1)]);
            });

        const gBrush = gSlider.append("g")
            .attr("class", "brush")
            .call(brush);

        // Custom handles
        const handlePath = (d: any) => {
            const h = sliderHeight;
            const w = 6;
            const x = 0;
            return `M ${x - w / 2}, 0 L ${x + w / 2}, 0 L ${x + w / 2}, ${h} L ${x - w / 2}, ${h} Z 
                    M ${x - 1}, ${h / 4} L ${x - 1}, ${3 * h / 4} M ${x + 1}, ${h / 4} L ${x + 1}, ${3 * h / 4}`;
        };

        const handle = gBrush.selectAll(".handle--custom")
            .data([{ type: "w" }, { type: "e" }])
            .enter().append("path")
            .attr("class", "handle--custom")
            .attr("fill", "var(--accent-1)")
            .attr("stroke", "var(--bg-page)")
            .attr("stroke-width", 0.5)
            .attr("cursor", "ew-resize")
            .attr("d", handlePath);

        function updateHandles(selection: [number, number]) {
            handle.attr("display", null).attr("transform", (d, i) => `translate(${selection[i]}, 0)`);
        }

        gBrush.call(brush.move, [xFull(range[0]), xFull(range[1])]);
        updateHandles([xFull(range[0]), xFull(range[1])]);

        // Static label for slider
        gSlider.append("text")
            .attr("y", -5)
            .text("Navigation Range Selector")
            .style("font-size", "0.6rem")
            .style("fill", "var(--text-secondary)")
            .style("text-transform", "uppercase");

        return () => {
            tooltip.remove();
        };
    }, [filteredStripes, range, widthState]);

    return (
        <div className="stripes-container">
            <div className="chart-header">
                <h3>High-Density Climate Stripes</h3>
                <p>Monthly temperature anomalies relative to 50-year seasonal baselines. Red: Warmer | Blue: Cooler.</p>
            </div>
            <svg ref={svgRef} style={{ width: '100%' }}></svg>
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

                @media (max-width: 768px) {
                  .stripes-container {
                    padding: 4px;
                  }
                  h3 {
                    font-size: 1rem;
                  }
                  p {
                    font-size: 0.7rem;
                  }
                }
            `}</style>
        </div>
    );
}
