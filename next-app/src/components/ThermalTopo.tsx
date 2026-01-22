"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import * as d3 from 'd3';
import { WeatherRecord } from '@/utils/weatherData';

interface Props {
    data: WeatherRecord[];
}

export function ThermalTopo({ data }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Pivot data into a Year x DOY grid
    const grid = useMemo(() => {
        if (!data.length) return null;

        const years = Array.from(new Set(data.map(d => d.Year))).sort();
        const doys = Array.from({ length: 366 }, (_, i) => i + 1);

        // Create a 2D array [yearIndex][doyIndex]
        const matrix = years.map(year => {
            const yearData = data.filter(d => d.Year === year);
            const doyMap = new Map(yearData.map(d => [d.DayOfYear, d['Avg Temp (°F)']]));
            return doys.map(doy => doyMap.get(doy) || 0);
        });

        return { matrix, years, doys };
    }, [data]);

    useEffect(() => {
        if (!grid || !containerRef.current || !canvasRef.current) return;

        const { matrix, years, doys } = grid;
        const width = containerRef.current.clientWidth;
        const height = 600;

        // --- Scene Setup ---
        const scene = new THREE.Scene();
        scene.background = null; // Transparent background

        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.set(0, -60, 60);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            antialias: true,
            alpha: true
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);

        // --- Geometry ---
        const rows = years.length;
        const cols = 366;
        const geometry = new THREE.PlaneGeometry(100, 100, cols - 1, rows - 1);

        // Rotate plane so it's horizontal
        geometry.rotateX(Math.PI / 2);

        // Update vertex heights based on temperature
        const vertices = geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const val = matrix[i][j];
                // Vertex index: (i * cols + j) * 3
                // Position on Y axis (height in our context after rotation)
                // Adjust scaling: temp - average, scaled
                vertices[(i * cols + j) * 3 + 1] = (val - 40) / 4;
            }
        }
        geometry.computeVertexNormals();

        // --- Material with Vertex Colors ---
        const colors = new Float32Array(geometry.attributes.position.count * 3);
        const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([-20, 100]);

        for (let i = 0; i < geometry.attributes.position.count; i++) {
            const yCoord = vertices[i * 3 + 1];
            const temp = yCoord * 4 + 40;
            const c = d3.color(colorScale(temp)) as d3.RGBColor;
            colors[i * 3] = c.r / 255;
            colors[i * 3 + 1] = c.g / 255;
            colors[i * 3 + 2] = c.b / 255;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.MeshPhongMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            shininess: 30,
            flatShading: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // --- Lights ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(50, 50, 50);
        scene.add(pointLight);

        // --- Rendering & Animation ---
        let frameId: number;
        const animate = () => {
            frameId = requestAnimationFrame(animate);
            mesh.rotation.y += 0.002; // Slow rotation
            renderer.render(scene, camera);
        };
        animate();

        // --- Cleanup ---
        return () => {
            cancelAnimationFrame(frameId);
            geometry.dispose();
            material.dispose();
            renderer.dispose();
        };
    }, [grid]);

    return (
        <div ref={containerRef} className="topo-container">
            <canvas ref={canvasRef} />
            <div className="topo-overlay">
                <p>DOY: 1 → 366 | Years: {grid?.years[0]} → {grid?.years[grid.years.length - 1]}</p>
                <p>Peaks: High Anomaly | Canyons: Cold Snaps</p>
            </div>

            <style jsx>{`
        .topo-container {
          width: 100%;
          height: 600px;
          position: relative;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          overflow: hidden;
        }
        canvas {
          width: 100% !important;
          height: 100% !important;
          cursor: grab;
        }
        .topo-overlay {
          position: absolute;
          bottom: 20px;
          left: 20px;
          pointer-events: none;
          color: var(--text-secondary);
          font-size: 0.75rem;
          background: rgba(0,0,0,0.5);
          padding: 8px 12px;
          border-radius: 4px;
        }
      `}</style>
        </div>
    );
}
