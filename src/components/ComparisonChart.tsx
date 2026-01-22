"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { WeatherRecord } from '@/utils/weatherData';

interface Props {
  data: WeatherRecord[];
}

export function ComparisonChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const years = Array.from(new Set(data.map(d => d.Year))).sort((a, b) => b - a);

  const [year1, setYear1] = useState(years[0]);
  const [year2, setYear2] = useState(years[Math.min(years.length - 1, 10)]);
  const [widthState, setWidthState] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) setWidthState(svgRef.current.clientWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const data1 = data.filter(d => d.Year === year1);
    const data2 = data.filter(d => d.Year === year2);

    // Scales
    const x = d3.scaleLinear().domain([1, 366]).range([0, width]);
    const y = d3.scaleLinear()
      .domain([
        d3.min([...data1, ...data2], d => d['Avg Temp (°F)'])! - 5,
        d3.max([...data1, ...data2], d => d['Avg Temp (°F)'])! + 5
      ])
      .range([height, 0]);

    // Axes
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const xAxis = d3.axisBottom(x)
      .tickValues([1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335])
      .tickFormat((d, i) => monthNames[i]);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .attr("color", "var(--text-secondary)");

    g.append("g")
      .call(d3.axisLeft(y))
      .attr("color", "var(--text-secondary)");

    // Lines
    const line = d3.line<WeatherRecord>()
      .x(d => x(d.DayOfYear))
      .y(d => y(d['Avg Temp (°F)']))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data2)
      .attr("fill", "none")
      .attr("stroke", "var(--accent-1)")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .attr("opacity", 0.5)
      .attr("d", line);

    g.append("path")
      .datum(data1)
      .attr("fill", "none")
      .attr("stroke", "var(--accent-2)")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Legend
    const legend = g.append("g")
      .attr("transform", `translate(${width - 100}, 0)`);

    legend.append("line").attr("x1", 0).attr("x2", 20).attr("y1", 0).attr("y2", 0).attr("stroke", "var(--accent-2)").attr("stroke-width", 2);
    legend.append("text").attr("x", 25).attr("y", 5).text(year1).style("font-size", "12px").attr("fill", "var(--text-primary)");

    legend.append("line").attr("x1", 0).attr("x2", 20).attr("y1", 20).attr("y2", 20).attr("stroke", "var(--accent-1)").attr("stroke-width", 2).attr("stroke-dasharray", "3,3");
    legend.append("text").attr("x", 25).attr("y", 25).text(year2).style("font-size", "12px").attr("fill", "var(--text-primary)");

  }, [data, year1, year2, widthState]);

  return (
    <div className="comparison-container">
      <div className="controls">
        <div className="control-group">
          <label>Primary Year</label>
          <select value={year1} onChange={(e) => setYear1(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="control-group">
          <label>Base Year</label>
          <select value={year2} onChange={(e) => setYear2(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <svg ref={svgRef} style={{ width: '100%', height: '500px' }}></svg>

      <style jsx>{`
        .comparison-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .controls {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        @media (max-width: 768px) {
          .controls {
            gap: 12px;
          }
          .control-group {
            flex: 1;
            min-width: 120px;
          }
          select {
            width: 100%;
            padding: 10px;
          }
        }
        .control-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        label {
          font-size: 0.75rem;
          color: var(--accent-1);
          text-transform: uppercase;
          font-weight: 800;
        }
        select {
          background: var(--bg-component);
          color: var(--text-primary);
          border: 1px solid var(--border-subtle);
          padding: 8px 12px;
          border-radius: 4px;
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}
