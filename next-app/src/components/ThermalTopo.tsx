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
    const height = 650;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
    camera.position.set(80, 80, 100);
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
    controls.minDistance = 50;
    controls.maxDistance = 500;

    // --- Geometry ---
    const rows = years.length;
    const cols = 366;
    const planeW = 120;
    const planeH = 80;
    const geometry = new THREE.PlaneGeometry(planeW, planeH, cols - 1, rows - 1);
    geometry.rotateX(-Math.PI / 2);

    const vertices = geometry.attributes.position.array as Float32Array;
    const colors = new Float32Array(geometry.attributes.position.count * 3);

    // Higher contrast palette
    const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain([-10, 95]);

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const val = matrix[i][j];
        const vertexIdx = i * cols + j;
        vertices[vertexIdx * 3 + 1] = (val - 45) / 2.5; // Slightly taller

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
      shininess: 50,
      specular: 0x666666,
      flatShading: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // --- Axis Helpers & Labels ---
    const axesHelper = new THREE.AxesHelper(70);
    scene.add(axesHelper);

    const makeTextSprite = (message: string, parameters: any = {}) => {
      const fontface = parameters.fontface || "Arial";
      const fontsize = parameters.fontsize || 48;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.font = "Bold " + fontsize + "px " + fontface;
      const metrics = context.measureText(message);
      const textWidth = metrics.width;

      canvas.width = textWidth + 10;
      canvas.height = fontsize + 10;
      context.font = "Bold " + fontsize + "px " + fontface;
      context.fillStyle = "rgba(255, 255, 255, 1.0)";
      context.fillText(message, 5, fontsize);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(textWidth / 10, fontsize / 10, 1);
      return sprite;
    };

    const labelTemp = makeTextSprite("Temp (°F)");
    if (labelTemp) {
      labelTemp.position.set(-10, 40, 0);
      scene.add(labelTemp);
    }

    const labelDoy = makeTextSprite("Day of Year (1-366)");
    if (labelDoy) {
      labelDoy.position.set(60, -10, 0);
      scene.add(labelDoy);
    }

    const labelYear = makeTextSprite("Year (1974-2024)");
    if (labelYear) {
      labelYear.position.set(0, -10, 40);
      scene.add(labelYear);
    }

    // --- Lights ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pointLight = new THREE.PointLight(0xffffff, 1.2);
    pointLight.position.set(100, 200, 100);
    scene.add(pointLight);

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
          <strong>Chicago Thermal Landscape</strong>
          <span>Physical Anomaly Surface</span>
        </div>
        <div className="topo-stats">
          <div className="stat">
            <span className="dot hot"></span>
            <span>Peak: Heatwave</span>
          </div>
          <div className="stat">
            <span className="dot cold"></span>
            <span>Canyon: Cold Snap</span>
          </div>
        </div>
        <div className="topo-legend">
          <div className="legend-bar"></div>
          <div className="legend-labels">
            <span>-20°F</span>
            <span>40°F</span>
            <span>100°F</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .topo-container {
          width: 100%;
          height: 650px;
          position: relative;
          background: rgba(0, 0, 0, 0.5);
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
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 280px;
          background: rgba(0,0,0,0.6);
        }
        .overlay-header {
          display: flex;
          flex-direction: column;
        }
        .overlay-header strong {
          color: var(--accent-1);
          text-transform: uppercase;
          font-weight: 900;
          letter-spacing: 1px;
        }
        .overlay-header span {
            font-size: 0.7rem;
            color: var(--text-secondary);
        }
        .topo-stats {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .stat {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.75rem;
            color: var(--text-secondary);
        }
        .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }
        .dot.hot { background: #fde725; }
        .dot.cold { background: #440154; }
        
        .topo-legend {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .legend-bar {
          height: 12px;
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
