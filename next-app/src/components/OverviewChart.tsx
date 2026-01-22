"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { WeatherRecord } from '@/utils/weatherData';

interface Props {
    data: WeatherRecord[];
}

const TIMEFRAMES = [
    { label: '1M', value: 1, unit: 'month' },
    { label: '3M', value: 3, unit: 'month' },
    { label: '6M', value: 6, unit: 'month' },
    { label: '1Y', value: 1, unit: 'year' },
    { label: '3Y', value: 3, unit: 'year' },
    { label: '5Y', value: 5, unit: 'year' },
    { label: '10Y', value: 10, unit: 'year' },
    { label: '20Y', value: 20, unit: 'year' },
    { label: 'ALL', value: 0, unit: 'all' },
];

export function OverviewChart({ data }: Props) {
    const svgRef = useRef<SVGSVGElement>(null);
    const brushRef = useRef<SVGGElement>(null);
    const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);

    // Initialize date range to "ALL" or a reasonable default
    useEffect(() => {
        if (data.length && !dateRange) {
            const extent = d3.extent(data, d => d.Date) as [Date, Date];
            setDateRange(extent);
        }
    }, [data]);

    const handleTimeframeClick = (tf: typeof TIMEFRAMES[0]) => {
        if (!data.length) return;
        const end = data[data.length - 1].Date;
        let start: Date;

        if (tf.unit === 'all') {
            start = data[0].Date;
        } else {
            start = new Date(end);
            if (tf.unit === 'month') {
                start.setMonth(start.getMonth() - tf.value);
            } else {
                start.setFullYear(start.getFullYear() - tf.value);
            }
            if (start < data[0].Date) start = data[0].Date;
        }
        setDateRange([start, end]);
    };

    useEffect(() => {
        if (!data.length || !svgRef.current || !dateRange) return;

        const margin = { top: 40, right: 80, bottom: 60, left: 60 };
        const width = svgRef.current.clientWidth - margin.left - margin.right;
        const verticalPadding = 80; // Space between subplots
        const sliderHeight = 40;

        // Subplot heights
        const h1 = 450;
        const h2 = 180;
        const h3 = 180;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // --- FULL SCALE (for Brush) ---
        const xFull = d3.scaleTime()
            .domain(d3.extent(data, d => d.Date) as [Date, Date])
            .range([0, width]);

        // --- ZOOMED SCALE ---
        const x = d3.scaleTime()
            .domain(dateRange)
            .range([0, width]);

        // Filter data for the current range to optimize line drawing and avoid overflows
        const filteredData = data.filter(d => d.Date >= dateRange[0] && d.Date <= dateRange[1]);

        const y1 = d3.scaleLinear()
            .domain([
                d3.min(filteredData, d => d['Min Temp (°F)'])! - 5,
                d3.max(filteredData, d => d['Max Temp (°F)'])! + 5
            ])
            .range([h1, 0]);

        const y2 = d3.scaleLinear()
            .domain([
                d3.min(filteredData, d => d.SMA7 || 0)! - 2,
                d3.max(filteredData, d => d.SMA7 || 0)! + 2
            ])
            .range([h2, 0]);

        const y3 = d3.scaleLinear()
            .domain([
                d3.min(filteredData, d => d.ROC1y || 0)! - 2,
                d3.max(filteredData, d => d.ROC1y || 0)! + 2
            ])
            .range([h3, 0]);

        // --- SUBPLOTS ---
        const g1 = g.append("g").attr("class", "subplot-1");
        const gSlider = g.append("g").attr("class", "brush-area").attr("transform", `translate(0, ${h1 + 40})`);
        const g2 = g.append("g").attr("class", "subplot-2").attr("transform", `translate(0, ${h1 + sliderHeight + verticalPadding + 10})`);
        const g3 = g.append("g").attr("class", "subplot-3").attr("transform", `translate(0, ${h1 + sliderHeight + h2 + verticalPadding * 2 + 10})`);

        // --- PLOT 1: Thermal Distribution ---
        g1.append("text").attr("x", 0).attr("y", -10).text("Thermal Distribution Spectrum (Seasonal Normals)").style("fill", "var(--accent-1)").style("font-size", "0.9rem").style("font-weight", "bold");

        g1.append("g")
            .attr("transform", `translate(0,${h1})`)
            .call(d3.axisBottom(x).ticks(width / 100))
            .attr("color", "var(--text-secondary)");

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
            .datum(data) // Use full data for smooth background
            .attr("fill", "var(--text-primary)")
            .attr("opacity", 0.05)
            .attr("d", area)
            .attr("clip-path", "url(#clip)");

        // Daily Mean Line
        const lineMean = d3.line<WeatherRecord>()
            .x(d => x(d.Date))
            .y(d => y1(d['Avg Temp (°F)']))
            .curve(d3.curveMonotoneX);

        g1.append("path")
            .datum(filteredData)
            .attr("fill", "none")
            .attr("stroke", "var(--text-secondary)")
            .attr("stroke-width", 1)
            .attr("opacity", 0.4)
            .attr("d", lineMean);

        // --- RANGE SLIDER (BRUSH) ---
        gSlider.append("text").attr("x", 0).attr("y", -5).text("Range Selector").style("fill", "var(--text-secondary)").style("font-size", "0.7rem").style("text-transform", "uppercase");

        // Mini background for slider
        const yMini = d3.scaleLinear().domain(y1.domain()).range([sliderHeight, 0]);
        const lineMini = d3.line<WeatherRecord>()
            .x(d => xFull(d.Date))
            .y(d => yMini(d['Avg Temp (°F)']));

        gSlider.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "var(--border-subtle)")
            .attr("stroke-width", 0.5)
            .attr("d", lineMini);

        const brush = d3.brushX()
            .extent([[0, 0], [width, sliderHeight]])
            .on("end", (event) => {
                if (!event.selection) return;
                const [x0, x1] = event.selection;
                setDateRange([xFull.invert(x0), xFull.invert(x1)]);
            });

        const gBrush = gSlider.append("g")
            .attr("class", "brush")
            .call(brush);

        // Set initial brush position
        gBrush.call(brush.move, [xFull(dateRange[0]), xFull(dateRange[1])]);

        // --- PLOT 2: SMA ---
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
            .datum(filteredData.filter(d => d.SMA7 !== undefined))
            .attr("fill", "none")
            .attr("stroke", "var(--trend-line)")
            .attr("stroke-width", 2)
            .attr("d", lineSMA);

        // --- PLOT 3: ROC ---
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
            .datum(filteredData.filter(d => d.ROC1y !== undefined))
            .attr("fill", "var(--ro-line)")
            .attr("opacity", 0.1)
            .attr("d", areaROC);

        const lineROC = d3.line<WeatherRecord>()
            .x(d => x(d.Date))
            .y(d => y3(d.ROC1y || 0))
            .curve(d3.curveMonotoneX);

        g3.append("path")
            .datum(filteredData.filter(d => d.ROC1y !== undefined))
            .attr("fill", "none")
            .attr("stroke", "var(--ro-line)")
            .attr("stroke-width", 1.5)
            .attr("d", lineROC);

        // --- CLIP PATH ---
        svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width)
            .attr("height", h1);

        // --- TOOLTIP ---
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
            .attr("y2", h1 + sliderHeight + h2 + h3 + verticalPadding * 2 + 30)
            .attr("stroke", "var(--text-secondary)")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4,4")
            .style("opacity", 0);

        const bisect = d3.bisector<WeatherRecord, Date>(d => d.Date).left;

        // Separate hover rects for each plot area to avoid blocking the brush
        [g1, g2, g3].forEach((layer, idx) => {
            const h = idx === 0 ? h1 : idx === 1 ? h2 : h3;
            layer.append("rect")
                .attr("width", width)
                .attr("height", h)
                .attr("fill", "none")
                .attr("pointer-events", "all")
                .on("mousemove", (event) => {
                    const mouseX = d3.pointer(event)[0];
                    const date = x.invert(mouseX);
                    const i = bisect(filteredData, date, 1);
                    const d = filteredData[i - 1];

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
        });

        return () => {
            tooltip.remove();
        };
    }, [data, dateRange]);

    return (
        <div className="overview-container">
            <div className="timeframe-buttons">
                {TIMEFRAMES.map(tf => (
                    <button
                        key={tf.label}
                        onClick={() => handleTimeframeClick(tf)}
                        className="time-btn glass-panel"
                    >
                        {tf.label}
                    </button>
                ))}
            </div>

            <div className="chart-container" style={{ width: '100%', minHeight: '1050px' }}>
                <svg ref={svgRef} style={{ width: '100%', height: '1150px' }}></svg>
            </div>

            <style jsx>{`
        .overview-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .timeframe-buttons {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .time-btn {
          background: var(--bg-component);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          padding: 6px 12px;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        .time-btn:hover {
          color: var(--accent-1);
          border-color: var(--accent-1);
          background: rgba(0, 210, 255, 0.1);
        }
        :global(.brush .selection) {
          fill: var(--accent-1);
          fill-opacity: 0.1;
          stroke: var(--accent-1);
          stroke-width: 1px;
        }
        :global(.brush .handle) {
          fill: var(--accent-1);
        }
      `}</style>
        </div>
    );
}
