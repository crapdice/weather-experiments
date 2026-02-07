"use client";

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { WeatherRecord } from '@/types/weather';
import { TrendLine } from './types';
import { getAvgTemp, getMaxTemp, getMinTemp, getPrecipitation, getSnowfall } from '@/utils/weatherAccessors';

interface D3ChartProps {
    data: WeatherRecord[];
    dateRange: [Date, Date];
    dimensions: { width: number, height: number };
    isDrawMode: boolean;
    trendLine: TrendLine | null;
    showRain: boolean;
    showSnow: boolean;
    smaWindow: number;
    setDateRange: (range: [Date, Date]) => void;
    setTrendLine: (line: TrendLine | null) => void;
}

export function D3Chart({
    data,
    dateRange,
    dimensions,
    isDrawMode,
    trendLine,
    showRain,
    showSnow,
    smaWindow,
    setDateRange,
    setTrendLine
}: D3ChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!data.length || !svgRef.current || !dateRange || dimensions.width === 0) return;

        const isMobile = window.innerWidth <= 768;
        const margin = {
            top: 40,
            right: isMobile ? 20 : 100,
            bottom: 60,
            left: isMobile ? 40 : 60
        };
        const width = dimensions.width - margin.left - margin.right;
        if (width <= 0) return;

        const verticalPadding = isMobile ? 40 : 80;
        const sliderHeight = 30;

        const h1 = isMobile ? 300 : 450;
        const h2 = isMobile ? 120 : 180;
        const h3 = isMobile ? 120 : 180;
        const totalHeight = h1 + h2 + h3 + verticalPadding * 2 + sliderHeight + 20;

        svgRef.current.style.height = `${totalHeight + margin.top + margin.bottom}px`;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // --- SCALES ---
        const lastDataDate = data[data.length - 1].Date;
        const bufferedMaxDate = new Date(lastDataDate);
        bufferedMaxDate.setDate(bufferedMaxDate.getDate() + 1);

        const xFull = d3.scaleTime()
            .domain([data[0].Date, bufferedMaxDate])
            .range([0, width]);

        const x = d3.scaleTime()
            .domain(dateRange)
            .range([0, width]);

        // --- High-Precision Prefix Sum SMA Calculation ---
        // 1. Calculate cumulative sum of valid temperatures for O(1) interval averages
        // We use a separate array to avoid mutating the original data prop
        const cumulativeSum = new Float64Array(data.length + 1);
        cumulativeSum[0] = 0;

        for (let i = 0; i < data.length; i++) {
            const val = getAvgTemp(data[i]);
            // Sanity check: ensure we use 0 for NaN/Invalid but don't poison the sum
            const safeVal = (isNaN(val) || val === null) ? 0 : val;
            cumulativeSum[i + 1] = cumulativeSum[i] + safeVal;
        }

        // 2. Map SMA values to a local rendering dataset to avoid mutating props
        const plotData = data.map((d, i) => {
            let smaValue: number | undefined = undefined;
            if (i >= smaWindow - 1) {
                // Arithmetic Mean: (Sum of window) / Count
                const windowSum = cumulativeSum[i + 1] - cumulativeSum[i + 1 - smaWindow];
                smaValue = windowSum / smaWindow;
            }
            return {
                ...d,
                dynamicSma: smaValue
            };
        });

        const filteredData = plotData.filter(d => d.Date >= dateRange[0] && d.Date <= dateRange[1]);

        const y1 = d3.scaleLinear()
            .domain([
                d3.min(filteredData, getMinTemp)! - 5,
                d3.max(filteredData, getMaxTemp)! + 5
            ])
            .range([h1, 0]);

        const y2 = d3.scaleLinear()
            .domain([
                d3.min(filteredData, d => d.dynamicSma ?? Infinity)! - 2,
                d3.max(filteredData, d => d.dynamicSma ?? -Infinity)! + 2
            ])
            .range([h2, 0]);

        const y3 = d3.scaleLinear()
            .domain([
                d3.min(filteredData, d => d.ROC1y || 0)! - 2,
                d3.max(filteredData, d => d.ROC1y || 0)! + 2
            ])
            .range([h3, 0]);

        const yRain = d3.scaleLinear()
            .domain([0, d3.max(filteredData, getPrecipitation)! || 1])
            .range([h1, 0]);

        const ySnow = d3.scaleLinear()
            .domain([0, d3.max(filteredData, getSnowfall)! || 1])
            .range([h1, 0]);

        // --- SUBPLOTS ---
        const g1 = g.append("g").attr("class", "subplot-1");
        const hoverOverlay = g.append("rect")
            .attr("width", width)
            .attr("height", totalHeight - margin.top - margin.bottom)
            .attr("fill", "transparent")
            .attr("pointer-events", "all");

        const gBrushArea = g.append("g").attr("class", "brush-area").attr("transform", `translate(0, ${h1 + 40})`);

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
                const newStart = xFull.invert(x0);
                const newEnd = xFull.invert(x1);
                if (Math.abs(newStart.getTime() - dateRange[0].getTime()) > 1000 * 60 * 60 * 24 ||
                    Math.abs(newEnd.getTime() - dateRange[1].getTime()) > 1000 * 60 * 60 * 24) {
                    setDateRange([newStart, newEnd]);
                }
            });

        const gBrush = gBrushArea.call(brush);

        const handlePath = () => {
            const h = sliderHeight;
            const w = 6;
            const x = 0;
            return `M ${x - w / 2}, 0 L ${x + w / 2}, 0 L ${x + w / 2}, ${h} L ${x - w / 2}, ${h} Z`;
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

        gBrush.call(brush.move, [xFull(dateRange[0]), xFull(dateRange[1])]);
        updateHandles([xFull(dateRange[0]), xFull(dateRange[1])]);

        gBrushArea.append("text").attr("x", 0).attr("y", -5).text("Range Selector").style("fill", "var(--text-secondary)").style("font-size", "0.7rem").style("text-transform", "uppercase");

        const g2 = g.append("g").attr("class", "subplot-2").attr("transform", `translate(0, ${h1 + sliderHeight + verticalPadding + 10})`);
        const g3 = g.append("g").attr("class", "subplot-3").attr("transform", `translate(0, ${h1 + sliderHeight + h2 + verticalPadding * 2 + 10})`);

        // --- PLOT 1 ---
        g1.append("text").attr("x", 0).attr("y", -10).text("Typical Seasonal Temperatures").style("fill", "var(--accent-1)").style("font-size", "0.9rem").style("font-weight", "bold");
        g1.append("g").attr("transform", `translate(0,${h1})`).call(d3.axisBottom(x).ticks(width / 100)).attr("color", "var(--text-secondary)");
        g1.append("g").call(d3.axisLeft(y1)).attr("color", "var(--text-secondary)");

        if (showRain) {
            const barWidth = Math.max(2, width / filteredData.length);
            g1.selectAll(".rain-bar").data(filteredData.filter(d => getPrecipitation(d) > 0)).enter().append("rect").attr("class", "rain-bar").attr("x", d => x(d.Date) - barWidth / 2).attr("y", d => yRain(getPrecipitation(d))).attr("width", barWidth).attr("height", d => h1 - yRain(getPrecipitation(d))).attr("fill", "#00d2ff").attr("opacity", 0.15).attr("pointer-events", "none");
        }
        if (showSnow) {
            const barWidth = Math.max(2, width / filteredData.length);
            g1.selectAll(".snow-bar").data(filteredData.filter(d => getSnowfall(d) > 0)).enter().append("rect").attr("class", "snow-bar").attr("x", d => x(d.Date) - barWidth / 2).attr("y", d => ySnow(getSnowfall(d))).attr("width", barWidth).attr("height", d => h1 - ySnow(getSnowfall(d))).attr("fill", "#ffffff").attr("opacity", 0.2).attr("pointer-events", "none");
        }

        const area = d3.area<any>().x(d => x(d.Date)).y0(d => y1(d.MeanLow || 0)).y1(d => y1(d.MeanHigh || 0)).curve(d3.curveMonotoneX);
        g1.append("path").datum(plotData).attr("fill", "var(--text-primary)").attr("opacity", 0.05).attr("d", area).attr("clip-path", "url(#clip-main)");

        const lineHigh = d3.line<any>().x(d => x(d.Date)).y(d => y1(d.MeanHigh || 0)).curve(d3.curveMonotoneX);
        const lineLow = d3.line<any>().x(d => x(d.Date)).y(d => y1(d.MeanLow || 0)).curve(d3.curveMonotoneX);
        g1.append("path").datum(plotData).attr("fill", "none").attr("stroke", "#800000").attr("stroke-width", 1).attr("opacity", 0.3).attr("d", lineHigh).attr("clip-path", "url(#clip-main)");
        g1.append("path").datum(plotData).attr("fill", "none").attr("stroke", "#000080").attr("stroke-width", 1).attr("opacity", 0.3).attr("d", lineLow).attr("clip-path", "url(#clip-main)");

        const lineMean = d3.line<any>().x(d => x(d.Date)).y(d => y1(getAvgTemp(d))).curve(d3.curveMonotoneX);
        g1.append("path").datum(filteredData).attr("fill", "none").attr("stroke", "var(--text-secondary)").attr("stroke-width", 1).attr("opacity", 0.4).attr("d", lineMean);

        // --- PLOT 2 ---
        g2.append("text").attr("x", 0).attr("y", -10).text("Compared To Last Year").style("fill", "var(--ro-line)").style("font-size", "0.8rem").style("font-weight", "bold");

        // Calculate Streak for the latest data point
        let streakCount = 0;
        let streakType: 'above' | 'below' | null = null;
        for (let i = data.length - 1; i >= 0; i--) {
            if (data[i].ROC1y === undefined) continue;
            const currentType = data[i].ROC1y! >= 0 ? 'above' : 'below';
            if (streakType === null) {
                streakType = currentType;
                streakCount = 1;
            } else if (streakType === currentType) {
                streakCount++;
            } else {
                break;
            }
        }

        if (streakCount >= 3) {
            g2.append("text")
                .attr("x", width)
                .attr("y", -10)
                .attr("text-anchor", "end")
                .text(`${streakCount} DAY STREAK ${streakType?.toUpperCase()}`)
                .style("fill", streakType === 'above' ? "#ff4b2b" : "#00d2ff")
                .style("font-size", "0.7rem")
                .style("font-weight", "800")
                .style("letter-spacing", "0.05em");
        }

        g2.append("g").attr("transform", `translate(0,${h2})`).call(d3.axisBottom(x).ticks(width / 100).tickFormat(() => "")).attr("color", "var(--border-subtle)");

        g2.append("g").call(d3.axisLeft(y3).ticks(5)).attr("color", "var(--text-secondary)");
        const areaROC = d3.area<WeatherRecord>().x(d => x(d.Date)).y0(y3(0)).y1(d => y3(d.ROC1y || 0)).curve(d3.curveMonotoneX);
        g2.append("path").datum(filteredData.filter(d => d.ROC1y !== undefined)).attr("fill", "var(--ro-line)").attr("opacity", 0.1).attr("d", areaROC);
        const lineROC = d3.line<WeatherRecord>().x(d => x(d.Date)).y(d => y3(d.ROC1y || 0)).curve(d3.curveMonotoneX);
        g2.append("path").datum(filteredData.filter(d => d.ROC1y !== undefined)).attr("fill", "none").attr("stroke", "var(--ro-line)").attr("stroke-width", 1.5).attr("d", lineROC);

        // --- PLOT 3 ---
        g3.append("text").attr("x", 0).attr("y", -10).text(`${smaWindow} Day Average Temperature`).style("fill", "var(--trend-line)").style("font-size", "0.8rem").style("font-weight", "bold");
        g3.append("g").attr("transform", `translate(0,${h3})`).call(d3.axisBottom(x).ticks(width / 100)).attr("color", "var(--text-secondary)");
        g3.append("g").call(d3.axisLeft(y2).ticks(5)).attr("color", "var(--text-secondary)");
        const lineSMA = d3.line<any>().x(d => x(d.Date)).y(d => y2(d.dynamicSma || 0)).curve(d3.curveMonotoneX);
        g3.append("path").datum(filteredData.filter(d => d.dynamicSma !== undefined)).attr("fill", "none").attr("stroke", "var(--trend-line)").attr("stroke-width", 2).attr("d", lineSMA);

        // Tooltips & Interactivity
        const tooltip = d3.select("body").append("div").attr("class", "chart-tooltip").style("opacity", 0);
        const hoverLine = g.append("line").attr("y1", 0).attr("y2", totalHeight - 60).attr("stroke", "var(--text-secondary)").attr("stroke-width", 1).attr("stroke-dasharray", "4,4").style("opacity", 0).style("pointer-events", "none");
        const bisect = d3.bisector<WeatherRecord, Date>(d => d.Date).left;

        hoverOverlay.on("mousemove", (event) => {
            if (isDrawMode) { tooltip.style("opacity", 0); hoverLine.style("opacity", 0); return; }
            const mouseX = d3.pointer(event)[0];
            const date = x.invert(mouseX);
            const i = bisect(filteredData, date, 1);
            const d = filteredData[i - 1];
            if (d) {
                hoverLine.attr("x1", x(d.Date)).attr("x2", x(d.Date)).style("opacity", 0.5);
                tooltip.style("opacity", 1).html(`
                    <div style="color: var(--accent-1); font-weight: bold; margin-bottom: 6px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 4px;">
                        ${d.Date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 2px;">
                        <span>Avg Temp:</span> 
                        <span style="font-weight: bold;">${getAvgTemp(d).toFixed(1)}°F</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 2px; color: var(--trend-line)">
                        <span>${smaWindow}d SMA:</span> 
                        <span style="font-weight: bold;">${(d as any).dynamicSma?.toFixed(2) || 'N/A'}°F</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; gap: 20px; color: var(--ro-line)">
                        <span>YoY ROC:</span> 
                        <span style="font-weight: bold;">${d.ROC1y ? (d.ROC1y > 0 ? '+' : '') + d.ROC1y.toFixed(1) : 'N/A'}°F</span>
                    </div>
                `).style("left", (event.pageX + 20) + "px").style("top", (event.pageY - 20) + "px");
            }
        }).on("mouseout", () => { tooltip.style("opacity", 0); hoverLine.style("opacity", 0); });

        // Clip Path
        svg.append("defs").append("clipPath").attr("id", "clip-main").append("rect").attr("width", width).attr("height", h1);

        // Trend Line Logic
        if (isDrawMode) {
            hoverOverlay.on("click", (event) => {
                const [mx, my] = d3.pointer(event);
                if (my > h1) return;
                const date = x.invert(mx);
                const val = y1.invert(my);
                if (!trendLine) {
                    const endDate = new Date(date);
                    endDate.setMonth(endDate.getMonth() + 1);
                    setTrendLine({ p1: { date, val }, p2: { date: endDate, val: val - 5 } });
                }
            });
        }

        const gTrend = g.append("g").attr("class", "trend-line-layer").attr("clip-path", "url(#clip-main)");
        if (trendLine) {
            const { p1, p2 } = trendLine;
            gTrend.append("line").attr("x1", x(p1.date)).attr("y1", y1(p1.val)).attr("x2", x(p2.date)).attr("y2", y1(p2.val)).attr("stroke", "white").attr("stroke-width", 2).attr("stroke-dasharray", "5,5");

            const dragP1 = d3.drag<SVGCircleElement, unknown>().on("drag", (event) => {
                const date = x.invert(event.x);
                const val = y1.invert(event.y);
                setTrendLine({ ...trendLine, p1: { date, val } });
            });
            const dragP2 = d3.drag<SVGCircleElement, unknown>().on("drag", (event) => {
                const date = x.invert(event.x);
                const val = y1.invert(event.y);
                setTrendLine({ ...trendLine, p2: { date, val } });
            });

            gTrend.append("circle").attr("id", "p1").attr("cx", x(p1.date)).attr("cy", y1(p1.val)).attr("r", 8).attr("fill", "#00d2ff").attr("stroke", "white").attr("stroke-width", 2).attr("cursor", "move").call(dragP1 as unknown as (selection: d3.Selection<SVGCircleElement, unknown, null, undefined>) => void);
            gTrend.append("circle").attr("id", "p2").attr("cx", x(p2.date)).attr("cy", y1(p2.val)).attr("r", 8).attr("fill", "#00d2ff").attr("stroke", "white").attr("stroke-width", 2).attr("cursor", "move").call(dragP2 as unknown as (selection: d3.Selection<SVGCircleElement, unknown, null, undefined>) => void);
        }

        return () => { tooltip.remove(); };
    }, [data, dateRange, dimensions.width, isDrawMode, trendLine, showRain, showSnow, smaWindow, setDateRange, setTrendLine]);

    return (
        <div className="chart-container" style={{ width: '100%' }}>
            <svg ref={svgRef} style={{ width: '100%' }}></svg>
            <style jsx global>{`
                .chart-tooltip {
                    position: absolute;
                    background: var(--bg-page);
                    border: 1px solid var(--accent-1);
                    padding: 12px;
                    border-radius: 8px;
                    pointer-events: none;
                    z-index: 1000;
                    font-size: 0.85rem;
                    backdrop-filter: blur(8px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    color: var(--text-primary);
                    font-family: sans-serif;
                }
                .handle--custom {
                    pointer-events: all;
                }
            `}</style>
        </div>
    );
}
