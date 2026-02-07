"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as d3 from 'd3';
import { HelpCircle, X } from 'lucide-react';
import { WeatherRecord } from '@/types/weather';
import { getAvgTemp } from '@/utils/weatherAccessors';
import { useDimensions } from '@/hooks/useDimensions';

interface Props {
  data: WeatherRecord[];
}

export function ThermalTopo({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width: containerWidth } = useDimensions(containerRef);
  const [showInfo, setShowInfo] = React.useState(false);

  // Pivot data into a Year x DOY grid
  const grid = useMemo(() => {
    if (!data.length) return null;

    const years = Array.from(new Set(data.map(d => d.Year))).sort();
    const doys = Array.from({ length: 366 }, (_, i) => i + 1);

    const matrix = years.map(year => {
      const yearData = data.filter(d => d.Year === year);
      const doyMap = new Map(yearData.map(d => [d.DayOfYear, getAvgTemp(d)]));
      return doys.map(doy => doyMap.get(doy) || 0);
    });

    return { matrix, years, doys };
  }, [data]);

  useEffect(() => {
    if (!grid || !containerRef.current || !canvasRef.current || containerWidth === 0) return;

    const { matrix, years } = grid;
    const isMobile = window.innerWidth <= 768;
    const width = containerWidth;
    const height = isMobile ? 400 : 650;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
    const cameraPos = isMobile ? new THREE.Vector3(120, 120, 150) : new THREE.Vector3(80, 80, 100);
    camera.position.copy(cameraPos);
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

    const makeTextSprite = (message: string, parameters: { fontface?: string, fontsize?: number, color?: string } = {}) => {
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
      context.fillStyle = parameters.color || "rgba(255, 255, 255, 1.0)";
      context.fillText(message, 5, fontsize);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(textWidth / 15, fontsize / 15, 1);
      return sprite;
    };

    // Helper to add a tick mark
    const addTick = (x: number, y: number, z: number, axis: 'x' | 'y' | 'z') => {
      const size = 2;
      const tickGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(axis === 'x' ? 0 : size, axis === 'y' ? 0 : size, axis === 'z' ? 0 : size)
      ]);
      const tick = new THREE.Line(tickGeom, new THREE.LineBasicMaterial({ color: 0xaaaaaa, opacity: 0.5, transparent: true }));
      tick.position.set(x, y, z);
      scene.add(tick);
    }

    // --- X Axis: Day of Year (1-366 -> -60 to 60) ---
    const doyTicks = [1, 50, 100, 150, 200, 250, 300, 365];
    doyTicks.forEach(tick => {
      const xPos = ((tick - 1) / 365) * planeW - (planeW / 2);
      const label = makeTextSprite(tick.toString(), { fontsize: 32, color: "rgba(255,255,255,0.7)" });
      if (label) {
        label.position.set(xPos, -12, 45);
        scene.add(label);
      }
      addTick(xPos, -1, 40, 'z');
    });

    const labelDoy = makeTextSprite("Day of Year", { color: "#00d2ff" });
    if (labelDoy) {
      labelDoy.position.set(75, -12, 45);
      scene.add(labelDoy);
    }

    // --- Z Axis: Years (1974-2024 -> -40 to 40) ---
    const yearInterval = 10;
    for (let y = years[0]; y <= years[years.length - 1]; y += yearInterval) {
      const zPos = ((y - years[0]) / (years[years.length - 1] - years[0])) * planeH - (planeH / 2);
      const label = makeTextSprite(y.toString(), { fontsize: 32, color: "rgba(255,255,255,0.7)" });
      if (label) {
        label.position.set(-65, -12, zPos);
        scene.add(label);
      }
      addTick(-60, -1, zPos, 'x');
    }

    const labelYear = makeTextSprite("Archive Year", { color: "#00d2ff" });
    if (labelYear) {
      labelYear.position.set(-65, -12, -45);
      scene.add(labelYear);
    }

    // --- Y Axis: Temperatures (-10 to 95 -> -22 to 20) ---
    const tempTicks = [20, 60, 95];
    tempTicks.forEach(t => {
      const yPos = (t - 45) / 2.5;
      const label = makeTextSprite(`${t}°F`, { fontsize: 32, color: "rgba(255,255,255,0.7)" });
      if (label) {
        label.position.set(-65, yPos, 45);
        scene.add(label);
      }
      addTick(-60, yPos, 40, 'x');
    });

    const labelTemp = makeTextSprite("Temp (°F)", { color: "#00d2ff" });
    if (labelTemp) {
      labelTemp.position.set(-65, 25, 45);
      scene.add(labelTemp);
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

    return () => {
      cancelAnimationFrame(frameId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      controls.dispose();
    };
  }, [grid, containerWidth]);

  return (
    <div ref={containerRef} className="topo-container">
      <canvas ref={canvasRef} />
      <button
        className="info-toggle"
        onClick={() => setShowInfo(!showInfo)}
        aria-label="Toggle Info"
      >
        {showInfo ? <X size={20} /> : <HelpCircle size={20} />}
      </button>

      <div className={`topo-overlay glass-panel ${showInfo ? 'visible' : ''}`}>
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
          <div className="legend-ticks">
            <div className="tick"></div>
            <div className="tick"></div>
            <div className="tick"></div>
            <div className="tick"></div>
            <div className="tick"></div>
          </div>
          <div className="legend-labels">
            <span>-10°F</span>
            <span>20°F</span>
            <span>45°F</span>
            <span>70°F</span>
            <span>95°F</span>
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
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 280px;
          background: rgba(0,0,0,0.8);
          border: 1px solid var(--accent-1);
          box-shadow: 0 0 20px rgba(0, 210, 255, 0.2);
          transition: all 0.3s ease;
          z-index: 10;
        }

        .info-toggle {
          display: none;
          position: absolute;
          top: 10px;
          right: 10px;
          background: var(--bg-component);
          border: 1px solid var(--accent-1);
          color: var(--accent-1);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          z-index: 20;
          box-shadow: 0 0 10px rgba(0, 210, 255, 0.3);
        }

        @media (max-width: 768px) {
          .topo-container {
            height: 400px;
          }
          .topo-overlay {
            width: 180px;
            padding: 12px;
            top: 60px; /* Leave space for toggle button */
            left: 10px;
            gap: 8px;
            opacity: 0;
            transform: translateY(-10px);
            pointer-events: none;
          }
          .topo-overlay.visible {
            opacity: 1;
            transform: translateY(0);
            pointer-events: all;
          }
          .info-toggle {
            display: flex;
          }
          .overlay-header strong {
            font-size: 0.8rem;
          }
          .topo-stats, .topo-legend {
            display: none;
          }
        }

        .overlay-header {
          display: flex;
          flex-direction: column;
          border-left: 3px solid var(--accent-1);
          padding-left: 12px;
        }
        .overlay-header strong {
          color: var(--accent-1);
          text-transform: uppercase;
          font-weight: 900;
          font-size: 1.1rem;
          letter-spacing: 1px;
        }
        .overlay-header span {
            font-size: 0.75rem;
            color: var(--text-secondary);
            opacity: 0.8;
        }
        .topo-stats {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 4px;
        }
        .stat {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 0.8rem;
            color: var(--text-secondary);
            font-weight: 600;
        }
        .dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            box-shadow: 0 0 5px currentColor;
        }
        .dot.hot { background: #fee32d; color: #fee32d; }
        .dot.cold { background: #30123b; color: #30123b; }
        
        .topo-legend {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 8px;
        }
        .legend-bar {
          height: 10px;
          width: 100%;
          background: linear-gradient(to right, #30123b, #466be1, #2cb5e8, #1be5b0, #62fc6b, #a4fc3c, #d4e02a, #f6a928, #f46d1c, #d43d0b, #7a0403);
          border-radius: 1px;
        }
        .legend-ticks {
            display: flex;
            justify-content: space-between;
            height: 4px;
            padding: 0 2px;
        }
        .tick {
            width: 1px;
            height: 100%;
            background: var(--text-secondary);
            opacity: 0.4;
        }
        .legend-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.6rem;
          color: var(--text-secondary);
          font-family: monospace;
        }
      `}</style>
    </div>
  );
}
