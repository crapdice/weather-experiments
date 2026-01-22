"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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
        scene.background = null;

        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.set(60, 60, 80);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            antialias: true,
            alpha: true
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);

        // --- Controls ---
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 30;
        controls.maxDistance = 200;
        controls.maxPolarAngle = Math.PI / 2.1; // Limit panning below ground

        // --- Geometry ---
        const rows = years.length;
        const cols = 366;
        const geometry = new THREE.PlaneGeometry(120, 80, cols - 1, rows - 1);
        geometry.rotateX(-Math.PI / 2);

        const vertices = geometry.attributes.position.array as Float32Array;
        const colors = new Float32Array(geometry.attributes.position.count * 3);
        const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([-10, 95]);

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const val = matrix[i][j];
                const vertexIdx = i * cols + j;

                // Set Y height based on temperature
                vertices[vertexIdx * 3 + 1] = (val - 45) / 3;

                // Set colors
                const c = d3.color(colorScale(val)) as d3.RGBColor;
                colors[vertexIdx * 3] = c.r / 255;
                colors[vertexIdx * 3 + 1] = c.g / 255;
                colors[vertexIdx * 3 + 2] = c.b / 255;
            }
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            shininess: 40,
            specular: 0x444444,
            flatShading: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // --- Grid / Axes Helper ---
        const axesHelper = new THREE.AxesHelper(60);
        // x: DOY, y: Temp, z: Year
        scene.add(axesHelper);

        // --- Lights ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(100, 100, 50);
        scene.add(dirLight);

        const fillLight = new THREE.PointLight(0xffffff, 0.4);
        fillLight.position.set(-100, 50, -50);
        scene.add(fillLight);

        // --- Rendering & Animation ---
        let frameId: number;
        const animate = () => {
            frameId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if (!containerRef.current) return;
            const w = containerRef.current.clientWidth;
            camera.aspect = w / height;
            camera.updateProjectionMatrix();
            renderer.setSize(w, height);
        };
        window.addEventListener('resize', handleResize);

        // --- Cleanup ---
        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', handleResize);
            geometry.dispose();
            material.dispose();
            renderer.dispose();
            controls.dispose();
        };
    }, [grid]);

    return (
        <div ref={containerRef} className="topo-container">
            <canvas ref={canvasRef} />
            <div className="topo-overlay glass-panel">
                <div className="overlay-header">
                    <strong>Chicago Thermal Topography</strong>
                    <span>1974 → {grid?.years[grid.years.length - 1]}</span>
                </div>
                <p>Dragging rotates. Scrolling zooms. Blue/Green valleys are cold snaps; Yellow peaks are heatwaves.</p>
                <div className="topo-legend">
                    <div className="legend-bar"></div>
                    <div className="legend-labels">
                        <span>-10°F</span>
                        <span>45°F</span>
                        <span>95°F</span>
                    </div>
                </div>
            </div>

            <style jsx>{`
        .topo-container {
          width: 100%;
          height: 600px;
          position: relative;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border-subtle);
        }
        canvas {
          width: 100% !important;
          height: 100% !important;
          cursor: crosshair;
        }
        .topo-overlay {
          position: absolute;
          top: 20px;
          left: 20px;
          pointer-events: none;
          color: var(--text-primary);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 320px;
        }
        .overlay-header {
          display: flex;
          flex-direction: column;
          gap: 2px;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 8px;
        }
        .overlay-header strong {
          color: var(--accent-1);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .topo-overlay p {
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.4;
          margin: 0;
        }
        .topo-legend {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .legend-bar {
          height: 10px;
          width: 100%;
          background: linear-gradient(to right, #440154, #21918c, #fde725);
          border-radius: 2px;
        }
        .legend-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.65rem;
          color: var(--text-secondary);
        }
      `}</style>
        </div>
    );
}
